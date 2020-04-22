const { uniqWith } = require('lodash');
const Model = require('../data/Model');
const Drivers = require('../driver');
const Schema = require('../graphql/Schema');

// Export class
module.exports = class {
  constructor(schema, stores, driverArgs = {}) {
    // Create schema
    this.schema = new Schema(schema);

    // Create drivers
    const drivers = Object.entries(stores).reduce((prev, [key, { type, uri, options }]) => {
      const Driver = Drivers.require(type);

      return Object.assign(prev, {
        [key]: {
          dao: new Driver(uri, this, options, driverArgs[type]),
          idValue: Driver.idValue,
          idField: Driver.idField,
        },
      });
    }, {});

    // Create models
    this.models = Object.values(this.schema.getModels()).map(model => new Model(this, model, drivers));

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

        // Assign model referential integrity
        return uniqWith(prev, (a, b) => `${a.model}:${a.field}:${a.fieldRef}:${a.op}` === `${b.model}:${b.field}:${b.fieldRef}:${b.op}`);
      }, []);
    };

    this.models.forEach(model => model.referentialIntegrity(identifyOnDeletes(model)));
  }

  getModel(name) {
    return this.models.find(model => model.getName() === name || model.getAlias() === name);
  }

  getModels() {
    return this.models;
  }

  getVisibleModels() {
    return this.models.filter(model => model.isVisible());
  }
};
