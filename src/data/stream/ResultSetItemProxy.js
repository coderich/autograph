const { get } = require('lodash');
const ResultSet = require('./ResultSet');
const { map, keyPaths, mapPromise, toGUID, hashObject } = require('../../service/app.service');

module.exports = class ResultSetItem {
  constructor(query, doc) {
    if (doc == null) return doc;

    const cache = new Map();
    const { resolver, model, sort } = query.toObject();
    const fields = model.getFields().filter(f => f.getName() !== 'id');

    const proxy = new Proxy(doc, {
      get(target, prop, rec) {
        const value = Reflect.get(target, prop, rec);
        if (typeof value === 'function') return value.bind(target);

        if (cache.has(prop)) return cache.get(prop);

        const field = fields.find(f => `${f}` === prop);

        if (field) {
          let $value = field.deserialize(query, value);

          if ($value != null && field.isEmbedded()) {
            const newQuery = query.model(field.getModelRef());
            $value = new ResultSet(newQuery, map($value, v => new ResultSetItem(newQuery, v)), false);
          }

          cache.set(prop, $value);
          return $value;
        }

        return value;
      },
      set(target, prop, value, receiver) {
        cache.set(prop, value);
        return Reflect.set(target, prop, value);
      },
      deleteProperty(target, prop) {
        cache.delete(prop);
        return Reflect.delete(target, prop);
      },
    });

    const definition = fields.reduce((prev, field) => {
      const name = field.getName();
      const $name = `$${name}`;

      // Hydrated field attributes
      prev[`$${name}`] = {
        get() {
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
        enumerable: false,
      };

      // Field count (let's assume it's a Connection Type - meaning dont try with anything else)
      prev[`$${name}:count`] = {
        get() {
          return (q = {}) => {
            q.where = q.where || {};
            if (field.isVirtual()) q.where[field.getVirtualField()] = this.id;
            else q.where.id = this[name];
            return resolver.match(field.getModelRef()).merge(q).count();
          };
        },
        enumerable: false,
      };

      return prev;
    }, {
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

      $$model: {
        value: model,
        enumerable: false,
      },

      $$isResultSetItem: {
        value: true,
        enumerable: false,
      },

      $$save: {
        get() { return input => resolver.match(model).id(this.id).save({ ...this, ...input }); },
        enumerable: false,
      },

      $$remove: {
        get() { return () => resolver.match(model).id(this.id).remove(); },
        enumerable: false,
      },

      $$delete: {
        get() { return () => resolver.match(model).id(this.id).delete(); },
        enumerable: false,
      },
    });

    return Object.defineProperties(proxy, definition);
  }
};
