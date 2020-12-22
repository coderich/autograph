const Model = require('../data/Model');
const Schema = require('../graphql/ast/Schema');
const apiExt = require('../graphql/extension/api');
const typeExt = require('../graphql/extension/type');
const frameworkExt = require('../graphql/extension/framework');
const { identifyOnDeletes } = require('../service/schema.service');
const { createSystemEvent } = require('../service/event.service');

// Export class
module.exports = class extends Schema {
  constructor(schema, stores) {
    super(schema);

    // Create drivers
    this.drivers = Object.entries(stores).reduce((prev, [key, value]) => {
      const { Driver } = value;

      return Object.assign(prev, {
        [key]: {
          dao: new Driver(value, this),
          idKey: Driver.idKey,
          idValue: Driver.idValue,
        },
      });
    }, {});

    // Create models
    this.createModels();
  }

  setup() {
    return createSystemEvent('Setup', this, () => {
      const entities = this.models.filter(m => m.isEntity());

      // Create model indexes
      return Promise.all(entities.map(async (model) => {
        const key = model.getKey();
        const indexes = model.getIndexes();
        const driver = model.getDriver();
        if (driver.createCollection) await driver.createCollection(key);
        return driver.createIndexes(key, indexes);
      }));
    });
  }

  createModels() {
    this.models = super.getModels().map(model => new Model(this, model, this.drivers[model.getDriverName()]));
    this.models.forEach(model => model.referentialIntegrity(identifyOnDeletes(this.models, model)));
    this.modelsByName = this.models.reduce((prev, model) => Object.assign(prev, { [model.getName()]: model }), {});
    this.modelsByKey = this.models.reduce((prev, model) => Object.assign(prev, { [model.getKey()]: model }), {});
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

  setContext(context) {
    this.context = context;
  }

  getContext() {
    return this.context;
  }

  /**
   * Called a runtime to get the full server api schema. Done this way because the
   * end-user needs a chance to call Transformer.factory() etc (thus cannot be moved to constructor)
   */
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
