const FBDataLoader = require('dataloader');
const DataStream = require('./DataStream');
// const Query = require('../query/Query');

const { hashObject } = require('../service/app.service');

// let counter = 0;
module.exports = class DataLoader extends FBDataLoader {
  constructor(resolver, model) {
    // const idKey = model.idKey();
    const driver = model.getDriver();

    return new FBDataLoader((queries) => {
      // // The idea is to group the "findOne by id" queries together to make 1 query instead
      // const { findOneByIdQueries, allOtherQueries } = queries.reduce((prev, query, i) => {
      //   const { id, method } = query.toObject();
      //   const key = method === 'findOne' && id ? 'findOneByIdQueries' : 'allOtherQueries';
      //   prev[key].push({ id, query, i });
      //   return prev;
      // }, { findOneByIdQueries: [], allOtherQueries: [] });

      // // Aggregate ids
      // const ids = Array.from(new Set(findOneByIdQueries.map(el => `${el.id}`)));
      // const batchQuery = new Query({ resolver, model, method: 'findMany', crud: 'read' });
      // const batchWhere = model.transform(batchQuery, { id: ids }, 'serialize', true);
      // const promises = [Promise.all(allOtherQueries.map(({ query, i }) => driver.resolve(query.toDriver()).then(data => ({ data, query, i }))))];
      // if (ids.length) promises.push(driver.resolve(batchQuery.where(batchWhere).toDriver()).then(results => findOneByIdQueries.map(({ query, id, i }) => ({ i, query, data: results.find(r => `${r[idKey]}` === `${id}`) || null }))));

      // return Promise.all(promises).then((results) => {
      //   const sorted = results.flat().filter(Boolean).sort((a, b) => a.i - b.i);
      //   return sorted.map(({ query, data }) => (data != null && typeof data === 'object' ? new ResultSet(query, data) : data));
      // });

      return Promise.all(queries.map((query) => {
        return driver.resolve(query.toDriver()).then((data) => {
          return new DataStream(model, data, resolver.getContext());
        });
      }));
    }, {
      cache: true,
      cacheKeyFn: query => hashObject(query.getCacheKey()),
    });
  }
};
