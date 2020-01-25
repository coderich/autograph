const _ = require('lodash');
const Model = require('../data/Model');
const RedisDriver = require('../driver/RedisDriver');
const MongoDriver = require('../driver/MongoDriver');
const { Neo4jDriver, Neo4jRestDriver } = require('../driver/Neo4jDriver');

module.exports = class Schema {
  constructor(schema, stores, driverArgs = {}) {
    this.schema = schema;

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
    this.models = Object.entries(schema).map(([model, options]) => new Model(this, model, drivers[options.driver || 'default'], options));

    const identifyOnDeletes = (parentModel) => {
      return this.models.reduce((prev, model) => {
        model.getOnDeleteFields().forEach((field) => {
          if (`${field.getModelRef()}` === `${parentModel}`) {
            if (model.isVisible()) {
              prev.push({ model, field, isArray: field.isArray(), op: field.getOnDelete() });
            } else {
              prev.push(...identifyOnDeletes(model).map(od => Object.assign(od, { fieldRef: field, isArray: field.isArray(), op: field.getOnDelete() })));
            }
          }
        });

        return _.uniqWith(prev, (a, b) => `${a.model}:${a.field}:${a.fieldRef}:${a.op}` === `${b.model}:${b.field}:${b.fieldRef}:${b.op}`);
      }, []);
    };

    // Assign model referential integrity
    this.models.forEach((parentModel) => {
      const ods = identifyOnDeletes(parentModel);
      parentModel.referentialIntegrity(ods);
    });
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
