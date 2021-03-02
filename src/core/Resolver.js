const Model = require('../data/Model');
const DataLoader = require('../data/DataLoader');
const ResultSet = require('../data/ResultSet');
const QueryBuilder = require('../query/QueryBuilder');
const QueryPlanner = require('../query/QueryPlanner');

module.exports = class Resolver {
  constructor(schema, context = {}) {
    this.schema = schema;
    this.context = context;
    this.loader = new DataLoader();

    // DataLoader Proxy Methods
    this.clear = key => this.loader.clear(key);
    this.clearAll = () => this.loader.clearAll();
    this.prime = (key, value) => this.loader.prime(key, value);

    //
    this.getContext = () => this.context;
  }

  /**
   * Returns a QueryBuilder in "match" mode; which will return an array of records for queries.
   */
  match(model) {
    return new QueryBuilder(this, this.toModelEntity(model), { mode: 'match' });
  }

  /**
   * Returns a QueryBuilder in "target" mode; which will return a single record for queries.
   */
  target(model) {
    return new QueryBuilder(this, this.toModelEntity(model), { mode: 'target' });
  }

  /**
   * Returns a user-defined Map of custom named queries for easier re-use.
   */
  named(model) {
    return this.toModel(model).getNamedQueries();
  }

  /**
   * Returns the raw driver associated with the model for full query control.
   */
  raw(model) {
    return this.toModelEntity(model).raw();
  }

  async resolve(query) {
    const queryPlanner = new QueryPlanner(this, query);

    switch (query.methodType()) {
      case 'mutation': {
        return queryPlanner.getPlan().then((plan) => {
          return query.model().getDriver()[query.method()](plan).then((data) => {
            this.clearAll();
            return new ResultSet(query, data);
          });
        });
      }
      default: {
        return this.loader.load(queryPlanner).then(data => new ResultSet(query, data));
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
