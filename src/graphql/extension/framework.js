const Rule = require('../../core/Rule');
const Transformer = require('../../core/Transformer');

module.exports = schema => ({
  typeDefs: `
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
  `,
});
