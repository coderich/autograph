const Model = require('../data/Model');
const Drivers = require('../driver');
const Schema = require('../graphql/ast/Schema');
const { identifyOnDeletes } = require('../service/schema.service');

// Export class
module.exports = class extends Schema {
  constructor(gqlSchema, stores) {
    super(gqlSchema);

    // Create drivers
    const drivers = Object.entries(stores).reduce((prev, [key, { type, uri, options }]) => {
      const Driver = Drivers.require(type);

      return Object.assign(prev, {
        [key]: {
          dao: new Driver(uri, this, options),
          idValue: Driver.idValue,
          idField: Driver.idField,
        },
      });
    }, {});

    // Create models
    this.gqlSchema = gqlSchema;
    this.models = super.getModels().map(model => new Model(this, model, drivers));
    this.models.forEach(model => model.referentialIntegrity(identifyOnDeletes(this.models, model)));
  }

  getVisibleModels() {
    return this.models.filter(model => model.isVisible());
  }

  getEntityModels() {
    return this.getModels().filter(model => model.isEntity());
  }
};
