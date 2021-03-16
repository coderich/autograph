// const { flatten } = require('lodash');
const FBDataLoader = require('dataloader');
const ResultSet = require('./ResultSet');
const { hashObject } = require('../service/app.service');

let counter = 0;
module.exports = class DataLoader extends FBDataLoader {
  constructor() {
    return new FBDataLoader((queries) => {
      const timeID = `${++counter}Loader`;
      console.time(timeID);

      // const queriesByModel = queries.reduce((prev, query, i) => {
      //   const toDriver = query.toDriver();
      //   const { model, method } = query.toObject();
      //   const key = model.idKey();
      //   prev[model] = (prev[model] || { model, key, get: {}, find: [] });
      //   toDriver.$index = i;

      //   if (method === 'findOne' && Object.prototype.hasOwnProperty.call(toDriver.where, key) && !Array.isArray(toDriver.where[key])) {
      //     const { [key]: id, ...rest } = toDriver.where;
      //     const hash = hashObject(rest);
      //     prev[model].get[hash] = prev[model].get[hash] || [];
      //     prev[model].get[hash].push(toDriver);
      //     return prev;
      //   }

      //   prev[model].find.push(toDriver);
      //   return prev;
      // }, {});

      // return new Promise((resolve, reject) => {
      //   const results = [];

      //   Promise.all(Object.values(queriesByModel).map(({ model, key, get, find }) => {
      //     return Promise.all(flatten([
      //       ...find.map(q => model.getDriver().resolve(q)),
      //       // ...Object.values(get).map(set => set.map(q => model.getDriver().resolve(q))),
      //       ...Object.values(get).map((set) => {
      //         const ids = [...new Set(set.map(({ where }) => where[key]))];
      //         const toDriver = { ...set[0] };
      //         toDriver.method = 'findMany';
      //         toDriver.where[key] = ids;
      //         return model.getDriver().resolve(toDriver);
      //       }),
      //     ]));
      //   })).then((resultsByModel) => {
      //     console.timeEnd(timeID);
      //     resultsByModel.forEach((modelResults, i) => {
      //       const { key, get, find } = Object.values(queriesByModel)[i];

      //       modelResults.splice(0, find.length).forEach((result, j) => (results[find[j].$index] = result));

      //       Object.values(get).forEach((set) => {
      //         const bundle = modelResults.shift();

      //         set.forEach(({ where, $index }) => {
      //           const id = where[key];
      //           results[$index] = bundle.find(res => `${res[key]}` === `${id}`) || null;
      //         });
      //         // modelResults.splice(0, set.length).forEach((result, j) => (results[set[j].$index] = result));
      //       });

      //       resolve(results);
      //     });
      //   });
      // });

      return Promise.all(queries.map((query) => {
        const { model } = query.toObject();
        return model.getDriver().resolve(query.toDriver()).then(data => (typeof data === 'object' ? new ResultSet(query, data) : data));
      })).then((results) => {
        // console.timeEnd(timeID);
        return results;
      });
    }, {
      // cache: false,
      cacheKeyFn: query => hashObject(query.getCacheKey()),
    });
  }
};
