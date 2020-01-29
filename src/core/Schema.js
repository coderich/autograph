const { Schema } = require('@coderich/quin');
const Model = require('../data/Model');
const RedisDriver = require('../driver/RedisDriver');
const MongoDriver = require('../driver/MongoDriver');
const { Neo4jDriver, Neo4jRestDriver } = require('../driver/Neo4jDriver');
const typeDefs = require('../../test/typeDefs');

module.exports = class {
  constructor(schema, stores, driverArgs = {}) {
    // this.schema = schema;
    this.schema = new Schema(typeDefs);

    const availableDrivers = {
      mongo: MongoDriver,
      neo4jDriver: Neo4jDriver,
      neo4jRest: Neo4jRestDriver,
      redis: RedisDriver,
    };

    // Create drivers
    const drivers = Object.entries(stores).reduce((prev, [key, { type, uri, options }]) => {
      return Object.assign(prev, {
        [key]: {
          dao: new availableDrivers[type](uri, this, options, driverArgs[type]),
          idValue: availableDrivers[type].idValue,
          idField: type === 'mongo' ? '_id' : 'id',
        },
      });
    }, {});

    // Create models
    // this.models = Object.entries(schema).map(([model, options]) => new Model(this, model, drivers[options.driver || 'default'], options));
    this.models = this.schema.getModels().map(model => new Model(this, model, drivers[model.getDriver()]));
  }

  getModel(name) {
    return this.models.find(model => model.getName() === name);
  }

  getModels() {
    return this.models;
  }

  getVisibleModels() {
    return this.models.filter(model => model.isVisible());
  }
};
