// https://hasura.io/blog/the-ultimate-guide-to-schema-stitching-in-graphql-f30178ac0072/#d677

const { uniqWith } = require('lodash');
const { GraphQLObjectType } = require('graphql');
const { SchemaDirectiveVisitor, makeExecutableSchema, mergeSchemas } = require('graphql-tools');
// const Model = require('../graphql/Model');

class SchemaDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition() {} // eslint-disable-line
  visitObject() {} // eslint-disable-line
}

exports.makeExecutableSchema = (gqlSchema, rules, transformers, directives) => {
  // Ensure schema
  gqlSchema.typeDefs = gqlSchema.typeDefs || [];
  gqlSchema.typeDefs = Array.isArray(gqlSchema.typeDefs) ? gqlSchema.typeDefs : [gqlSchema.typeDefs];
  gqlSchema.schemaDirectives = Object.assign(gqlSchema.schemaDirectives || {}, { model: SchemaDirective, field: SchemaDirective });

  // Merge schema
  gqlSchema.typeDefs.push(`
    enum AutoGraphEnforceEnum { ${Object.keys(rules).join(' ')} }
    enum AutoGraphTransformEnum  { ${Object.keys(transformers).join(' ')} }
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
      ${directives.join('\n\t    ')}
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
  return exports.extendSchemaDataTypes(makeExecutableSchema(gqlSchema));
};

exports.extendSchemaDataTypes = (schema) => {
  const extSchema = `${Object.entries(exports.getSchemaDataTypes(schema)).map(([key, value]) => {
    // const model = new Model(this, value);
    // const createdAt = model.getDirectiveArg('model', 'createdAt', 'createdAt');
    // const updatedAt = model.getDirectiveArg('model', 'updatedAt', 'updatedAt');
    const createdAt = 'createdAt';
    const updatedAt = 'updatedAt';

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
};

exports.getSchemaDataTypes = (schema) => {
  return Object.entries(schema.getTypeMap()).reduce((prev, [key, value]) => {
    if (!key.startsWith('__') && value instanceof GraphQLObjectType) Object.assign(prev, { [key]: value });
    return prev;
  }, {});
};


exports.identifyOnDeletes = (models, parentModel) => {
  return models.reduce((prev, model) => {
    model.getOnDeleteFields().forEach((field) => {
      if (`${field.getModelRef()}` === `${parentModel}`) {
        if (model.isVisible()) {
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
