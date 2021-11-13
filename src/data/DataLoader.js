const FBDataLoader = require('dataloader');
const ResultSet = require('./ResultSet');
const Query = require('../query/Query');
const { hashObject } = require('../service/app.service');

// let counter = 0;
module.exports = class DataLoader extends FBDataLoader {
  constructor(resolver, model) {
    const idKey = model.idKey();
    const driver = model.getDriver();

    return new FBDataLoader((queries) => {
      // The idea is to group the "findOne by id" queries together to make 1 query instead
      const { findOneByIdQueries, allOtherQueries } = queries.reduce((prev, query, i) => {
        const { id, method } = query.toObject();
        const key = method === 'findOne' && id ? 'findOneByIdQueries' : 'allOtherQueries';
        prev[key].push({ id, query, i });
        return prev;
      }, { findOneByIdQueries: [], allOtherQueries: [] });

      // Aggregate ids
      const ids = Array.from(new Set(findOneByIdQueries.map(el => el.id)));
      const batchQuery = new Query({ resolver, model, method: 'findMany', where: { [idKey]: ids } });

      return Promise.all([
        driver.resolve(batchQuery.toDriver()).then(results => findOneByIdQueries.map(({ query, id, i }) => ({ i, query, data: results.find(r => `${r[idKey]}` === `${id}`) || null }))),
        Promise.all(allOtherQueries.map(({ query, i }) => driver.resolve(query.toDriver()).then(data => ({ data, query, i })))),
      ]).then((results) => {
        const sorted = results.flat().sort((a, b) => a.i - b.i);
        console.log(queries.length, sorted.length);
        return sorted.map(({ query, data }) => (data != null && typeof data === 'object' ? new ResultSet(query, data) : data));
      });

      // return Promise.all(queries.map((query) => {
      //   return driver.resolve(query.toDriver()).then((data) => {
      //     return (data != null && typeof data === 'object' ? new ResultSet(query, data) : data);
      //   });
      // }));
    }, {
      // cache: false,
      // maxBatchSize: 50,
      cacheKeyFn: query => hashObject(query.getCacheKey()),
    });
  }
};
