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
      return Promise.all(keys.map(({ method, model, query, args }) => fetcher[method].call(fetcher, new Query(toModel(model), query), ...args)));
    }, {
      cache: false,
      cacheKeyFn: ({ method, model, query, args }) => hashObject({ method, model: `${model}`, query, args }),
    });

    const exec = (key) => {
      const { method, model, query, args } = key;

      switch (method) {
        case 'create': case 'update': case 'delete': return fetcher[method].call(fetcher, new Query(toModel(model), query), ...args);
        default: return loader.load(key);
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
