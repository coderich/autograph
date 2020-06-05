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
      enum AutoGraphValueScopeEnum { self context }
      enum AutoGraphOnDeleteEnum { cascade nullify restrict }
      enum AutoGraphIndexEnum { unique }

      directive @model(
        id: String
        key: String # Specify it's key during transit
        crud: String # Dictate what APIs to auto-generate
        meta: String # Custom input 'meta' field for mutations
        scope: AutoGraphScopeEnum # Can be set to 'none' to have no impact on schema
        authz: AutoGraphAuthzEnum # Access level used for authorization (default: private)
        driver: AutoGraphDriver
        namespace: String
        createdAt: String
        updatedAt: String
      ) on OBJECT

      directive @field(
        key: String # Specify it's key during transit
        scope: AutoGraphScopeEnum # Determines if the field is readable|writable or private
        authz: AutoGraphAuthzEnum # Access level used for authorization (default: private)
        default: AutoGraphMixed # Define a default value
        noRepeat: Boolean
        enforce: [AutoGraphEnforceEnum!]
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
        on: [AutoGraphMixed!]!
        type: AutoGraphIndexEnum!
      ) repeatable on OBJECT
    `,
  };
};
