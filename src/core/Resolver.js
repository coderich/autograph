const { isEmpty } = require('lodash');
const Model = require('../data/Model');
const Query = require('../query/Query');
const ResultSet = require('../data/ResultSet');
const DataLoader = require('../data/DataLoader');
const DataTransaction = require('../data/DataTransaction');
const QueryBuilder = require('../query/QueryBuilder');
const { createSystemEvent } = require('../service/event.service');

module.exports = class Resolver {
  constructor(schema, context = {}) {
    this.models = schema.getModels();
    this.schema = schema;
    this.context = context;
    this.loaders = this.models.reduce((prev, model) => prev.set(`${model}`, new DataLoader(this, model)), new Map());

    //
    this.getSchema = () => this.schema;
    this.getContext = () => this.context;
  }

  /**
   * Creates and returns a QueryBuilder for a given model
   */
  match(model) {
    return new QueryBuilder(this, this.toModelEntity(model));
  }

  /**
   * Returns a user-defined Map (repository) of custom named queries.
   */
  named(model) {
    return this.toModel(model).getNamedQueries();
  }

  /**
   * Returns the raw client driver associated with the model.
   */
  raw(model) {
    return this.toModelEntity(model).raw();
    // const entity = this.toModelEntity(model);
    // const driver = entity.raw();
    // if (!method) return driver;

    // const resolver = this;
    // const crud = ['get', 'find', 'count'].indexOf(method) > -1 ? 'read' : method;
    // const query = new Query({ model: entity, resolver, crud });

    // return new Proxy(driver, {
    //   get(target, prop, rec) {
    //     const value = Reflect.get(target, prop, rec);

    //     if (typeof value === 'function') {
    //       return (...args) => {
    //         return value.bind(target)(...args).then((result) => {
    //           const doc = resolver.toResultSet(model, result);
    //           createSystemEvent('Response', { method, query: query.doc(doc) });
    //           return result;
    //         });
    //       };
    //     }

    //     return value;
    //   },
    // });
  }

  /**
   * Creates and returns a Transaction to run multiple queries
   */
  transaction(parentTxn) {
    return new DataTransaction(this, parentTxn);
  }

  disconnect(model) {
    return this.toModelEntity(model).getDriver().disconnect();
  }

  resolve(query) {
    const { model, crud } = query.toObject();

    switch (crud) {
      case 'create': case 'update': case 'delete': {
        return model.getDriver().resolve(query.toDriver()).then((data) => {
          this.clear(model);
          return new ResultSet(query, data);
        });
      }
      default: {
        const key = model.idKey();
        const { where, method } = query.toDriver();

        // This check is to avoid making a db call for no reason
        if (Object.prototype.hasOwnProperty.call(where, key) && isEmpty(where[key])) {
          switch (method) {
            case 'count': return Promise.resolve(0);
            case 'findMany': return Promise.resolve([]);
            default: return Promise.resolve(null);
          }
        }

        // DB call
        return this.loaders.get(`${model}`).load(query);
      }
    }
  }

  toModel(model) {
    const $model = model instanceof Model ? model : this.schema.getModel(model);
    return $model;
  }

  toModelMarked(model) {
    const marked = this.toModel(model);
    if (!marked) throw new Error(`${model} is not defined in schema`);
    if (!marked.isMarkedModel()) throw new Error(`${model} is not a marked model`);
    return marked;
  }

  toModelEntity(model) {
    const entity = this.toModel(model);
    if (!entity) throw new Error(`${model} is not defined in schema`);
    if (!entity.isEntity()) throw new Error(`${model} is not an entity`);
    return entity;
  }

  toResultSet(model, data, method) {
    const crud = ['get', 'find', 'count'].indexOf(method) > -1 ? 'read' : method;
    const query = new Query({ model: this.toModel(model), resolver: this, crud });
    const result = new ResultSet(query, data);
    return createSystemEvent('Response', {
      model,
      crud,
      method,
      result,
      doc: result,
      merged: result,
      resolver: this,
      key: `${method}${model}`,
      context: this.getContext(),
      query: query.doc(result).merged(result),
    }, () => result);
  }

  // DataLoader Proxy Methods
  clear(model) {
    this.loaders.get(`${model}`).clearAll();
    return this;
  }

  clearAll() {
    this.models.forEach(model => this.clear(model));
    return this;
  }
};
