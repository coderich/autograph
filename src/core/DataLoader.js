const DataLoader = require('dataloader');
const QueryBuilder = require('../data/QueryBuilder');
const QueryFetcher = require('../data/QueryFetcher');
const Query = require('../data/Query');
const Model = require('../data/Model');
const { hashObject } = require('../service/app.service');

module.exports = class {
  constructor(schema) {
    let fetcher;

    const toModel = model => (model instanceof Model ? model : schema.getModel(model));

    const loader = new DataLoader((keys) => {
      return Promise.all(keys.map(({ method, model, query, args }) => fetcher[method](query, ...args)));
    }, {
      cacheKeyFn: ({ method, model, query, args }) => hashObject({ method, model: `${model}`, query: query.toObject(), args }),
    });

    const exec = async (key) => {
      const { method, model, query: q, args } = key;
      const query = new Query(toModel(model), q);

      switch (method) {
        case 'create': case 'update': case 'delete': {
          const results = await fetcher[method](query, ...args);
          loader.clearAll();
          return results;
        }
        default: {
          return loader.load({ method, model, query, args });
        }
      }
    };

    // Api
    const node = model => new QueryBuilder(exec, toModel(model));
    node.dispose = () => loader.clearAll();
    node.toModel = toModel;
    fetcher = new QueryFetcher(node);
    return node;
  }
};
