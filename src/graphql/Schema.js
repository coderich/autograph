// https://hasura.io/blog/the-ultimate-guide-to-schema-stitching-in-graphql-f30178ac0072/#d677
const { GraphQLObjectType } = require('graphql');
const { SchemaDirectiveVisitor, makeExecutableSchema, mergeSchemas } = require('graphql-tools');
const Transformer = require('../core/Transformer');
const Rule = require('../core/Rule');
const Model = require('./Model');

const instances = {};
const customDirectives = [];

const getSchemaDataTypes = (schema) => {
  return Object.entries(schema.getTypeMap()).reduce((prev, [key, value]) => {
    if (!key.startsWith('__') && value instanceof GraphQLObjectType) Object.assign(prev, { [key]: value });
    return prev;
  }, {});
};

class SchemaDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition() {} // eslint-disable-line
  visitObject() {} // eslint-disable-line
}

module.exports = class Schema {
  constructor(gqlSchema) {
    // Identify instances
    const defaultTransformers = Object.entries(Transformer).map(([name, method]) => ({ name, instance: method() })); // Create default instances
    const defaultRules = Object.entries(Rule).map(([name, method]) => ({ name, instance: method() })); // Create default instances
    const customInstances = Object.entries(instances).map(([name, instance]) => ({ name, instance }));
    const customRules = customInstances.filter(({ instance }) => instance.type === 'rule');
    const customTransformers = customInstances.filter(({ instance }) => instance.type === 'transformer');
    const rules = defaultRules.concat(customRules);
    const transformers = defaultTransformers.concat(customTransformers);

    // Prepare
    this.rules = rules.reduce((prev, { name, instance }) => Object.assign(prev, { [name]: instance }), {});
    this.transformers = transformers.reduce((prev, { name, instance }) => Object.assign(prev, { [name]: instance }), {});
    this.schema = this.makeExecutableSchema(gqlSchema);
    this.models = Object.entries(getSchemaDataTypes(this.schema)).reduce((prev, [key, value]) => Object.assign(prev, { [key]: new Model(this, value) }), {});
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

  makeExecutableSchema(gqlSchema) {
    // Ensure schema
    gqlSchema.typeDefs = gqlSchema.typeDefs || [];
    gqlSchema.typeDefs = Array.isArray(gqlSchema.typeDefs) ? gqlSchema.typeDefs : [gqlSchema.typeDefs];
    gqlSchema.schemaDirectives = Object.assign(gqlSchema.schemaDirectives || {}, { model: SchemaDirective, field: SchemaDirective });

    // Merge schema
    gqlSchema.typeDefs.push(`
      enum AutoGraphEnforceEnum { ${Object.keys(this.rules).join(' ')} }
      enum AutoGraphTransformEnum  { ${Object.keys(this.transformers).join(' ')} }
      enum AutoGraphOnDeleteEnum { cascade nullify restrict }
      enum AutoGraphIndexEnum { unique }
      input AutoGraphIndexInput { name: String type: AutoGraphIndexEnum! on: [String!]! }

      directive @model(
        id: String
        alias: String
        driver: String
        namespace: String
        createdAt: String
        updatedAt: String
        indexes: [AutoGraphIndexInput!]
      ) on OBJECT

      directive @field(
        ${customDirectives.join('\n\t    ')}
        alias: String
        norepeat: Boolean
        implicit: Boolean
        materializeBy: String
        onDelete: AutoGraphOnDeleteEnum
        enforce: [AutoGraphEnforceEnum!]
        transform: [AutoGraphTransformEnum!]
      ) on FIELD_DEFINITION
    `);

    // Make executable schema
    return this.extendSchemaDataTypes(makeExecutableSchema(gqlSchema));
  }

  extendSchemaDataTypes(schema) {
    const extSchema = `${Object.entries(getSchemaDataTypes(schema)).map(([key, value]) => {
      const model = new Model(this, value);
      const createdAt = model.getDirectiveArg('model', 'createdAt', 'createdAt');
      const updatedAt = model.getDirectiveArg('model', 'updatedAt', 'updatedAt');

      return `
        extend type ${key} {
          id: ID @field(implicit: true)
          ${createdAt ? `createdAt: Int @field(alias: "${createdAt}", implicit: true)` : ''}
          ${updatedAt ? `updatedAt: Int @field(alias: "${updatedAt}", implicit: true)` : ''}
        }
      `;
    })}`;

    // const resolvers = {
    //   DateTime: {
    //     __parseValue(value) { // gets invoked to parse client input that was passed through variables.
    //       return new Date(value);
    //     },
    //     __serialize(date) { // gets invoked when serializing the result to send it back to a client.
    //       if (typeof date === 'object') return date.toISOString();
    //       return new Date(date).toISOString();
    //     },
    //     __parseLiteral(ast) { // gets invoked to parse client input that was passed inline in the query. (ast.value always a string)
    //       return new Date(ast.value);
    //     },
    //   },
    // };

    return mergeSchemas({ schemas: [schema, extSchema], mergeDirectives: true });
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
