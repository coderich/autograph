const Rule = require('../../core/Rule');
const Transformer = require('../../core/Transformer');

module.exports = schema => ({
  typeDefs: `
    scalar AutoGraphMixed
    scalar AutoGraphDriver
    scalar AutoGraphDateTime
    enum AutoGraphEnforceEnum { ${Object.keys(Rule.getInstances()).join(' ')} }
    enum AutoGraphTransformEnum  { ${Object.keys(Transformer.getInstances()).join(' ')} }
    enum AutoGraphAuthzEnum { private protected public }
    enum AutoGraphScopeEnum { default query mutation resolver context none }
    enum AutoGraphOnDeleteEnum { cascade nullify restrict }
    enum AutoGraphIndexEnum { unique }

    directive @model(
      id: String
      alias: String # Database collection name
      authz: AutoGraphAuthzEnum # Define authz rules for all fields (can be overwritten at field level)
      scope: AutoGraphScopeEnum # Define scope for all fields (can be overwritten at field level)
      meta: String # Custom input definition used for meta
      driver: AutoGraphDriver
      namespace: String
      createdAt: String
      updatedAt: String
    ) on OBJECT

    directive @field(
      alias: String # Database field name
      authz: AutoGraphAuthzEnum # Access level used for authorization (default: private)
      scope: AutoGraphScopeEnum # Determines where in the API the field should be used
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

  resolvers: {
    AutoGraphDateTime: {
      __parseValue(value) { // gets invoked to parse client input that was passed through variables.
        return new Date(value);
      },
      __serialize(date) { // gets invoked when serializing the result to send it back to a client.
        if (typeof date === 'object') return date.toISOString();
        return new Date(date).toISOString();
      },
      __parseLiteral(ast) { // gets invoked to parse client input that was passed inline in the query. (ast.value always a string)
        return new Date(ast.value);
      },
    },
  },
});
