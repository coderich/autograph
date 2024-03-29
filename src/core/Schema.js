const Model = require('../data/Model');
const Schema = require('../graphql/ast/Schema');
const { identifyOnDeletes } = require('../service/schema.service');
const { eventEmitter } = require('../service/event.service');

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
  }

  setup() {
    return eventEmitter.emit('setup', this).then(() => {
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

  disconnect() {
    return Promise.all(Object.values(this.drivers).map(({ dao }) => dao.disconnect()));
  }

  initialize() {
    super.initialize();
    this.models = super.getModels().map(model => new Model(this, model, this.drivers[model.getDriverName()]));
    return this;
  }

  finalize() {
    super.finalize();
    this.models.forEach(model => model.referentialIntegrity(identifyOnDeletes(this.models, model)));
    return this;
  }
};
