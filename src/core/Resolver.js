const { isEmpty } = require('lodash');
const Boom = require('./Boom');
const Model = require('../data/Model');
const DataLoader = require('../data/DataLoader');
const QueryBuilder = require('../query/QueryBuilder');

module.exports = class Resolver {
  constructor(schema, context = {}) {
    this.schema = schema;
    this.context = context;
    this.loader = new DataLoader();
    this.schema.setContext(context);

    // DataLoader Proxy Methods
    this.clear = key => this.loader.clear(key);
    this.clearAll = () => this.loader.clearAll();
    this.prime = (key, value) => this.loader.prime(key, value);

    //
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

  resolve(query) {
    const { model, method } = query.toObject();

    switch (method) {
      case 'create': case 'update': case 'delete': {
        return model.getDriver().resolve(query.toDriver()).then((data) => {
          this.clearAll();
          return data;
        });
      }
      default: {
        return this.loader.load(query);
      }
    }
  }

  toModel(model) {
    const $model = model instanceof Model ? model : this.schema.getModel(model);
    $model.setResolver(this);
    return $model;
  }

  toModelEntity(model) {
    const entity = this.toModel(model);
    if (!entity) throw new Error(`${model} is not defined in schema`);
    if (!entity.isEntity()) throw new Error(`${model} is not an entity`);
    return entity;
  }
};
