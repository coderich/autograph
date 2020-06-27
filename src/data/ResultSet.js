const DataResolver = require('./DataResolver');
const { map, keyPaths, mapPromise, lcFirst, ensureArray, toGUID } = require('../service/app.service');

const makeDataResolver = (doc, model, resolver, query) => {
  const dataResolver = new DataResolver(doc, (data, prop) => model.resolve(data, prop, resolver, query));

  Object.entries(doc).forEach(([key, value]) => {
    const field = model.getFieldByName(key);

    if (field && field.isEmbedded()) {
      const modelRef = field.getModelRef();
      if (modelRef) doc[key] = map(value, v => makeDataResolver(v, modelRef, resolver, query));
    }
  });

  return dataResolver;
};

module.exports = class {
  constructor(model, promise) {
    this.model = model;
    this.promise = promise;

    // Object.defineProperties(promise, {
    //   hydrate: {}, // Entire result set
    //   populate: {}, // One attribute
    // });
  }

  async hydrate(resolver, query) {
    return this.getResults(resolver, query).then(async (results) => {
      const paths = [...new Set([...keyPaths(query.getSortFields())])]; // Only need sortFields for hydrating (get rid of this)

      return Promise.all(ensureArray(results).map((doc) => {
        return Promise.all(paths.map((path) => {
          return path.split('.').reduce((promise, prop) => {
            return promise.then((subdoc) => {
              if (subdoc == null) return Promise.resolve(subdoc);
              if (Array.isArray(subdoc)) return Promise.all(subdoc.map(sd => Promise.resolve(sd[prop])));
              return Promise.resolve(subdoc[prop]);
            });
          }, Promise.resolve(doc));
        }));
      })).then(() => results);
    });
  }

  getResults(resolver, query) {
    return this.promise.then((results) => {
      return mapPromise(results, (result) => {
        return Promise.resolve(this.model.deserialize(result)).then((doc) => {
          const { id } = doc;
          const guid = toGUID(this.model.getName(), id);

          // Create and return a DataResolver
          const dataResolver = makeDataResolver(doc, this.model, resolver, query);

          return Object.defineProperties(dataResolver, {
            id: { value: id, enumerable: true, writable: true },
            $id: { value: guid },
          });
        });
      });
    });
  }

  getCountField(prop) {
    const [, countProp] = prop.split('count').map(v => lcFirst(v));
    return this.model.getField(countProp);
  }
};
