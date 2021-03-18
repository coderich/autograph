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
          const [name, key, modelRef, isEmbedded, isVirtual, hasResolver] = [field.getName(), field.getKey(), field.getModelRef(), field.isEmbedded(), field.isVirtual(), field.hasResolver()];
          const value = field.deserialize(doc[key]);

          if (value !== undefined) {
            prev[name] = {
              value: isEmbedded ? new ResultSet(query.model(modelRef), value) : value,
              writable: true,
              enumerable: true,
            };
          }

          if (value !== undefined || isVirtual || hasResolver) {
            prev[`$${name}`] = {
              get() {
                //
                const $name = `$${name}`;
                if (cache.has($name)) return cache.get($name);

                const promise = new Promise((resolve, reject) => {
                  (() => {
                    if (field.isScalar()) return Promise.resolve(value);

                    if (isEmbedded) return Promise.resolve(value == null ? value : new ResultSet(query.model(modelRef), value));

                    if (field.isArray()) {
                      if (field.isVirtual()) {
                        const where = { [field.getVirtualField()]: this.id };
                        return resolver.match(modelRef).where(where).many();
                      }

                      // Not a "required" query + strip out nulls
                      return resolver.match(modelRef).where({ id: value }).many();
                    }

                    if (field.isVirtual()) {
                      const where = { [field.getVirtualField()]: this.id };
                      return resolver.match(modelRef).where(where).one();
                    }

                    return resolver.match(modelRef).id(value).one({ required: field.isRequired() });
                  })().then((results) => {
                    if (results == null) return field.resolve(results); // Allow field to determine
                    return mapPromise(results, result => field.resolve(result));
                  }).then((resolved) => {
                    resolve(resolved == null ? resolved : field.cast(resolved));
                  }).catch((e) => {
                    reject(e);
                  });
                });

                cache.set($name, promise);
                return promise;
              },
              enumerable: false,
            };
          }

          return prev;
        }, {
          id: {
            value: doc.id || doc[model.idKey()],
            writable: true,
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
        }),
      );
    });
  }
};
