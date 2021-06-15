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
      enum AutoGraphValueScopeEnum { self context }
      enum AutoGraphOnDeleteEnum { cascade nullify restrict }
      enum AutoGraphIndexEnum { unique }

      directive @model(
        key: String # Specify it's key during transit
        gqlScope: AutoGraphMixed # Dictate how GraphQL API behaves
        dalScope: AutoGraphMixed # Dictate how the DAL behaves
        fieldScope: AutoGraphMixed # Dictate how a FIELD may use me
        meta: AutoGraphMixed # Custom input 'meta' field for mutations
        embed: Boolean # Mark this an embedded model (default false)
        persist: Boolean # Persist this model (default true)
        driver: AutoGraphDriver # External data driver
        authz: AutoGraphAuthzEnum # Access level used for authorization (default: private)
        namespace: String # Logical grouping of models that can be globbed (useful for authz)

        # Override auto-gen
        id: String
        createdAt: String
        updatedAt: String
      ) on OBJECT | INTERFACE

      directive @field(
        key: String # Specify it's key during transit
        ref: AutoGraphMixed # Specify the modelRef field's name (overrides isEmbedded)
        gqlScope: AutoGraphMixed # Dictate how GraphQL API behaves
        dalScope: AutoGraphMixed # Dictate how the DAL behaves
        fieldScope: AutoGraphMixed # Dictate how a FIELD may use me
        persist: Boolean # Persist this field (default true)
        default: AutoGraphMixed # Define a default value
        embedApi: Boolean # Should we also create an embedded API from this (default false)
        connection: Boolean # Treat this field as a connection type (default false - rolling this out slowly)

        noRepeat: Boolean

        authz: AutoGraphAuthzEnum # Access level used for authorization (default: private)
        onDelete: AutoGraphOnDeleteEnum

        enforce: [AutoGraphEnforceEnum!] #
        resolve: [AutoGraphTransformEnum!] # Transforms when resolving
        transform: [AutoGraphTransformEnum!] # Transforms when serialize + deserialize
        serialize: [AutoGraphTransformEnum!] # Transforms when serialize
        deserialize: [AutoGraphTransformEnum!] # Transforms when deserialize
      ) on FIELD_DEFINITION | INPUT_FIELD_DEFINITION | SCALAR

      directive @link(
        to: AutoGraphMixed  # The MODEL to link to (default's to modelRef)
        by: AutoGraphMixed! # The FIELD to match yourself by
        use: AutoGraphMixed # The VALUE to use (default's to @link'd value); useful for many-to-many relationships
      ) on FIELD_DEFINITION

      directive @value(
        path: String! # The path to the data
        # merge: Boolean # Deep merge the data? (default false - overwrite) [does not even look supported at the moment]
        passive: Boolean # If value exists leave it alone (default false)
        scope: AutoGraphValueScopeEnum # Where to look for the data (default self)
      ) on OBJECT | FIELD_DEFINITION | INPUT_FIELD_DEFINITION | SCALAR

      directive @index(
        name: String
        on: [AutoGraphMixed!]!
        type: AutoGraphIndexEnum!
      ) repeatable on OBJECT
    `,
  };
};
