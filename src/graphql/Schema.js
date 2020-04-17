const { GraphQLObjectType } = require('graphql');
const { SchemaDirectiveVisitor, makeExecutableSchema } = require('graphql-tools');
const Transformer = require('./Transformer');
const Rule = require('./Rule');
const Model = require('./Model');

const instances = {};
const customDirectives = [];

class SchemaDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition(field, details) { // eslint-disable-line
  }
  visitObject(type) { // eslint-disable-line
  }
}

module.exports = class Schema {
  constructor(schema) {
    // Identify instances
    const defaultTransformers = Object.entries(Transformer).map(([name, method]) => ({ name, instance: method() })); // Create default instances
    const defaultRules = Object.entries(Rule).map(([name, method]) => ({ name, instance: method() })); // Create default instances
    const customInstances = Object.entries(instances).map(([name, instance]) => ({ name, instance }));
    const customRules = customInstances.filter(({ instance }) => instance.type === 'rule');
    const customTransformers = customInstances.filter(({ instance }) => instance.type === 'transformer');
    const rules = defaultRules.concat(customRules);
    const transformers = defaultTransformers.concat(customTransformers);

    // Ensure schema
    schema.typeDefs = schema.typeDefs || [];
    schema.schemaDirectives = Object.assign(schema.schemaDirectives || {}, { model: SchemaDirective, field: SchemaDirective });
    schema.typeDefs = Array.isArray(schema.typeDefs) ? schema.typeDefs : [schema.typeDefs];

    // Merge schema
    schema.typeDefs.push(`
      enum AutoGraphEnforceEnum { ${rules.map(({ name }) => name).join(' ')} }
      enum AutoGraphTransformEnum  { ${transformers.map(({ name }) => name).join(' ')} }
      enum AutoGraphOnDeleteEnum { cascade nullify restrict }
      enum AutoGraphIndexEnum { unique }
      input AutoGraphIndexInput { name: String type: AutoGraphIndexEnum! on: [String!]! }

      directive @model(
        alias: String
        driver: String
        namespace: String
        indexes: [AutoGraphIndexInput!]
      ) on OBJECT

      directive @field(
        ${customDirectives.join('\n\t    ')}
        alias: String
        norepeat: Boolean
        materializeBy: String
        onDelete: AutoGraphOnDeleteEnum
        enforce: [AutoGraphEnforceEnum!]
        transform: [AutoGraphTransformEnum!]
      ) on FIELD_DEFINITION
    `);

    // Prepare
    this.toString = () => schema;
    this.schema = makeExecutableSchema(schema);
    this.rules = rules.reduce((prev, { name, instance }) => Object.assign(prev, { [name]: instance }), {});
    this.transformers = transformers.reduce((prev, { name, instance }) => Object.assign(prev, { [name]: instance }), {});
    this.models = Object.entries(this.schema.getTypeMap()).reduce((prev, [key, value]) => {
      if (!key.startsWith('__') && value instanceof GraphQLObjectType) Object.assign(prev, { [key]: new Model(this, value) });
      return prev;
    }, {});
  }

  getModels() {
    return this.models;
  }

  getModel(name) {
    return this.models[name];
  }

  getRules() {
    return this.rules;
  }

  getTransformers() {
    return this.transformers;
  }

  getExecutableSchema() {
    return this.schema;
  }

  static extend(name, instance) {
    const invalidArg = () => { throw new Error('Invalid argument; expected Rule|Transformer factory instance'); };
    const { method = invalidArg(), type = invalidArg() } = instance;
    const factoryMethod = (type === 'rule' ? Rule[method] : Transformer[method]);
    if (!factoryMethod) invalidArg();
    return (instances[name] = instance);
  }

  static custom(def) {
    customDirectives.push(def);
  }
};
