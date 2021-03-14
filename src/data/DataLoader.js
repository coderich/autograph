const { flatten } = require('lodash');
const FBDataLoader = require('dataloader');
const { hashObject } = require('../service/app.service');

module.exports = class DataLoader extends FBDataLoader {
  constructor() {
    return new FBDataLoader((queries) => {
      const queriesByModel = queries.reduce((prev, query, i) => {
        const toDriver = query.toDriver();
        const { model } = query.toObject();
        const key = model.idKey();
        prev[model] = (prev[model] || { model, key, get: {}, find: [] });
        toDriver.$index = i;

        if (Object.prototype.hasOwnProperty.call(toDriver.where, key)) {
          const { [key]: id, ...rest } = toDriver.where;
          const hash = hashObject(rest);
          prev[model].get[hash] = prev[model].get[hash] || [];
          prev[model].get[hash].push(toDriver);
          return prev;
        }

        prev[model].find.push(toDriver);
        return prev;
      }, {});

      return new Promise((resolve, reject) => {
        const results = [];

        Promise.all(Object.values(queriesByModel).map(({ model, key, get, find }) => {
          return Promise.all(flatten([
            ...find.map(q => model.getDriver().resolve(q)),
            ...Object.values(get).map(set => set.map(q => model.getDriver().resolve(q))),
          ]));
        })).then((resultsByModel) => {
          resultsByModel.forEach((modelResults, i) => {
            const { get, find } = Object.values(queriesByModel)[i];

            modelResults.splice(0, find.length).forEach((result, j) => (results[find[j].$index] = result));

            Object.values(get).forEach((set) => {
              modelResults.splice(0, set.length).forEach((result, j) => (results[set[j].$index] = result));
            });

            resolve(results);
          });
        });
      });

      // return Promise.all(queries.map((query) => {
      //   const { model } = query.toObject();
      //   return model.getDriver().resolve(query.toDriver());
      // }));
    }, {
      cache: false,
      cacheKeyFn: query => hashObject(query.getCacheKey()),
    });
  }
};
