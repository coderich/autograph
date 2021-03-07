const { toGUID, map } = require('../service/app.service');
const { makeDataResolver } = require('../service/data.service');

module.exports = class ResultSet {
  constructor(query, data) {
    if (data == null) return data;
    const model = query.model();
    const resolver = query.resolver();
    // const fieldKeyToDataMap = query.model().getFields().reduce((prev, field) => Object.assign(prev, { [field.getKey()]: { name: field.getName(), modelRef: field.getModelRef() } }), {});
    // const normalize = obj => Object.entries(obj).reduce((prev, [key, value]) => Object.assign(prev, { [fieldKeyToDataMap[key].name]: value }), {});

    // return map(data, (doc) => {
    //   return query.model().deserialize(doc);
    // });

    const results = map(model.deserialize(data), (doc, i) => {
      // const cursor = toGUID(i, doc.$id);
      const dataResolver = makeDataResolver(doc, model, resolver);
      return Object.defineProperty(dataResolver, '$$cursor', { writable: true, value: doc._id });
    });

    return results;

    // // const paths = [...new Set([...keyPaths(query.getSortFields())])]; // Only need sortFields for hydrating (get rid of this)
    // const paths = [];

    // return Promise.all(ensureArray(results).map((doc) => {
    //   return Promise.all(paths.map((path) => {
    //     return path.split('.').reduce((promise, prop) => {
    //       return promise.then((subdoc) => {
    //         if (subdoc == null) return Promise.resolve(subdoc);
    //         if (Array.isArray(subdoc)) return Promise.all(subdoc.map(sd => Promise.resolve(sd[prop])));
    //         return Promise.resolve(subdoc[prop]);
    //       });
    //     }, Promise.resolve(doc));
    //   }));
    // })).then(() => results);

    // // return mapPromise(data, (doc) => {
    // //   return Promise.resolve(model.deserialize(doc)).then((obj) => {
    // //     return makeDataResolver(obj, model, resolver);
    // //   });
    // // });
  }
};
