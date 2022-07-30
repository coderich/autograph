const { get } = require('lodash');
const DataService = require('./DataService');
const { map, ensureArray, keyPaths, mapPromise, toGUID, hashObject } = require('../service/app.service');

module.exports = class ResultSet {
  constructor(query, data, adjustForPagination = true) {
    if (data == null) return data;
    const { resolver, model, sort, first, after, last, before } = query.toObject();
    const fields = model.getFields().filter(f => f.getName() !== 'id');

    const rs = map(data, (doc) => {
      if (doc == null || typeof doc !== 'object') return doc;

      //
      const cache = new Map();

      const definition = {
        // $$model: model,
        $$isResultSetItem: true,

        get id() { return doc.id || doc[model.idKey()]; },
        set id(id) { doc.id = id; }, // Embedded array of documents need to set id
        get $id() { return toGUID(model.getName(), this.id); },

        get $$cursor() {
          const sortPaths = keyPaths(sort);
          const sortValues = sortPaths.reduce((prv, path) => Object.assign(prv, { [path]: get(this, path) }), {});
          const sortJSON = JSON.stringify(sortValues);
          return Buffer.from(sortJSON).toString('base64');
        },

        $$save: input => resolver.match(model).id(this.id).save({ ...this, ...input }),
        $$remove: () => resolver.match(model).id(this.id).remove(),
        $$delete: () => resolver.match(model).id(this.id).delete(),

        get toObject() {
          return () => map(this, obj => Object.entries(obj).reduce((prev, [key, value]) => {
            if (value === undefined) return prev;
            prev[key] = get(value, '$$isResultSet') ? value.toObject() : value;
            return prev;
          }, {}));
        },

        ...fields.reduce((prev, field) => {
          const key = field.getKey();
          const name = field.getName();
          const $name = `$${name}`;
          const value = doc[key];

          return {
            ...prev,

            // Deserialized field attributes
            get [name]() {
              if (cache.has(name)) return cache.get(name);
              let $value = field.deserialize(query, value);
              $value = $value != null && field.isEmbedded() ? new ResultSet(query.model(field.getModelRef()), $value, false) : $value;
              cache.set(name, $value);
              return $value;
            },
            set [name]($value) {
              cache.set(name, $value);
            },

            // Fully deserialized, hydrated, and resolved field attributes
            get [$name]() {
              return (args = {}) => {
                // Ensure where clause
                args.where = args.where || {};

                // Cache
                const cacheKey = `${$name}-${hashObject(args)}`;
                if (cache.has(cacheKey)) return cache.get(cacheKey);

                const promise = new Promise((resolve, reject) => {
                  (() => {
                    const $value = this[name];

                    if (field.isScalar() || field.isEmbedded()) return Promise.resolve($value);

                    const modelRef = field.getModelRef();

                    if (field.isArray()) {
                      if (field.isVirtual()) {
                        args.where[[field.getVirtualField()]] = this.id; // Is where[[field.getVirtualField()]] correct?
                        return resolver.match(modelRef).merge(args).many();
                      }

                      // Not a "required" query + strip out nulls
                      args.where.id = $value;
                      return resolver.match(modelRef).merge(args).many();
                    }

                    if (field.isVirtual()) {
                      args.where[[field.getVirtualField()]] = this.id;
                      return resolver.match(modelRef).merge(args).one();
                    }

                    return resolver.match(modelRef).id($value).one({ required: field.isRequired() });
                  })().then((results) => {
                    if (results == null) return field.resolve(query, results); // Allow field to determine
                    return mapPromise(results, result => field.resolve(query, result)).then(() => results); // Resolve the inside fields but still return "results"!!!!
                  }).then((resolved) => {
                    resolve(resolved);
                  }).catch((e) => {
                    reject(e);
                  });
                });

                cache.set(cacheKey, promise);
                return promise;
              };
            },

            // Field count (let's assume it's a Connection Type - meaning dont try with anything else)
            get [`${$name}:count`]() {
              return (q = {}) => {
                q.where = q.where || {};
                if (field.isVirtual()) q.where[field.getVirtualField()] = this.id;
                else q.where.id = this[name];
                return resolver.match(field.getModelRef()).merge(q).count();
              };
            },
          };
        }, {}),
      };

      // const definition = fields.reduce((prev, field) => {
      //   const key = field.getKey();
      //   const name = field.getName();
      //   const $name = `$${name}`;
      //   const value = doc[key];

      //   return {
      //     ...prev,

      //     // Deserialized field attributes
      //     get [name]() {
      //       if (cache.has(name)) return cache.get(name);
      //       let $value = field.deserialize(query, value);
      //       $value = $value != null && field.isEmbedded() ? new ResultSet(query.model(field.getModelRef()), $value, false) : $value;
      //       cache.set(name, $value);
      //       return $value;
      //     },
      //     set [name]($value) {
      //       cache.set(name, $value);
      //     },

      //     // Fully deserialized, hydrated, and resolved field attributes
      //     get [$name]() {
      //       return (args = {}) => {
      //         // Ensure where clause
      //         args.where = args.where || {};

      //         // Cache
      //         const cacheKey = `${$name}-${hashObject(args)}`;
      //         if (cache.has(cacheKey)) return cache.get(cacheKey);

      //         const promise = new Promise((resolve, reject) => {
      //           (() => {
      //             const $value = this[name];

      //             if (field.isScalar() || field.isEmbedded()) return Promise.resolve($value);

      //             const modelRef = field.getModelRef();

      //             if (field.isArray()) {
      //               if (field.isVirtual()) {
      //                 args.where[[field.getVirtualField()]] = this.id; // Is where[[field.getVirtualField()]] correct?
      //                 return resolver.match(modelRef).merge(args).many();
      //               }

      //               // Not a "required" query + strip out nulls
      //               args.where.id = $value;
      //               return resolver.match(modelRef).merge(args).many();
      //             }

      //             if (field.isVirtual()) {
      //               args.where[[field.getVirtualField()]] = this.id;
      //               return resolver.match(modelRef).merge(args).one();
      //             }

      //             return resolver.match(modelRef).id($value).one({ required: field.isRequired() });
      //           })().then((results) => {
      //             if (results == null) return field.resolve(query, results); // Allow field to determine
      //             return mapPromise(results, result => field.resolve(query, result)).then(() => results); // Resolve the inside fields but still return "results"!!!!
      //           }).then((resolved) => {
      //             resolve(resolved);
      //           }).catch((e) => {
      //             reject(e);
      //           });
      //         });

      //         cache.set(cacheKey, promise);
      //         return promise;
      //       };
      //     },

      //     // Field count (let's assume it's a Connection Type - meaning dont try with anything else)
      //     get [`${$name}:count`]() {
      //       return (q = {}) => {
      //         q.where = q.where || {};
      //         if (field.isVirtual()) q.where[field.getVirtualField()] = this.id;
      //         else q.where.id = this[name];
      //         return resolver.match(field.getModelRef()).merge(q).count();
      //       };
      //     },
      //   };
      // }, {
      //   get id() { return doc.id || doc[model.idKey()]; },
      //   set id(id) { doc.id = id; }, // Embedded array of documents need to set id

      //   get $id() { return toGUID(model.getName(), this.id); },

      //   get $$cursor() {
      //     const sortPaths = keyPaths(sort);
      //     const sortValues = sortPaths.reduce((prv, path) => Object.assign(prv, { [path]: get(this, path) }), {});
      //     const sortJSON = JSON.stringify(sortValues);
      //     return Buffer.from(sortJSON).toString('base64');
      //   },

      //   $$model: model,
      //   $$isResultSetItem: true,
      //   $$save: input => resolver.match(model).id(this.id).save({ ...this, ...input }),
      //   $$remove: () => resolver.match(model).id(this.id).remove(),
      //   $$delete: () => resolver.match(model).id(this.id).delete(),

      //   get toObject() {
      //     return () => map(this, obj => Object.entries(obj).reduce((prev, [key, value]) => {
      //       if (value === undefined) return prev;
      //       prev[key] = get(value, '$$isResultSet') ? value.toObject() : value;
      //       return prev;
      //     }, {}));
      //   },
      // });

      return definition;
    });

    let hasNextPage = false;
    let hasPreviousPage = false;
    if (adjustForPagination && rs.length) (({ hasPreviousPage, hasNextPage } = DataService.paginateResultSet(rs, first, after, last, before)));

    return Object.defineProperties(rs, {
      $$pageInfo: {
        get() {
          const edges = ensureArray(rs);

          return {
            startCursor: get(edges, '0.$$cursor', ''),
            endCursor: get(edges, `${edges.length - 1}.$$cursor`, ''),
            hasPreviousPage,
            hasNextPage,
          };
        },
        enumerable: false,
      },
      $$isResultSet: {
        value: true,
        enumerable: false,
      },
      toObject: {
        get() {
          return () => map(this, doc => Object.entries(doc).reduce((prev, [key, value]) => {
            if (value === undefined) return prev;
            prev[key] = get(value, '$$isResultSet') ? value.toObject() : value;
            return prev;
          }, {}));
        },
        enumerable: false,
        configurable: true,
      },
    });

    // const idk = {
    //   ...rs,
    //   $$isResultSet: true,
    //   get $$pageInfo() {
    //     const edges = ensureArray(rs);

    //     return {
    //       startCursor: get(edges, '0.$$cursor', ''),
    //       endCursor: get(edges, `${edges.length - 1}.$$cursor`, ''),
    //       hasPreviousPage,
    //       hasNextPage,
    //     };
    //   },
    //   get toObject() {
    //     return () => map(this, doc => Object.entries(doc).reduce((prev, [key, value]) => {
    //       if (value === undefined) return prev;
    //       prev[key] = get(value, '$$isResultSet') ? value.toObject() : value;
    //       return prev;
    //     }, {}));
    //   },
    // };

    // return idk;
  }
};
