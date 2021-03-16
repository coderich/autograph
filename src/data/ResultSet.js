const { get } = require('lodash');
const { map, mapPromise, keyPaths, ensureArray, toGUID } = require('../service/app.service');

module.exports = class ResultSet {
  constructor(query, data) {
    const { resolver, model, sort } = query.toObject();

    return map(data, (doc) => {
      if (doc == null || typeof doc !== 'object') return doc;

      return Object.defineProperties(
        {},

        model.getFields().filter(field => field.getName() !== 'id').reduce((prev, field) => {
          const name = field.getName();

          prev.id = {
            get() { return model.idValue(doc[model.idKey()]); },
            enumerable: true,
          };

          prev.$id = {
            get() { return toGUID(model.getName(), this.id); },
            enumerable: false,
          };

          prev[name] = {
            get() {
              const value = field.deserialize(doc[field.getKey()]);
              return field.isEmbedded() ? new ResultSet(query.model(field.getModelRef()), value) : value;
            },
            enumerable: true,
          };

          prev[`$${name}`] = {
            get() {
              //
              if (doc[`$${name}`] !== undefined) return doc[`$${name}`];

              doc[`$${name}`] = new Promise((resolve, reject) => {
                (() => {
                  const value = field.deserialize(doc[field.getKey()]);

                  if (field.isScalar() || field.isEmbedded()) return Promise.resolve(value);

                  const fieldModel = field.getModelRef();
                  query.model(fieldModel);

                  if (field.isArray()) {
                    if (field.isVirtual()) {
                      const where = { [field.getVirtualField()]: this.id };
                      return resolver.match(fieldModel).where(where).many();
                    }

                    // Not a "required" query + strip out nulls
                    return Promise.all(ensureArray(value).map(id => resolver.match(fieldModel).id(id).one())).then(results => results.filter(r => r != null));
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

              return doc[`$${name}`];
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
