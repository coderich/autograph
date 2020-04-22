// https://hasura.io/blog/the-ultimate-guide-to-schema-stitching-in-graphql-f30178ac0072/#d677
const { SchemaDirectiveVisitor, makeExecutableSchema } = require('graphql-tools');

class SchemaDirective extends SchemaDirectiveVisitor {
  visitFieldDefinition() {} // eslint-disable-line
  visitObject() {} // eslint-disable-line
}

exports.makeExecutableSchema = (schema, rules, transformers, directives) => {
  // Ensure schema
  schema.typeDefs = schema.typeDefs || [];
  schema.typeDefs = Array.isArray(schema.typeDefs) ? schema.typeDefs : [schema.typeDefs];
  schema.schemaDirectives = Object.assign(schema.schemaDirectives || {}, { model: SchemaDirective, field: SchemaDirective });

  // Merge schema
  schema.typeDefs.push(`
    enum AutoGraphEnforceEnum { ${rules.map(({ name }) => name).join(' ')} }
    enum AutoGraphTransformEnum  { ${transformers.map(({ name }) => name).join(' ')} }
    enum AutoGraphOnDeleteEnum { cascade nullify restrict }
    enum AutoGraphIndexEnum { unique }
    input AutoGraphIndexInput { name: String type: AutoGraphIndexEnum! on: [String!]! }

    directive @model(
      id: String
      alias: String
      driver: String
      namespace: String
      indexes: [AutoGraphIndexInput!]
    ) on OBJECT

    directive @field(
      ${directives.join('\n\t    ')}
      alias: String
      norepeat: Boolean
      materializeBy: String
      onDelete: AutoGraphOnDeleteEnum
      enforce: [AutoGraphEnforceEnum!]
      transform: [AutoGraphTransformEnum!]
    ) on FIELD_DEFINITION
  `);

  return makeExecutableSchema(schema);
};
