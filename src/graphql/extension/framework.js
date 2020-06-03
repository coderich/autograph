const Rule = require('../../core/Rule');
const Transformer = require('../../core/Transformer');

module.exports = (schema) => {
  return {
    typeDefs: `
      scalar AutoGraphMixed
      scalar AutoGraphDriver
      scalar AutoGraphDateTime @field(transform: toDate)
      enum AutoGraphEnforceEnum { ${Object.keys(Rule.getInstances()).join(' ')} }
      enum AutoGraphTransformEnum  { ${Object.keys(Transformer.getInstances()).join(' ')} }
      enum AutoGraphAuthzEnum { private protected public }
      enum AutoGraphScopeEnum { default query mutation none }
      enum AutoGraphValueScopeEnum { self context segment }
      enum AutoGraphOnDeleteEnum { cascade nullify restrict }
      enum AutoGraphIndexEnum { unique }

      directive @model(
        id: String
        crud: String
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
        enforce: [AutoGraphEnforceEnum!]
        noRepeat: Boolean
        onDelete: AutoGraphOnDeleteEnum
        transform: [AutoGraphTransformEnum!]
        materializeBy: String
      ) on FIELD_DEFINITION | INPUT_FIELD_DEFINITION | SCALAR

      directive @value(
        path: String! # The path to the data
        merge: Boolean # Should it be merged? (overwrite default)
        scope: AutoGraphValueScopeEnum # Where to look for the data (default self)
      ) on FIELD_DEFINITION | INPUT_FIELD_DEFINITION | SCALAR

      directive @index(
        name: String
        on: [String!]!
        type: AutoGraphIndexEnum!
      ) repeatable on OBJECT
    `,
  };
};
