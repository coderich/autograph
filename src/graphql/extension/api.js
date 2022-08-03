const { get } = require('lodash');
const { Kind } = require('graphql');
const ServerResolver = require('../../core/ServerResolver');
const { ucFirst, fromGUID } = require('../../service/app.service');
const { findGQLModels } = require('../../service/schema.service');
const { makeCreateAPI, makeReadAPI, makeUpdateAPI, makeDeleteAPI, makeSubscriptionAPI, makeQueryResolver, makeMutationResolver } = require('../../service/decorator.service');

const interfaceKinds = [Kind.INTERFACE_TYPE_DEFINITION, Kind.INTERFACE_TYPE_EXTENSION];

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
  const entityModels = schema.getEntityModels();
  const markedModels = schema.getMarkedModels();
  const createModels = findGQLModels('c', markedModels, allModels);
  const readModels = findGQLModels('r', markedModels, allModels);
  const updateModels = findGQLModels('u', markedModels, allModels);

  return ({
    typeDefs: [
      ...createModels.map(model => `
        input ${model.getName()}InputCreate {
          ${model.getFields().filter(field => field.hasGQLScope('c') && !field.isVirtual()).map(field => `${field.getName()}: ${field.getGQLType('InputCreate')}`)}
        }
      `),

      ...updateModels.map(model => `
        input ${model.getName()}InputUpdate {
          ${model.getFields().filter(field => field.hasGQLScope('u') && !field.isVirtual()).map(field => `${field.getName()}: ${field.getGQLType('InputUpdate')}`)}
        }
      `),

      ...readModels.map(model => `
        input ${model.getName()}InputWhere {
          ${getGQLWhereFields(model).map(field => `${field.getName()}: ${field.getModelRef() ? `${ucFirst(field.getDataRef())}InputWhere` : 'AutoGraphMixed'}`)}
        }
        input ${model.getName()}InputSort {
          ${getGQLWhereFields(model).map(field => `${field.getName()}: ${field.getModelRef() ? `${ucFirst(field.getDataRef())}InputSort` : 'SortOrderEnum'}`)}
        }
        extend ${interfaceKinds.indexOf(model.getKind()) > -1 ? 'interface' : 'type'} ${model.getName()} {
          ${model.getFields().filter(field => field.hasGQLScope('r')).map(field => `${field.getName()}${field.getExtendArgs()}: ${field.getPayloadType()}`)}
        }
        type ${model.getName()}Connection {
          pageInfo: PageInfo!
          edges: [${model.getName()}Edge]
          count: Int!
        }
        type ${model.getName()}Edge {
          node: ${model.getName()}
          cursor: String!
        }
      `),

      ...entityModels.filter(model => model.hasGQLScope('s')).map(model => `
        input ${model.getName()}SubscriptionInputFilter {
          when: [SubscriptionWhenEnum!]! = [preEvent, postEvent]
          where: ${model.getName()}SubscriptionInputWhere! = {}
        }

        input ${model.getName()}SubscriptionInputWhere {
          ${getGQLWhereFields(model).map(field => `${field.getName()}: ${field.getModelRef() && !field.isFKReference() ? `${ucFirst(field.getDataRef())}InputWhere` : 'AutoGraphMixed'}`)}
        }

        type ${model.getName()}SubscriptionPayload {
          event: ${model.getName()}SubscriptionPayloadEvent
          query: ${model.getName()}SubscriptionQuery
        }

        type ${model.getName()}SubscriptionPayloadEvent {
          crud: SubscriptionCrudEnum!
          data: ${model.getName()}SubscriptionPayloadEventData!
        }

        type ${model.getName()}SubscriptionPayloadEventData {
          ${getGQLWhereFields(model).map(field => `${field.getName()}: ${field.getSubscriptionType()}`)}
        }

        interface ${model.getName()}SubscriptionQuery {
          ${model.getFields().filter(field => field.hasGQLScope('r')).map(field => `${field.getName()}: ${field.getPayloadType()}`)}
        }

        type ${model.getName()}Create implements ${model.getName()}SubscriptionQuery {
          ${model.getFields().filter(field => field.hasGQLScope('r')).map(field => `${field.getName()}: ${field.getPayloadType()}`)}
        }

        type ${model.getName()}Update implements ${model.getName()}SubscriptionQuery {
          ${model.getFields().filter(field => field.hasGQLScope('r')).map(field => `${field.getName()}: ${field.getPayloadType()}`)}
        }
      `),
    ].concat([
      `type PageInfo {
        startCursor: String!
        endCursor: String!
        hasPreviousPage: Boolean!
        hasNextPage: Boolean!
      }`,

      `type Query {
        node(id: ID!): Node
        ${entityModels.map(model => makeReadAPI(model.getName(), model))}
        ${entityModels.map(model => makeReadAPI(`${model.getName()}Create`, model))}
        ${entityModels.map(model => makeReadAPI(`${model.getName()}Update`, model))}
      }`,

      `type Mutation {
        _noop: String
        ${entityModels.map(model => makeCreateAPI(model.getName(), model))}
        ${entityModels.map(model => makeUpdateAPI(model.getName(), model))}
        ${entityModels.map(model => makeDeleteAPI(model.getName(), model))}
      }`,

      `type Subscription {
        _noop: String
        ${entityModels.map(model => makeSubscriptionAPI(model.getName(), model))}
      }`,
    ]),
    resolvers: readModels.reduce((prev, model) => {
      const modelName = model.getName();

      // Default field resolvers
      const fieldResolvers = model.getFields().filter(field => field.hasGQLScope('r')).reduce((def, field) => {
        const fieldName = field.getName();
        const isConnection = field.isConnection();

        return Object.assign(def, {
          [fieldName]: (root, args, { autograph }) => {
            if (fieldName === 'id') return autograph.legacyMode ? root.id : root.$id;

            const $fieldName = `$${fieldName}`;

            if (isConnection) {
              return {
                args,
                edges: root[$fieldName], // Thunk to the data/edges
                pageInfo: root[$fieldName], // You still need the data/edges to get pageInfo!
                count: root[`${$fieldName}:count`], // Thunk to $$count
              };
            }

            return root.$$isResultSetItem ? root[$fieldName](args) : root[fieldName];
          },
        });
      }, {});

      if (model.isEntity() && model.hasGQLScope('s')) {
        prev[`${model.getName()}SubscriptionQuery`] = {
          __resolveType: root => root.__typename, // eslint-disable-line no-underscore-dangle
          ...fieldResolvers,
        };
        prev[`${model.getName()}Create`] = fieldResolvers;
        prev[`${model.getName()}Update`] = fieldResolvers;
      }

      return Object.assign(prev, {
        [modelName]: fieldResolvers,
        [`${modelName}Connection`]: {
          edges: ({ edges, args }) => edges(args).then(rs => rs.map(node => ({ cursor: get(node, '$$cursor'), node }))),
          pageInfo: ({ pageInfo, args }) => pageInfo(args).then(rs => get(rs, '$$pageInfo')),
          count: ({ count, args }) => count(args),
        },
      });
    }, {
      Node: {
        __resolveType: (root, args, context, info) => root.__typename || fromGUID(root.$id)[0], // eslint-disable-line no-underscore-dangle
      },

      Query: entityModels.reduce((prev, model) => {
        return Object.assign(prev, makeQueryResolver(model.getName(), model, resolver));
      }, {
        node: (root, args, context, info) => {
          const { id } = args;
          const [modelName] = fromGUID(id);
          const model = schema.getModel(modelName);
          return resolver.get(context, model, args, false, info);
        },
      }),

      Mutation: entityModels.reduce((prev, model) => {
        return Object.assign(prev, makeMutationResolver(model.getName(), model, resolver));
      }, {}),
    }),
  });
};
