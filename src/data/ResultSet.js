const { get } = require('lodash');
const DataService = require('./DataService');
const { map, ensureArray, keyPaths, mapPromise, toGUID } = require('../service/app.service');

module.exports = class ResultSet {
  constructor(query, data, adjustForPagination = true) {
    const { resolver, model, sort, first, after, last, before } = query.toObject();
    const fields = model.getFields().filter(f => f.getName() !== 'id');

    const rs = map(data, (doc) => {
      if (doc == null || typeof doc !== 'object') return doc;

      //
      const cache = new Map();

      // Create and return ResultSetItem
      return Object.defineProperties(
        {},

        fields.reduce((prev, field) => {
          const key = field.getKey();
          const name = field.getName();
          const $name = `$${name}`;
          const value = doc[key];

          // Field attributes
          prev[name] = {
            get() {
              if (cache.has(name)) return cache.get(name);
              let $value = field.deserialize(query, value);
              $value = $value != null && field.isEmbedded() ? new ResultSet(query.model(field.getModelRef()), $value, false) : $value;
              cache.set(name, $value);
              return $value;
            },
            set($value) {
              cache.set(name, $value);
            },
            enumerable: true,
          };

          // Hydrated field attributes
          prev[`$${name}`] = {
            get() {
              return (args = {}) => {
                // Ensure where clause
                args.where = args.where || {};

                //
                // if (cache.has($name)) return cache.get($name);

                const promise = new Promise((resolve, reject) => {
                  (() => {
                    const $value = this[name];

                    if (field.isScalar() || field.isEmbedded()) return Promise.resolve($value);

                    if (field.isArray()) {
                      if (field.isVirtual()) {
                        args.where[[field.getVirtualField()]] = this.id;
                        return resolver.match(field.getModelRef()).merge(args).many();
                      }

                      // Not a "required" query + strip out nulls
                      args.where.id = $value;
                      return resolver.match(field.getModelRef()).merge(args).many();
                    }

                    if (field.isVirtual()) {
                      args.where[[field.getVirtualField()]] = this.id;
                      return resolver.match(field.getModelRef()).merge(args).one();
                    }

                    return resolver.match(field.getModelRef()).id($value).one({ required: field.isRequired() });
                  })().then((results) => {
                    if (results == null) return field.resolve(query, results); // Allow field to determine
                    return mapPromise(results, result => field.resolve(query, result)).then(() => results); // Resolve the inside fields but still return "results"!!!!
                  }).then((resolved) => {
                    resolve(resolved);
                  }).catch((e) => {
                    reject(e);
                  });
                });

                cache.set($name, promise);
                return promise;
              };
            },
            enumerable: false,
          };

          // Field count (let's assume it's a Connection Type - meaning dont try with anything else)
          prev[`$${name}:count`] = {
            get() {
              return ({ where = {} }) => { // Counts only care about the where clause
                if (field.isVirtual()) {
                  where[field.getVirtualField()] = this.id;
                  return resolver.match(field.getModelRef()).where(where).count();
                }

                where.id = this[name];
                return resolver.match(field.getModelRef()).where(where).count();
              };
            },
            enumerable: false,
          };

          return prev;
        }, {
          id: {
            get() { return doc.id || doc[model.idKey()]; },
            enumerable: true,
          },

          $id: {
            get() { return toGUID(model.getName(), this.id); },
            enumerable: false,
          },

          $$cursor: {
            get() {
              const sortPaths = keyPaths(sort);
              const sortValues = sortPaths.reduce((prv, path) => Object.assign(prv, { [path]: get(this, path) }), {});
              const sortJSON = JSON.stringify(sortValues);
              return Buffer.from(sortJSON).toString('base64');
            },
            enumerable: false,
          },

          $$data: {
            value: data,
            enumerable: false,
          },

          $$isResultSetItem: {
            value: true,
            enumerable: false,
          },

          toObject: {
            get() {
              return () => map(this, obj => Object.entries(obj).reduce((prev, [key, value]) => {
                if (value === undefined) return prev;
                prev[key] = value.$$isResultSet ? value.toObject() : value;
                return prev;
              }, {}));
            },
            enumerable: false,
            configurable: true,
          },
        }),
      );
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
            prev[key] = value.$$isResultSet ? value.toObject() : value;
            return prev;
          }, {}));
        },
        enumerable: false,
        configurable: true,
      },
    });
  }
};
