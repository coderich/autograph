const ServerResolver = require('../../core/ServerResolver');
const { ucFirst, fromGUID } = require('../../service/app.service');
const { findGQLModels } = require('../../service/schema.service');
const { makeCreateAPI, makeReadAPI, makeUpdateAPI, makeDeleteAPI, makeInputSplice, makeQueryResolver, makeMutationResolver } = require('../../service/decorator.service');

const getGQLWhereFields = (model) => {
  return model.getFields().filter((field) => {
    if (!field.hasGQLScope('r')) return false;
    const modelRef = field.getModelRef();
    if (modelRef && !modelRef.isEmbedded() && !modelRef.isEntity()) return false;
    return true;
  });
};

module.exports = (schema) => {
  const resolver = new ServerResolver();
  const allModels = schema.getModels();
  const markedModels = schema.getMarkedModels();
  const createModels = findGQLModels('c', markedModels, allModels);
  const updateModels = findGQLModels('u', markedModels, allModels);
  const readModels = findGQLModels('r', markedModels, allModels);

  return ({
    typeDefs: [
      ...createModels.map(model => `
        input ${model.getName()}InputCreate {
          ${model.getFields().filter(field => field.hasGQLScope('c')).map(field => `${field.getName()}: ${field.getGQLType('InputCreate')}`)}
        }
      `),

      ...updateModels.map(model => `
        input ${model.getName()}InputUpdate {
          ${model.getFields().filter(field => field.hasGQLScope('u')).map(field => `${field.getName()}: ${field.getGQLType('InputUpdate')}`)}
        }
        # ${makeInputSplice(model)}
      `),

      ...readModels.map(model => `
        input ${model.getName()}InputWhere {
          ${getGQLWhereFields(model).map(field => `${field.getName()}: ${field.getModelRef() ? `${ucFirst(field.getDataRef())}InputWhere` : 'AutoGraphMixed'}`)}
        }
        input ${model.getName()}InputSort {
          ${getGQLWhereFields(model).map(field => `${field.getName()}: ${field.getModelRef() ? `${ucFirst(field.getDataRef())}InputSort` : 'SortOrderEnum'}`)}
        }
      `),
    ].concat([
      `
        type Connection {
          edges: [Edge]
          pageInfo: PageInfo!
        }

        type Edge {
          node: Node
          cursor: String!
        }

        type PageInfo {
          startCursor: String!
          endCursor: String!
          hasPreviousPage: Boolean!
          hasNextPage: Boolean!
          totalCount: Int!
        }

        interface Node {
          id: ID!
        }
      `,

      `type Query {
        node(id: ID!): Node
        ${schema.getEntityModels().map(model => makeReadAPI(model.getName(), model))}
      }`,

      `type Mutation {
        _noop: String
        ${schema.getEntityModels().map(model => makeCreateAPI(model.getName(), model))}
        ${schema.getEntityModels().map(model => makeUpdateAPI(model.getName(), model))}
        ${schema.getEntityModels().map(model => makeDeleteAPI(model.getName(), model))}
      }`,
    ]),
    resolvers: schema.getMarkedModels().reduce((prev, model) => {
      const modelName = model.getName();

      return Object.assign(prev, {
        [modelName]: model.getFields().filter(field => field.hasGQLScope('r')).reduce((def, field) => {
          const fieldName = field.getName();
          const $fieldName = field.getModelRef() ? `$${fieldName}` : fieldName; // only $hydrated when it's a modelRef
          if (fieldName === 'id') return Object.assign(def, { id: (root, args, { autograph }) => (autograph.legacyMode ? root.id : root.$id) });
          return Object.assign(def, { [fieldName]: root => root[$fieldName] });
        }, {}),
      });
    }, {
      Node: {
        __resolveType: (root, args, context, info) => fromGUID(root.$id)[0],
      },

      Connection: {
        edges: root => root.map(node => ({ cursor: node.$$cursor, node })),
        pageInfo: root => root.$$pageInfo,
      },

      Query: schema.getEntityModels().reduce((prev, model) => {
        return Object.assign(prev, makeQueryResolver(model.getName(), model, resolver));
      }, {
        node: (root, args, context, info) => {
          const { id } = args;
          const [modelName] = fromGUID(id);
          const model = schema.getModel(modelName);
          return resolver.get(context, model, args, false, info);
        },
      }),

      Mutation: schema.getEntityModels().reduce((prev, model) => {
        return Object.assign(prev, makeMutationResolver(model.getName(), model, resolver));
      }, {}),
    }),
  });
};
