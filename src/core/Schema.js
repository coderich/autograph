const esm = require('esm')(module);
const { uniqWith } = require('lodash');
const isEmail = require('validator/lib/isEmail');
const Model = require('../data/Model');
const Drivers = require('../driver');

// Configure Quin
const { Quin, Rule } = esm('@coderich/quin');

// Adding new rules
Rule.factory('email', () => (f, v) => !isEmail(v));
Rule.factory('selfless', () => (f, v) => false);
Rule.factory('immutable', () => (f, v) => false);
Rule.factory('distinct', () => (f, v) => false);

// Adding Rules/Transformers
Quin.extend('email', Rule.email());
Quin.extend('selfless', Rule.selfless());
Quin.extend('immutable', Rule.immutable());
Quin.extend('distinct', Rule.distinct());

// Adding custom keys
Quin.custom('driver: String');
Quin.custom('norepeat: Boolean');
Quin.custom('onDelete: AutoGraphOnDeleteEnum');
Quin.custom('indexes: [AutoGraphIndexInput!]');


// Export class
module.exports = class Schema {
  constructor(schema, stores, driverArgs = {}) {
    // Ensure schema
    schema.typeDefs = schema.typeDefs || [];
    schema.typeDefs = Array.isArray(schema.typeDefs) ? schema.typeDefs : [schema.typeDefs];
    schema.typeDefs.push(`
      enum AutoGraphIndexEnum { unique }
      enum AutoGraphOnDeleteEnum { cascade nullify restrict }
      input AutoGraphIndexInput { name: String type: AutoGraphIndexEnum! on: [String!]! }
    `);

    this.schema = new Quin(schema);

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
