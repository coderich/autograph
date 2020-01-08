const DataLoader = require('dataloader');
const QueryBuilder = require('../data/QueryBuilder');
const QueryFetcher = require('../data/QueryFetcher');
const Query = require('../data/Query');
const Model = require('../data/Model');
const { hashObject } = require('../service/app.service');

module.exports = class {
  constructor(schema) {
    this.schema = schema;
    this.fetcher = new QueryFetcher(this);
    this.loader = new DataLoader(keys => Promise.all(keys.map(({ method, query, args }) => this.fetcher[method](query, ...args))), {
      cacheKeyFn: ({ method, model, query, args }) => hashObject({ method, model: `${model}`, query: query.toObject(), args }),
    });
  }

  async load(key) {
    const { method, model, query: q, args } = key;
    const query = new Query(this.toModel(model), q);

    switch (method) {
      case 'create': case 'update': case 'delete': {
        const results = await this.fetcher[method](query, ...args);
        this.loader.clearAll();
        return results;
      }
      default: {
        return this.loader.load({ method, model, query, args });
      }
    }
  }

  clear(key) {
    return this.loader.clear(key);
  }

  clearAll() {
    return this.loader.clearAll();
  }

  prime(key, value) {
    return this.loader.prime(key, value);
  }

  match(model) {
    return new QueryBuilder(this.toModel(model), this);
  }

  toModel(model) {
    return model instanceof Model ? model : this.schema.getModel(model);
  }
};
