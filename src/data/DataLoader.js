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
      let performBatchQuery = false; // If we don't have to batch it's faster to resolve normal
      const defaultBatchName = '__default__'; // Something that won't collide with an actual field name

      /**
       * Batch queries can save resources and network round-trip latency. However, we have to be careful to
       * preserve the order and adhere to the DataLoader API. This step simply creates a map of batch
       * queries to run; saving the order ("i") along with useful meta information
       */
      const batchQueries = queries.reduce((prev, query, i) => {
        const { batch = defaultBatchName, where, cmd } = query.toObject();
        const key = batch && (cmd === 'one' || cmd === 'many') ? batch : defaultBatchName;
        if (key !== defaultBatchName) performBatchQuery = true;
        prev[key] = prev[key] || [];
        prev[key].push({ query, where, cmd, i });
        return prev;
      }, {});

      // Don't batch unless it's worth it!
      if (!performBatchQuery) {
        return Promise.all(queries.map((query) => {
          return driver.resolve(query.toDriver()).then(data => handleData(data, model, query));
        }));
      }

      /**
       * We have reduced the number of queries down to a smaller set of batch queries to run. The dance
       * performed below retreives the data and then expands the results back into the original queries
       */
      const whereShape = model.getShape('create', 'where');

      // console.log(Object.entries(batchQueries).map(([key, value]) => ({ [key]: value.length })));

      return Promise.all(Object.entries(batchQueries).map(([key, values]) => {
        switch (key) {
          case defaultBatchName: {
            return values.map(({ query, i }) => driver.resolve(query.toDriver()).then(data => handleData(data, model, query)).then(data => ({ data, i })));
          }
          default: {
            const keys = Array.from(new Set(values.map(({ where }) => map(where[key], el => `${el}`)).flat()));
            const batchQuery = new Query({ resolver, model, method: 'findMany', crud: 'read' });
            const batchWhere = model.shapeObject(whereShape, { [key]: keys }, batchQuery); // This will add back instructs etc

            return driver.resolve(batchQuery.where(batchWhere).toDriver()).then(data => handleData(data, model, batchQuery)).then((results) => {
              // One-time data transformation on results to make matching back faster (below)
              const resultsByKey = results.reduce((prev, row) => {
                ensureArray(row[key]).forEach((id) => {
                  prev[id] = prev[id] || [];
                  prev[id].push(row);
                });
                return prev;
              }, {});

              // Match back
              return values.map(({ where, cmd, i }) => {
                const targets = ensureArray(where[key]).map(t => `${t}`);
                const data = targets.map(t => resultsByKey[t] || null).flat();
                return { i, data: cmd === 'many' ? data.filter(d => d != null) : data[0] };
              });
            });
          }
        }
      }).flat()).then((results) => {
        return results.flat().sort((a, b) => a.i - b.i).map(({ data }) => data);
      });
    }, {
      cache: true,
      cacheKeyFn: query => hashObject(query.getCacheKey()),
    });
  }
};
