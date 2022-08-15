const FBDataLoader = require('dataloader');
const { paginateResultSet } = require('./DataService');

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

    return new FBDataLoader((queries) => {
      // //
      // const identityQueries = queries.reduce((prev, query, i) => {
      //   const { identity = '__na__', where, cmd, flags } = query.toObject();
      //   prev[identity] = prev[identity] || [];
      //   prev[identity].push({ query, where, cmd, flags, i });
      //   return prev;
      // }, {});

      // return Promise.all(...Object.entries(identityQueries).map(([key, values]) => {
      //   switch (key) {
      //     case '__na__': {
      //       return values.map(({ query, i }) => driver.resolve(query.toDriver()).then(data => handleData(data, model, query)).then(data => ({ data, i })));
      //     }
      //     default: {
      //       const keys = Array.from(new Set(values.map(({ where }) => `${where[key]}`).flat()));
      //       const whereShape = model.getShape('create', 'where');
      //       const batchQuery = new Query({ resolver, model, method: 'findMany', crud: 'read' });
      //       const batchWhere = model.shapeObject(whereShape, { [key]: keys }, batchQuery); // This will add back instructs etc

      //       console.log('Batch Query', key, values.length);

      //       return values.map(({ where, cmd, flags, i }) => {
      //         return driver.resolve(batchQuery.where(batchWhere).toDriver()).then(data => handleData(data, model, batchQuery)).then((results) => {
      //           const data = ensureArray(map(where[key], k => results.find(r => `${r[key]}` === `${k}`) || null));
      //           return { i, data: cmd === 'many' ? data.filter(Boolean) : data[0] };
      //         });
      //       });
      //     }
      //   }
      // })).then((results) => {
      //   return results.flat().sort((a, b) => a.i - b.i).map(({ data }) => data);
      // });

      // // The idea is to group the id-only queries together to make 1 query instead
      // const { findOneByIdQueries, allOtherQueries } = queries.reduce((prev, query, i) => {
      //   const { id, method } = query.toObject();
      //   const key = method === 'findOne' && id ? 'findOneByIdQueries' : 'allOtherQueries';
      //   prev[key].push({ id, query, i });
      //   return prev;
      // }, { findOneByIdQueries: [], allOtherQueries: [] });

      // if (findOneByIdQueries.length) {
      //   // Aggregate ids
      //   const ids = Array.from(new Set(findOneByIdQueries.map(el => `${el.id}`)));
      //   const whereShape = model.getShape('create', 'where');
      //   const batchQuery = new Query({ resolver, model, method: 'findMany', crud: 'read' });
      //   const batchWhere = model.shapeObject(whereShape, { id: ids }, batchQuery); // This will add back instructs etc

      //   const promises = [Promise.all(allOtherQueries.map(({ query, i }) => driver.resolve(query.toDriver()).then(data => handleData(data, model, query)).then(data => ({ data, i }))))];
      //   if (ids.length) promises.push(driver.resolve(batchQuery.where(batchWhere).toDriver()).then(data => handleData(data, model, batchQuery)).then(results => findOneByIdQueries.map(({ id, i }) => ({ i, data: results.find(r => `${r.id}` === `${id}`) || null }))));

      //   return Promise.all(promises).then((results) => {
      //     return results.flat().sort((a, b) => a.i - b.i).map(({ data }) => data);
      //   });
      // }

      return Promise.all(queries.map((query) => {
        return driver.resolve(query.toDriver()).then(data => handleData(data, model, query));
      }));
    }, {
      cache: true,
      cacheKeyFn: query => hashObject(query.getCacheKey()),
    });
  }
};
