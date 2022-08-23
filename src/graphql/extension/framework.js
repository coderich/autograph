const Pipeline = require('../../data/Pipeline');

Pipeline.createPresets();

module.exports = (schema) => {
  return {
    typeDefs: `
      scalar AutoGraphMixed
      scalar AutoGraphDriver
      scalar AutoGraphDateTime @field(transform: toDate)
      enum AutoGraphPipelineEnum { ${Object.keys(Pipeline).join(' ')} }
      enum AutoGraphAuthzEnum { private protected public }
      enum AutoGraphOnDeleteEnum { cascade nullify restrict defer }
      enum AutoGraphIndexEnum { unique }

      directive @model(
        id: String # Specify db key (default "id")
        key: String # Specify db table/collection name
        createdAt: String # Specify db key (default "createdAt")
        updatedAt: String # Specify db key (default "updatedAt")
        meta: AutoGraphMixed # Custom input "meta" field for mutations
        embed: Boolean # Mark this an embedded model (default false)
        persist: Boolean # Persist this model (default true)
        gqlScope: AutoGraphMixed # Dictate how GraphQL API behaves
        dalScope: AutoGraphMixed # Dictate how the DAL behaves
        fieldScope: AutoGraphMixed # Dictate how a FIELD may use me
        driver: AutoGraphDriver # External data driver
        authz: AutoGraphAuthzEnum # Access level used for authorization (default: private)
        namespace: String # Logical grouping of models that can be globbed (useful for authz)
      ) on OBJECT | INTERFACE

      directive @field(
        id: String # Specify the ModelRef this field FK References
        ref: AutoGraphMixed # Specify the modelRef field's name (overrides isEmbedded)
        key: String # Specify db key
        persist: Boolean # Persist this field (default true)
        connection: Boolean # Treat this field as a connection type (default false - rolling this out slowly)
        default: AutoGraphMixed # Define a default value
        gqlScope: AutoGraphMixed # Dictate how GraphQL API behaves
        dalScope: AutoGraphMixed # Dictate how the DAL behaves
        fieldScope: AutoGraphMixed # Dictate how a FIELD may use me
        onDelete: AutoGraphOnDeleteEnum # onDelete behavior

        authz: AutoGraphAuthzEnum # Access level used for authorization (default: private)

        # Pipeline Structure
        validate: [AutoGraphPipelineEnum!]
        instruct: [AutoGraphPipelineEnum!]
        restruct: [AutoGraphPipelineEnum!]
        destruct: [AutoGraphPipelineEnum!]
        construct: [AutoGraphPipelineEnum!]
        transform: [AutoGraphPipelineEnum!]
        normalize: [AutoGraphPipelineEnum!]
        serialize: [AutoGraphPipelineEnum!]
        deserialize: [AutoGraphPipelineEnum!]
      ) on FIELD_DEFINITION | INPUT_FIELD_DEFINITION | SCALAR

      directive @link(
        to: AutoGraphMixed  # The MODEL to link to (default's to modelRef)
        by: AutoGraphMixed! # The FIELD to match yourself by
        use: AutoGraphMixed # The VALUE to use (default's to @link'd value); useful for many-to-many relationships
      ) on FIELD_DEFINITION

      directive @index(
        name: String
        on: [AutoGraphMixed!]!
        type: AutoGraphIndexEnum!
      ) repeatable on OBJECT
    `,
  };
};
