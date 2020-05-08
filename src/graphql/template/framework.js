const Rule = require('../../core/Rule');
const Transformer = require('../../core/Transformer');

module.exports = schema => `
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

  ${schema.getEntityModels().map((model) => {
    const createdAt = model.getDirectiveArg('model', 'createdAt', 'createdAt');
    const updatedAt = model.getDirectiveArg('model', 'updatedAt', 'updatedAt');

    return `
      type ${model.getName()} {
        id: ID @field(scope: private)
        ${createdAt ? `createdAt: Int @field(alias: "${createdAt}", scope: private)` : ''}
        ${updatedAt ? `updatedAt: Int @field(alias: "${updatedAt}", scope: private)` : ''}
      }
    `;
  })}
`;
