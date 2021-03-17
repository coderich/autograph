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
          const name = field.getName();

          prev.id = {
            get() { return doc[model.idKey()]; },
            enumerable: true,
          };

          prev.$id = {
            get() { return toGUID(model.getName(), this.id); },
            enumerable: false,
          };

          prev[name] = {
            get() {
              const key = field.getKey();
              const value = field.deserialize(doc[key]);
              return field.isEmbedded() ? new ResultSet(query.model(field.getModelRef()), value) : value;
            },
            enumerable: true,
          };

          prev[`$${name}`] = {
            get() {
              //
              const key = field.getKey();
              const $name = `$${name}`;

              if (cache.has($name)) return cache.get($name);

              const promise = new Promise((resolve, reject) => {
                (() => {
                  const value = doc[key];

                  if (field.isScalar() || field.isEmbedded()) return Promise.resolve(field.deserialize(value));

                  const fieldModel = field.getModelRef();

                  if (field.isArray()) {
                    if (field.isVirtual()) {
                      const where = { [field.getVirtualField()]: this.id };
                      return resolver.match(fieldModel).where(where).many();
                    }

                    // Not a "required" query + strip out nulls
                    return resolver.match(fieldModel).where({ id: value }).many();
                  }

                  if (field.isVirtual()) {
                    const where = { [field.getVirtualField()]: this.id };
                    return resolver.match(fieldModel).where(where).one();
                  }

                  return resolver.match(fieldModel).id(value).one({ required: field.isRequired() });
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

          prev.$$cursor = {
            get() {
              const sortPaths = keyPaths(sort);
              const sortValues = sortPaths.reduce((prv, path) => Object.assign(prv, { [path]: get(doc, path) }), {});
              const sortJSON = JSON.stringify(sortValues);
              const cursor = Buffer.from(sortJSON).toString('base64');
              return cursor;
            },
            enumerable: false,
          };

          return prev;
        }, {}),
      );
    });
  }
};
