const Rule = require('../../core/Rule');
const Transformer = require('../../core/Transformer');

module.exports = schema => ({
  typeDefs: `
    scalar AutoGraphMixed
    enum AutoGraphEnforceEnum { ${Object.keys(Rule.getInstances()).join(' ')} }
    enum AutoGraphTransformEnum  { ${Object.keys(Transformer.getInstances()).join(' ')} }
    enum AutoGraphScopeEnum { private protected public user }
    enum AutoGraphOnDeleteEnum { cascade nullify restrict }
    enum AutoGraphIndexEnum { unique }

    input AutoGraphMetaInput {
      input: AutoGraphMixed!
      required: Boolean
    }

    directive @model(
      id: String
      alias: String
      meta: AutoGraphMetaInput
      scope: AutoGraphScopeEnum
      driver: String
      namespace: String
      createdAt: String
      updatedAt: String
    ) on OBJECT

    directive @field(
      alias: String
      default: AutoGraphMixed
      segment: String
      scope: AutoGraphScopeEnum
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
