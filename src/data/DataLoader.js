const DataLoader = require('dataloader');
const { FullQueryBuilder, QueryBuilder } = require('./QueryBuilder');
const QueryFetcher = require('./QueryFetcher');
const Query = require('./Query');
const Model = require('./Model');
const { hashObject } = require('../service/app.service');

module.exports = class {
  constructor(schema) {
    this.schema = schema;

    this.fetch = new QueryFetcher(this);

    this.loader = new DataLoader((keys) => {
      return Promise.all(keys.map(({ method, model, query, args }) => this.fetch[method](new Query(this.toModel(model), query), ...args)));
    }, {
      cacheKeyFn: ({ method, model, query, args }) => hashObject({ method, model: `${model}`, query, args }),
    });
  }

  get(model, id) {
    return new QueryBuilder(this.loader, 'get', model, id);
  }

  query(model) {
    return new FullQueryBuilder(this.loader, 'query', model);
  }

  find(model) {
    return new QueryBuilder(this.loader, 'find', model);
  }

  count(model) {
    return new QueryBuilder(this.loader, 'count', model);
  }

  create(model, data) {
    return this.fetch.create(new Query(this.toModel(model)), data);
  }

  update(model, id, data) {
    return this.fetch.update(new Query(this.toModel(model)), id, data);
  }

  delete(model, id) {
    return this.fetch.delete(new Query(this.toModel(model)), id);
  }

  drop(model) {
    return this.fetch.drop(new Query(this.toModel(model)));
  }

  clearAll() {
    this.loader.clearAll();
    return this;
  }

  idValue(model, id) {
    model = this.toModel(model);
    return model.idValue(id);
  }

  idField(model) {
    model = this.toModel(model);
    return model.idField();
  }

  toModel(model) {
    return model instanceof Model ? model : this.schema.getModel(model);
  }
};
