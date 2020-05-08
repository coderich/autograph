const Model = require('../data/Model');
const Drivers = require('../driver');
const Schema = require('../graphql/ast/Schema');
const apiExt = require('../graphql/extension/api');
const frameworkExt = require('../graphql/extension/framework');
const { identifyOnDeletes } = require('../service/schema.service');

// Export class
module.exports = class extends Schema {
  constructor(schema, stores) {
    super(schema);

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
    this.models = super.getModels().map(model => new Model(this, model, drivers));
    this.models.forEach(model => model.referentialIntegrity(identifyOnDeletes(this.models, model)));
  }

  getVisibleModels() {
    return this.models.filter(model => model.isVisible());
  }

  makeExecutableSchema() {
    this.extend(frameworkExt(this));
    return super.makeExecutableSchema();
  }

  makeServerApiSchema() {
    this.extend(frameworkExt(this), apiExt(this));
    return super.makeExecutableSchema();
  }
};
