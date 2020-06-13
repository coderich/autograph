const DataResolver = require('./DataResolver');
const { keyPaths, mapPromise, lcFirst, ensureArray, toGUID } = require('../service/app.service');

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
        // return Promise.resolve(this.model.resolveDefaultValues(this.model.deserialize(result))).then((doc) => {
          const { id } = doc;
          const guid = toGUID(this.model.getName(), id);
          const dataResolver = new DataResolver(doc, (data, prop) => this.model.resolve(data, prop, resolver, query));

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
