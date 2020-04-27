const Model = require('./Model');
const Rule = require('../core/Rule');
const Transformer = require('../core/Transformer');
const { makeExecutableSchema, getSchemaDataTypes } = require('../service/schema.service');

const instances = {};
const customDirectives = [];

module.exports = class Schema {
  constructor(gqlSchema) {
    // Identify rule/transformer instances
    const defaultTransformers = Object.entries(Transformer).map(([name, method]) => ({ name, instance: method() })); // Create default instances
    const customInstances = Object.entries(instances).map(([name, instance]) => ({ name, instance }));
    const customTransformers = customInstances.filter(({ instance }) => instance.type === 'transformer');
    const transformers = defaultTransformers.concat(customTransformers);

    // Create instance variables
    this.transformers = transformers.reduce((prev, { name, instance }) => Object.assign(prev, { [name]: instance }), {});
    this.schema = makeExecutableSchema(gqlSchema, this.transformers, customDirectives);
    this.models = Object.values(getSchemaDataTypes(this.schema)).map(value => new Model(this, value));
  }

  getModels() {
    return this.models;
  }

  getModel(name) {
    return this.models.find(model => model.getName() === name || model.getAlias() === name);
  }

  getVisibleModels() {
    return this.models.filter(model => model.isVisible());
  }

  getRules() {
    return Rule.getRules();
  }

  getTransformers() {
    return this.transformers;
  }

  getExecutableSchema() {
    return this.schema;
  }

  /**
   * Extend the schema with a custom Rule or Transformer instance
   */
  static extend(name, instance) {
    const invalidArg = () => { throw new Error('Invalid argument; expected Rule|Transformer factory instance'); };
    const { method = invalidArg(), type = invalidArg() } = instance;
    const factoryMethod = (type === 'rule' ? Rule[method] : Transformer[method]);
    if (!factoryMethod) invalidArg();
    return (instances[name] = instance);
  }

  /**
   * Extend the schema with a custom directive
   */
  static custom(def) {
    customDirectives.push(def);
  }
};
