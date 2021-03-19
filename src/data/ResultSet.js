const { get } = require('lodash');
const { map, mapPromise, keyPaths, toGUID } = require('../service/app.service');

module.exports = class ResultSet {
  constructor(query, data) {
    const { resolver, model, sort } = query.toObject();

    return map(data, (doc) => {
      if (doc == null || typeof doc !== 'object') return doc;

      return Object.defineProperties(
        {},

        model.getFields().filter(f => f.getName() !== 'id').reduce((prev, field) => {
          const cache = new Map();
          const key = field.getKey();
          const name = field.getName();
          const $name = `$${name}`;
          const value = doc[key];

          prev[name] = {
            get() {
              if (cache.has(name)) return cache.get(name);
              let $value = field.normalize(value);
              $value = $value != null && field.isEmbedded() ? new ResultSet(query.model(field.getModelRef()), $value) : $value;
              cache.set(name, $value);
              return $value;
            },
            set($value) {
              cache.set(name, $value);
            },
            enumerable: true,
          };

          prev[`$${name}`] = {
            get() {
              //
              if (cache.has($name)) return cache.get($name);

              const $value = this[name];

              const promise = new Promise((resolve, reject) => {
                (() => {
                  if (field.isScalar() || field.isEmbedded()) return Promise.resolve($value);

                  // if (field.isEmbedded()) return Promise.resolve($value == null ? $value : new ResultSet(query.model(field.getModelRef()), $value));

                  if (field.isArray()) {
                    if (field.isVirtual()) {
                      const where = { [field.getVirtualField()]: this.id };
                      return resolver.match(field.getModelRef()).where(where).many();
                    }

                    // Not a "required" query + strip out nulls
                    return resolver.match(field.getModelRef()).where({ id: $value }).many();
                  }

                  if (field.isVirtual()) {
                    const where = { [field.getVirtualField()]: this.id };
                    return resolver.match(field.getModelRef()).where(where).one();
                  }

                  return resolver.match(field.getModelRef()).id($value).one({ required: field.isRequired() });
                })().then((results) => {
                  if (results == null) return field.resolve(results); // Allow field to determine
                  return mapPromise(results, result => field.resolve(result));
                }).then((resolved) => {
                  resolve(resolved);
                }).catch((e) => {
                  reject(e);
                });
              });

              cache.set($name, promise);
              return promise;
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
              const sortValues = sortPaths.reduce((prv, path) => Object.assign(prv, { [path]: get(doc, path) }), {});
              const sortJSON = JSON.stringify(sortValues);
              const cursor = Buffer.from(sortJSON).toString('base64');
              return cursor;
            },
            enumerable: false,
          },

          $$data: {
            get() { return data; },
            enumerable: false,
          },
        }),
      );
    });
  }
};
