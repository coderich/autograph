const Model = require('../data/Model');
const DataLoader = require('../data/DataLoader');
const DataTransaction = require('../data/DataTransaction');
const QueryBuilder = require('../query/QueryBuilder');
const { finalizeResults } = require('../data/DataService');

module.exports = class Resolver {
  constructor(schema, context = {}) {
    this.schema = schema;
    this.context = context;
    this.models = schema.getModels();
    this.loaders = this.models.reduce((prev, model) => prev.set(`${model}`, new DataLoader(this, model)), new Map());
  }

  getSchema() {
    return this.schema;
  }

  getContext() {
    return this.context;
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
    const { model, crud, method } = query.toObject();

    switch (crud) {
      case 'create': case 'update': case 'delete': {
        return model.getDriver().resolve(query.toDriver()).then((data) => {
          this.clear(model);
          const rs = model.shapeObject(model.getShape(), data, query);
          return finalizeResults(rs, query);
        });
      }
      default: {
        const key = model.idKey();
        const { where } = query.toDriver();
        const lookupValue = where[key];

        // This is a shortcut to prevent making unnecessary query
        if (Object.prototype.hasOwnProperty.call(where, key) && (lookupValue == null || (Array.isArray(lookupValue) && lookupValue.length === 0))) {
          switch (method) {
            case 'count': return Promise.resolve(0);
            case 'findMany': return Promise.resolve([]);
            default: return Promise.resolve(null);
          }
        }

        // Go through DataLoader to cache results
        return this.loaders.get(`${model}`).load(query);
      }
    }
  }

  toModel(model) {
    return model instanceof Model ? model : this.schema.getModel(model);
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

  // toResultSet(model, data, method) {
  //   const crud = ['get', 'find', 'count'].indexOf(method) > -1 ? 'read' : method;
  //   const doc = model.shape(data);
  //   const result = doc;
  //   const merged = doc;

  //   return createSystemEvent('Response', {
  //     model,
  //     crud,
  //     method,
  //     result,
  //     doc,
  //     merged,
  //     resolver: this,
  //     key: `${method}${model}`,
  //     context: this.getContext(),
  //     query: query.doc(result).merged(result),
  //   }, () => result);
  // }

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
