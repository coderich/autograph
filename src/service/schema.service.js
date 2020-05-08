// https://hasura.io/blog/the-ultimate-guide-to-schema-stitching-in-graphql-f30178ac0072/#d677
// https://graphql.org/graphql-js/type/
// https://graphql.org/graphql-js/utilities/

const { uniqWith } = require('lodash');
const { GraphQLScalarType, GraphQLObjectType, GraphQLInterfaceType, GraphQLUnionType, GraphQLEnumType, GraphQLInputObjectType } = require('graphql');
const { SchemaDirectiveVisitor, makeExecutableSchema, mergeSchemas } = require('graphql-tools');
const Rule = require('../core/Rule');
const Transformer = require('../core/Transformer');
// const Model = require('../graphql/Model');

class SchemaDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition() {} // eslint-disable-line
  visitObject() {} // eslint-disable-line
}

exports.makeExecutableSchema = (gqlSchema) => {
  // Ensure schema
  gqlSchema.typeDefs = gqlSchema.typeDefs || [];
  gqlSchema.typeDefs = Array.isArray(gqlSchema.typeDefs) ? gqlSchema.typeDefs : [gqlSchema.typeDefs];
  gqlSchema.resolvers = gqlSchema.resolvers || {};
  gqlSchema.schemaDirectives = Object.assign(gqlSchema.schemaDirectives || {}, { model: SchemaDirective, field: SchemaDirective });

  // Merge schema
  gqlSchema.typeDefs.push(`
    scalar AutoGraphMixed
    enum AutoGraphEnforceEnum { ${Object.keys(Rule.getInstances()).join(' ')} }
    enum AutoGraphTransformEnum  { ${Object.keys(Transformer.getInstances()).join(' ')} }
    enum AutoGraphScopeEnum { private protected public restricted }
    enum AutoGraphOnDeleteEnum { cascade nullify restrict }
    enum AutoGraphIndexEnum { unique }

    input AutoGraphMetaInput {
      input: AutoGraphMixed!
      required: Boolean
    }

    directive @model(
      id: String
      meta: AutoGraphMetaInput
      alias: String
      scope: AutoGraphScopeEnum
      driver: String
      namespace: String
      createdAt: String
      updatedAt: String
    ) on OBJECT

    directive @field(
      alias: String
      scope: AutoGraphScopeEnum
      enforce: [AutoGraphEnforceEnum!]
      noRepeat: Boolean
      onDelete: AutoGraphOnDeleteEnum
      transform: [AutoGraphTransformEnum!]
      materializeBy: String
    ) on FIELD_DEFINITION

    directive @index(
      on: [String!]!
      type: AutoGraphIndexEnum!
      name: String
    ) repeatable on OBJECT
  `);

  // Make executable schema
  return exports.extendSchemaDataTypes(makeExecutableSchema(gqlSchema));
};

exports.extendSchemaDataTypes = (schema) => {
  const extSchema = `${Object.entries(exports.getSchemaData(schema).models).map(([key, value]) => {
    const fieldNames = value.astNode.fields.map(field => field.name.value);
    const hasID = fieldNames.includes('id');
    const hasCreatedAt = fieldNames.includes('createdAt');
    const hasUpdatedAt = fieldNames.includes('updatedAt');
    // const createdAt = model.getDirectiveArg('model', 'createdAt', 'createdAt');
    // const updatedAt = model.getDirectiveArg('model', 'updatedAt', 'updatedAt');
    const createdAt = hasCreatedAt ? null : 'createdAt';
    const updatedAt = hasUpdatedAt ? null : 'updatedAt';

    return `
      extend type ${key} {
        ${hasID ? '' : 'id: ID @field(scope: private)'}
        ${createdAt ? `createdAt: Int @field(alias: "${createdAt}", scope: private)` : ''}
        ${updatedAt ? `updatedAt: Int @field(alias: "${updatedAt}", scope: private)` : ''}
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
};

exports.getSchemaData = (schema) => {
  const operations = ['Query', 'Mutation', 'Subscription'];

  return Object.entries(schema.getTypeMap()).reduce((prev, [key, value]) => {
    let type;

    if (value instanceof GraphQLScalarType) {
      type = 'scalars';
    } else if (value instanceof GraphQLEnumType) {
      type = 'enums';
    } else if (value instanceof GraphQLUnionType) {
      type = 'unions';
    } else if (value instanceof GraphQLInterfaceType) {
      type = 'interfaces';
    } else if (value instanceof GraphQLInputObjectType) {
      type = 'inputs';
    } else if (value instanceof GraphQLObjectType) {
      if (operations.includes(key)) {
        type = 'operations';
      } else {
        type = 'models';
      }
    }

    if (type) {
      if (!key.startsWith('__')) {
        prev[type][key] = value;
      }
    } else {
      console.log(`Unknown schema type { ${key}: ${value} }`);
    }

    return prev;
  }, {
    enums: {},
    models: {},
    inputs: {},
    unions: {},
    scalars: {},
    operations: {},
    directives: {},
    interfaces: {},
    enumerations: {},
  });
};


exports.identifyOnDeletes = (models, parentModel) => {
  return models.reduce((prev, model) => {
    model.getOnDeleteFields().forEach((field) => {
      if (`${field.getModelRef()}` === `${parentModel}`) {
        if (model.isEntity()) {
          prev.push({ model, field, isArray: field.isArray(), op: field.getOnDelete() });
        } else {
          prev.push(...exports.identifyOnDeletes(models, model).map(od => Object.assign(od, { fieldRef: field, isArray: field.isArray(), op: field.getOnDelete() })));
        }
      }
    });

    // Assign model referential integrity
    return uniqWith(prev, (a, b) => `${a.model}:${a.field}:${a.fieldRef}:${a.op}` === `${b.model}:${b.field}:${b.fieldRef}:${b.op}`);
  }, []);
};
