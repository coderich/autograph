const Model = require('../data/Model');
const Schema = require('../graphql/ast/Schema');
const { identifyOnDeletes } = require('../service/schema.service');
const { createSystemEvent } = require('../service/event.service');

// Export class
module.exports = class extends Schema {
  constructor(schema, stores, toExecutableSchema) {
    super(schema, toExecutableSchema);

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

  initialize() {
    super.initialize();
    this.models = super.getModels().map(model => new Model(this, model, this.drivers[model.getDriverName()]));
    this.models.forEach(model => model.initialize());
    this.models.forEach(model => model.referentialIntegrity(identifyOnDeletes(this.models, model)));
    return this;
  }
};
