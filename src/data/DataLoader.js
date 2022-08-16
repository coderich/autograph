const FBDataLoader = require('dataloader');
const { paginateResultSet } = require('./DataService');
const { map, ensureArray, hashObject } = require('../service/app.service');
const Query = require('../query/Query');

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
      //
      const batchQueries = queries.reduce((prev, query, i) => {
        const { identity = '__na__', where, cmd } = query.toObject();
        const key = identity && (cmd === 'one' || cmd === 'many') ? identity : '__na__';
        prev[key] = prev[key] || [];
        prev[key].push({ query, where, cmd, i });
        return prev;
      }, {});

      return Promise.all(Object.entries(batchQueries).map(([key, values]) => {
        switch (key) {
          case '__na__': {
            return values.map(({ query, i }) => driver.resolve(query.toDriver()).then(data => handleData(data, model, query)).then(data => ({ data, i })));
          }
          default: {
            const keys = Array.from(new Set(values.map(({ where }) => map(where[key], el => `${el}`)).flat()));
            const whereShape = model.getShape('create', 'where');
            const batchQuery = new Query({ resolver, model, method: 'findMany', crud: 'read' });
            const batchWhere = model.shapeObject(whereShape, { [key]: keys }, batchQuery); // This will add back instructs etc

            console.log(`${model}`, key, keys.length);

            return driver.resolve(batchQuery.where(batchWhere).toDriver()).then(data => handleData(data, model, batchQuery)).then((results) => {
              return values.map(({ where, cmd, i }) => {
                const data = ensureArray(where[key]).map(k => results.find(r => `${r[key]}` === `${k}`) || null);
                return { i, data: cmd === 'many' ? data.filter(d => d != null) : data[0] };
              });
            });
          }
        }
      }).flat()).then((results) => {
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
