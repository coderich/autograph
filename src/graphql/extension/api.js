/* eslint-disable indent, no-nested-ternary */
const GraphqlFields = require('graphql-fields');
const { ucFirst, fromGUID } = require('../../service/app.service');
const { findGQLModels } = require('../../service/schema.service');
const ServerResolver = require('../../core/ServerResolver');

const getGQLWhereFields = (model) => {
  return model.getFields().filter((field) => {
    if (field.getName() === 'id') return false;
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
        ${model.getArrayFields().filter(field => field.hasGQLScope('c', 'u', 'd')).map((field) => {
          const fieldName = ucFirst(field.getName());
          const isEmbedded = field.isEmbedded();
          const fields = isEmbedded ? field.getModelRef().getFields().reduce((prev, f) => Object.assign(prev, { [f]: 'AutoGraphMixed' }), {}) : { id: 'AutoGraphMixed' };

          return `
            input ${model.getName()}${fieldName}InputSliceSearch { ${Object.entries(fields).map(([k, v]) => `${k}: ${v}`)} }
            input ${model.getName()}${fieldName}InputSliceQuery {
              where: ${model.getName()}${fieldName}InputSliceSearch
              sortBy: ${model.getName()}${fieldName}InputSliceSearch
              limit: Int
            }
            input ${model.getName()}${fieldName}InputSlice {
              query: ${model.getName()}${fieldName}InputSliceQuery
              input: [${model.getName()}${fieldName}InputSliceSearch]
            }
          `;
        })}
      `),
      ...updateModels.map(model => `
        input ${model.getName()}InputUpdate {
          ${model.getFields().filter(field => field.hasGQLScope('u')).map(field => `${field.getName()}: ${field.getGQLType('InputUpdate')}`)}
        }
      `),
      ...readModels.map(model => `
        input ${model.getName()}InputWhere {
          ${getGQLWhereFields(model).map(field => `${field.getName()}: ${field.getModelRef() ? `${ucFirst(field.getDataRef())}InputWhere` : 'AutoGraphMixed'}`)}
        }
        input ${model.getName()}InputSort {
          ${getGQLWhereFields(model).map(field => `${field.getName()}: ${field.getModelRef() ? `${ucFirst(field.getDataRef())}InputSort` : 'SortOrderEnum'}`)}
        }
        input ${model.getName()}InputQuery { where: ${model.getName()}InputWhere sortBy: ${model.getName()}InputSort limit: Int }
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
        ${schema.getEntityModels().filter(model => model.hasGQLScope('r')).map(model => `get${model.getName()}(id: ID!): ${model.getName()}`)}
        ${schema.getEntityModels().filter(model => model.hasGQLScope('r')).map(model => `find${model.getName()}(first: Int after: String last: Int before: String query: ${ucFirst(model.getName())}InputQuery): Connection!`)}
        ${schema.getEntityModels().filter(model => model.hasGQLScope('r')).map(model => `count${model.getName()}(where: ${ucFirst(model.getName())}InputWhere): Int!`)}
      }`,

      `type Mutation {
        _noop: String
        ${schema.getEntityModels().filter(model => model.hasGQLScope('c')).map(model => `create${model.getName()}(input: ${model.getName()}InputCreate! meta: ${model.getMeta()}): ${model.getName()}!`)}
        ${schema.getEntityModels().filter(model => model.hasGQLScope('u')).map(model => `
          update${model.getName()}(
            id: ID!
            input: ${model.getName()}InputUpdate
            ${model.getArrayFields().filter(field => field.hasGQLScope('c', 'u', 'd')).map((field) => {
              const fieldName = ucFirst(field.getName());
              return `slice${fieldName}: ${model.getName()}${fieldName}InputSlice`;
            })}
            meta: ${model.getMeta()}
          ): ${model.getName()}!
        `)}
        ${schema.getEntityModels().filter(model => model.hasGQLScope('d')).map(model => `delete${model.getName()}(id: ID! meta: ${model.getMeta()}): ${model.getName()}!`)}
      }`,
    ]),
    resolvers: schema.getMarkedModels().reduce((prev, model) => {
      const modelName = model.getName();

      return Object.assign(prev, {
        [modelName]: model.getFields().filter(field => field.hasGQLScope('r')).reduce((def, field) => {
          const fieldName = field.getName();
          const $fieldName = field.getModelRef() ? `$${fieldName}` : fieldName; // only $hydrated when it's a modelRef
          if (fieldName === 'id') return Object.assign(def, { id: (root, args, { autograph }) => (autograph.legacyMode ? root.id : root.$id) });
          return Object.assign(def, {
            [fieldName]: (root) => {
              return root[$fieldName];
            },
          });
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
      Query: schema.getEntityModels().filter(model => model.hasGQLScope('r')).reduce((prev, model) => {
        const modelName = model.getName();

        return Object.assign(prev, {
          [`get${modelName}`]: (root, args, context, info) => resolver.get(context, model, args, true, info),
          [`find${modelName}`]: (root, args, context, info) => resolver.query(context, model, args, info),
          [`count${modelName}`]: (root, args, context, info) => resolver.count(context, model, args, info),
        });
      }, {
        node: (root, args, context, info) => {
          const { id } = args;
          const [modelName] = fromGUID(id);
          const model = schema.getModel(modelName);
          return resolver.get(context, model, args, false, info);
        },
      }),

      Mutation: schema.getEntityModels().reduce((prev, model) => {
        const obj = {};
        const modelName = model.getName();

        if (model.hasGQLScope('c')) obj[`create${modelName}`] = (root, args, context, info) => resolver.create(context, model, args, { fields: GraphqlFields(info, {}, { processArguments: true }) });
        if (model.hasGQLScope('u')) obj[`update${modelName}`] = (root, args, context, info) => resolver.update(context, model, args, { fields: GraphqlFields(info, {}, { processArguments: true }) });
        if (model.hasGQLScope('d')) obj[`delete${modelName}`] = (root, args, context, info) => resolver.delete(context, model, args, { fields: GraphqlFields(info, {}, { processArguments: true }) });

        return Object.assign(prev, obj);
      }, {}),
    }),
  });
};
