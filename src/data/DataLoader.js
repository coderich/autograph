const FBDataLoader = require('dataloader');
const { paginateResultSet } = require('./DataService');
const Query = require('../query/Query');

const { hashObject } = require('../service/app.service');

const handleData = (data, model, query) => {
  if (data == null || typeof data !== 'object') return data; // We only deserialize objects
  return model.deserialize(data, query).then((results) => {
    return results.length ? paginateResultSet(results, query) : results;
  });
};

module.exports = class DataLoader extends FBDataLoader {
  constructor(resolver, model) {
    const driver = model.getDriver();
    const whereShape = model.getShape('create', 'where');

    return new FBDataLoader((queries) => {
      // The idea is to group the id-only queries together to make 1 query instead
      const { findOneByIdQueries, allOtherQueries } = queries.reduce((prev, query, i) => {
        const { id, method } = query.toObject();
        const key = method === 'findOne' && id ? 'findOneByIdQueries' : 'allOtherQueries';
        prev[key].push({ id, query, i });
        return prev;
      }, { findOneByIdQueries: [], allOtherQueries: [] });

      // Aggregate ids
      const ids = Array.from(new Set(findOneByIdQueries.map(el => `${el.id}`)));
      const batchQuery = new Query({ resolver, model, method: 'findMany', crud: 'read' });
      const batchWhere = model.shapeObject(whereShape, { id: ids }, batchQuery); // This will add back instructs etc

      const promises = [Promise.all(allOtherQueries.map(({ query, i }) => driver.resolve(query.toDriver()).then(data => handleData(data, model, query)).then(data => ({ data, i }))))];
      if (ids.length) promises.push(driver.resolve(batchQuery.where(batchWhere).toDriver()).then(data => handleData(data, model, batchQuery)).then(results => findOneByIdQueries.map(({ id, i }) => ({ i, data: results.find(r => `${r.id}` === `${id}`) || null }))));

      return Promise.all(promises).then((results) => {
        return results.flat().sort((a, b) => a.i - b.i).map(({ data }) => data);
      });

      // return Promise.all(queries.map((query) => {
      //   return driver.resolve(query.toDriver()).then(data => handleData(data, model, query));
      // }));
    }, {
      cache: true,
      cacheKeyFn: query => hashObject(query.getCacheKey()),
    });
  }
};
