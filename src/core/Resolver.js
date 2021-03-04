const { isEmpty } = require('lodash');
const Boom = require('./Boom');
const Model = require('../data/Model');
const DataLoader = require('../data/DataLoader');
const ResultSet = require('../data/ResultSet');
const QueryBuilder = require('../query/QueryBuilder');
const QueryWorker = require('../query/QueryWorker');

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

  async resolve(query) {
    const model = query.model();
    const { required, debug } = query.flags();
    const queryWorker = new QueryWorker(query);

    switch (query.crud()) {
      case 'create': case 'update': case 'delete': {
        return queryWorker.getWork().then((work) => {
          return model.getDriver().resolve(work).then((data) => {
            this.clearAll();
            return new ResultSet(query, data);
          });
        });
      }
      default: {
        return this.loader.load(queryWorker).then((data) => {
          if (debug) console.log('got result', data);
          if (required && (!data || isEmpty(data))) throw Boom.notFound(`${model} Not Found`);
          return data;
        });
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
