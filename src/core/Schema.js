const Model = require('../data/Model');
const Drivers = require('../driver');
const Schema = require('../graphql/ast/Schema');
const apiExt = require('../graphql/extension/api');
const typeExt = require('../graphql/extension/type');
const frameworkExt = require('../graphql/extension/framework');
const { identifyOnDeletes } = require('../service/schema.service');

// Export class
module.exports = class extends Schema {
  constructor(schema, stores) {
    super(schema);

    // Create drivers
    this.drivers = Object.entries(stores).reduce((prev, [key, value]) => {
      const { type } = value;
      const Driver = Drivers.require(type);

      return Object.assign(prev, {
        [key]: {
          dao: new Driver(value, this),
          idValue: Driver.idValue,
          idField: Driver.idField,
        },
      });
    }, {});

    // Create models
    this.createModels();

    // Create model indexes
    this.models.forEach((model) => {
      if (model.isEntity()) {
        const alias = model.getAlias();
        const indexes = model.getIndexes();
        const driver = model.getDriver();

        // Create collections (mongo)
        if (driver.createCollection) driver.createCollection(alias);

        // Create indexes
        driver.createIndexes(alias, indexes);
      }
    });
  }

  createModels() {
    this.models = super.getModels().map(model => new Model(this, model, this.drivers[model.getDriverName()]));
    this.models.forEach(model => model.referentialIntegrity(identifyOnDeletes(this.models, model)));
  }

  getSchema() {
    this.extend(frameworkExt(this));
    return super.getSchema();
  }

  loadDir(dir) {
    super.loadDir(dir);
    this.createModels();
    return this;
  }

  extend(...schemas) {
    super.extend(...schemas);
    this.createModels();
    return this;
  }

  getServerApiSchema() {
    this.extend(frameworkExt(this), typeExt(this));
    this.extend(apiExt(this));
    return super.getSchema();
  }

  makeServerApiSchema() {
    this.extend(frameworkExt(this), typeExt(this));
    this.extend(apiExt(this));
    return super.makeExecutableSchema();
  }
};
