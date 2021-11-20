const { get } = require('lodash');
const DataService = require('./DataService');
const { map, ensureArray, keyPaths, mapPromise, toGUID, hashObject } = require('../service/app.service');

module.exports = class ResultSet {
  constructor(query, data, adjustForPagination = true) {
    const { resolver, model, sort, first, after, last, before } = query.toObject();
    const fields = model.getFields().filter(f => f.getName() !== 'id');

    const rs = map(data, (doc) => {
      if (doc == null || typeof doc !== 'object') return doc;

      const cache = new Map();

      const validKeys = [];

      const definition = {
        get id() { return doc.id || doc[model.idKey()]; },
        get $id() { return toGUID(model.getName(), this.id); },
        get $$data() { return data; },
        get $$model() { return model; },
        get $$isResultSetItem() { return true; },
        get $$save() { return input => resolver.match(model).id(this.id).save({ ...this, ...input }); },
        get $$remove() { return () => resolver.match(model).id(this.id).remove(); },
        get $$delete() { return () => resolver.match(model).id(this.id).delete(); },
        get $$cursor() {
          return () => {
            const sortPaths = keyPaths(sort);
            const sortValues = sortPaths.reduce((prv, path) => Object.assign(prv, { [path]: get(this, path) }), {});
            const sortJSON = JSON.stringify(sortValues);
            return Buffer.from(sortJSON).toString('base64');
          };
        },
        get toObject() {
          return () => validKeys.reduce((prev, key) => Object.assign(prev, { [key]: this[key] }), {});
        },
      };

      fields.forEach((field) => {
        const key = field.getKey();
        const name = field.getName();
        const $name = `$${name}`;
        const value = doc[key];
        validKeys.push(name);

        // Field attributes
        Object.assign(definition, {
          get [name]() {
            let $value = field.deserialize(query, value);
            $value = $value != null && field.isEmbedded() ? new ResultSet(query.model(field.getModelRef()), $value, false) : $value;
            return $value;
          },
        });

        // Hydrated field attributes
        Object.assign(definition, {
          get [$name]() {
            return (args = {}) => {
              // Ensure where clause
              args.where = args.where || {};

              return new Promise((resolve, reject) => {
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
            };
          },
        });

        // Field count (let's assume it's a Connection Type - meaning dont try with anything else)
        Object.assign(definition, {
          get [`${$name}:count`]() {
            return (q = {}) => {
              q.where = q.where || {};
              if (field.isVirtual()) q.where[field.getVirtualField()] = this.id;
              else q.where.id = this[name];
              return resolver.match(field.getModelRef()).merge(q).count();
            };
          },
        });
      });

      // Create and return ResultSetItem
      const idk = new Proxy(definition, {
        get(target, prop, rec) {
          if (cache.has(prop)) return cache.get(prop);
          const value = Reflect.get(target, prop, rec);
          if (typeof value === 'function') return value.bind(target);
          cache.set(prop, value);
          return value;
        },
        set(target, prop, value) {
          cache.set(prop, value);
          return true;
        },
        ownKeys() {
          return validKeys;
        },
        getOwnPropertyDescriptor(target, prop) {
          if (validKeys.indexOf(prop) === -1) {
            return {
              writable: true,
              enumerable: true,
              configurable: true,
            };
          }

          return {
            writable: false,
            enumerable: false,
            configurable: false,
          };
        },
      });

      // console.log(idk);
      // // console.log(idk.toObject());
      return idk;
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
  }
};
