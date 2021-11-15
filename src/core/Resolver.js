const Model = require('../data/Model');
const Query = require('../query/Query');
const ResultSet = require('../data/ResultSet');
const DataLoader = require('../data/DataLoader');
const DataTransaction = require('../data/DataTransaction');
const QueryBuilder = require('../query/QueryBuilder');

module.exports = class Resolver {
  constructor(schema, context = {}) {
    const models = schema.getModels();
    this.schema = schema;
    this.context = context;
    this.loaders = models.reduce((prev, model) => prev.set(model, new DataLoader(this, model)), new WeakMap());

    // DataLoader Proxy Methods
    this.clear = model => this.loaders.get(model).clearAll();
    this.clearAll = () => models.forEach(model => this.loaders.get(model).clearAll());

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
  }

  /**
   * Creates and returns a Transaction to run multiple queries
   */
  transaction(parentTxn) {
    return new DataTransaction(this, parentTxn);
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
        // This is needed in SF tests...
        const key = model.idKey();
        const { where } = query.toDriver();
        if (Object.prototype.hasOwnProperty.call(where, key) && where[key] == null) return Promise.resolve(null);

        //
        return this.loaders.get(model).load(query);
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

  toResultSet(model, data) {
    return new ResultSet(new Query({ model: this.toModel(model), resolver: this }), data);
  }
};
