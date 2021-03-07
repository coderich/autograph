const { get } = require('lodash');
const { map, keyPaths } = require('../service/app.service');
const { makeDataResolver } = require('../service/data.service');

// exports.toGUID = (model, id) => Buffer.from(`${model},${`${id}`}`).toString('base64');
// exports.fromGUID = guid => Buffer.from(`${guid}`, 'base64').toString('ascii').split(',');

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
      const sortPaths = keyPaths(query.sort());
      const sortValues = sortPaths.reduce((prev, path) => Object.assign(prev, { [path]: get(doc, path) }), {});
      const sortJSON = JSON.stringify(sortValues);
      const cursor = Buffer.from(sortJSON).toString('base64');
      const dataResolver = makeDataResolver(doc, model, resolver);
      return Object.defineProperty(dataResolver, '$$cursor', { writable: true, value: cursor });
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
