const Rule = require('../../core/Rule');
const Transformer = require('../../core/Transformer');

module.exports = schema => ({
  typeDefs: `
    scalar AutoGraphMixed
    scalar AutoGraphDriver
    enum AutoGraphEnforceEnum { ${Object.keys(Rule.getInstances()).join(' ')} }
    enum AutoGraphTransformEnum  { ${Object.keys(Transformer.getInstances()).join(' ')} }
    enum AutoGraphScopeEnum { private protected public segment }
    enum AutoGraphOnDeleteEnum { cascade nullify restrict }
    enum AutoGraphIndexEnum { unique }

    directive @model(
      id: String
      alias: String # Database collection name
      scope: AutoGraphScopeEnum # Define a scope for all fields (can be overwritten at field level)
      meta: String # Custom input definition used for meta
      driver: AutoGraphDriver
      namespace: String
      createdAt: String
      updatedAt: String
    ) on OBJECT

    directive @field(
      alias: String # Database field name
      scope: AutoGraphScopeEnum # Access level used for authorization (default: protected)
      default: AutoGraphMixed # Define a default value
      segment: String # Define it's value from context.segment (takes precedence over default)
      enforce: [AutoGraphEnforceEnum!]
      noRepeat: Boolean
      onDelete: AutoGraphOnDeleteEnum
      transform: [AutoGraphTransformEnum!]
      materializeBy: String
    ) on FIELD_DEFINITION | INPUT_FIELD_DEFINITION

    directive @index(
      name: String
      on: [String!]!
      type: AutoGraphIndexEnum!
    ) repeatable on OBJECT
  `,
});
