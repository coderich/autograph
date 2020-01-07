const Model = require('../data/Model');
const RedisDriver = require('../driver/RedisDriver');
const MongoDriver = require('../driver/MongoDriver');
const { Neo4jDriver, Neo4jRestDriver } = require('../driver/Neo4jDriver');

module.exports = class Schema {
  constructor(schema, stores, driverArgs = {}) {
    this.schema = schema;

    const availableDrivers = {
      mongo: MongoDriver,
      neo4j: Neo4jDriver,
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

  // static identifyOnDeletes(schema) {
  //   return Object.keys(schema).reduce((prev, modelName) => {
  //     const arr = [];

  //     Object.entries(schema).forEach(([model, modelDef]) => {
  //       Object.entries(modelDef.fields).forEach(([field, fieldDef]) => {
  //         const ref = Parser.getFieldDataRef(fieldDef);
  //         const { onDelete } = fieldDef;

  //         if (ref === modelName && onDelete) {
  //           arr.push({ model, field, isArray: Boolean(Parser.getFieldArrayType(fieldDef)), onDelete });
  //         }
  //       });
  //     });

  //     return Object.assign(prev, { [modelName]: arr });
  //   }, {});
  // }
};
