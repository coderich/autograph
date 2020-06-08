const GraphqlFields = require('graphql-fields');
const { ucFirst, fromGUID } = require('../../service/app.service');
const ServerResolver = require('../../core/ServerResolver');

module.exports = (schema) => {
  const resolver = new ServerResolver();

  return ({
    typeDefs: schema.getResolvableModels().map((model) => {
      const modelName = model.getName();

      return `
        type ${modelName}Subscription {
          op: String!
          model: ${modelName}!
        }

        input ${modelName}InputCreate {
          ${model.getCreateFields().map(field => `${field.getName()}: ${field.getGQLType('InputCreate')}`)}
        }

        input ${modelName}InputUpdate {
          ${model.getUpdateFields().map(field => `${field.getName()}: ${field.getGQLType('InputUpdate')}`)}
        }

        input ${modelName}InputWhere {
          ${model.getWhereFields().map(field => `${field.getName()}: ${field.getDataRef() ? `${ucFirst(field.getDataRef())}InputWhere` : 'String'}`)}
          # ${model.getCountableFields().map(field => `count${ucFirst(field.getName())}: String`)}
        }

        input ${modelName}InputSort {
          ${model.getSelectFields().map(field => `${field.getName()}: ${field.getDataRef() ? `${ucFirst(field.getDataRef())}InputSort` : 'SortOrderEnum'}`)}
          # ${model.getCountableFields().map(field => `count${ucFirst(field.getName())}: SortOrderEnum`)}
        }

        input ${modelName}InputQuery {
          where: ${modelName}InputWhere
          sortBy: ${modelName}InputSort
          limit: Int
        }
      `;
    }).concat([
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

      `type Schema {
        _noop: String
        ${schema.getReadModels().map(model => `get${model.getName()}(id: ID!): ${model.getName()} `)}
        ${schema.getReadModels().map(model => `find${model.getName()}(first: Int after: String last: Int before: String query: ${ucFirst(model.getName())}InputQuery): Connection!`)}
        ${schema.getReadModels().map(model => `count${model.getName()}(where: ${ucFirst(model.getName())}InputWhere): Int!`)}
      }`,

      `type Query {
        Schema: Schema!
        node(id: ID!): Node
        ${schema.getReadModels().map(model => `get${model.getName()}(id: ID!): ${model.getName()} `)}
        ${schema.getReadModels().map(model => `find${model.getName()}(first: Int after: String last: Int before: String query: ${ucFirst(model.getName())}InputQuery): Connection!`)}
        ${schema.getReadModels().map(model => `count${model.getName()}(where: ${ucFirst(model.getName())}InputWhere): Int!`)}
      }`,

      `type Mutation {
        _noop: String
        ${schema.getCreateModels().map(model => `create${model.getName()}(input: ${model.getName()}InputCreate! meta: ${model.getMeta()}): ${model.getName()}! `)}
        ${schema.getUpdateModels().map(model => `update${model.getName()}(id: ID! input: ${model.getName()}InputUpdate meta: ${model.getMeta()}): ${model.getName()}! `)}
        ${schema.getDeleteModels().map(model => `delete${model.getName()}(id: ID! meta: ${model.getMeta()}): ${model.getName()}! `)}
      }`,

      `type Subscription {
        _noop: String
        ${schema.getChangeModels().map(model => `${model.getName()}Trigger(first: Int after: String last: Int before: String query: ${ucFirst(model.getName())}InputQuery): Connection!`)}
        ${schema.getChangeModels().map(model => `${model.getName()}Changed(query: ${ucFirst(model.getName())}InputQuery): [${model.getName()}Subscription]!`)}
      }`,
    ]),
    resolvers: schema.getEntityModels().reduce((prev, model) => {
      const modelName = model.getName();

      return Object.assign(prev, {
        [modelName]: model.getSelectFields().reduce((def, field) => {
          const fieldName = field.getName();
          return Object.assign(def, { [fieldName]: root => root[`$${fieldName}`] });
        }, {
          id: (root, args, { autograph }) => (autograph.legacyMode ? root.id : root.$id),
          // countSelf: (root, args, context, info) => resolver.count(context, model, args, info),
        }),
      });
    }, {
      Node: {
        __resolveType: (root, args, context, info) => fromGUID(root.$id)[0],
      },
      Connection: {
        edges: root => root.map(node => ({ cursor: node.$$cursor, node })),
        pageInfo: root => root.$$pageInfo,
      },
      // Edge: {
      //   node: async (root, args, { autograph }, info) => {
      //     const { node } = root;
      //     const [modelName] = fromGUID(node.$id);
      //     const model = schema.getModel(modelName);
      //     return autograph.resolver.match(model).id(node.id).select(GraphqlFields(info, {}, { processArguments: true })).one();
      //   },
      // },
      Query: schema.getReadModels().reduce((prev, model) => {
        const modelName = model.getName();

        return Object.assign(prev, {
          [`get${modelName}`]: (root, args, context, info) => resolver.get(context, model, args.id, true, info),
          [`find${modelName}`]: (root, args, context, info) => resolver.query(context, model, args, info),
          [`count${modelName}`]: (root, args, context, info) => resolver.count(context, model, args, info),
        });
      }, {
        Schema: () => ({}),
        node: (root, args, context, info) => {
          const { id } = args;
          const [modelName] = fromGUID(id);
          const model = schema.getModel(modelName);
          return resolver.get(context, model, id, false, info);
        },
      }),

      Mutation: schema.getChangeModels().reduce((prev, model) => {
        const obj = {};
        const modelName = model.getName();

        if (model.isCreatable()) obj[`create${modelName}`] = (root, args, context, info) => resolver.create(context, model, args.input, args.meta, { fields: GraphqlFields(info, {}, { processArguments: true }) });
        if (model.isUpdatable()) obj[`update${modelName}`] = (root, args, context, info) => resolver.update(context, model, args.id, args.input, args.meta, { fields: GraphqlFields(info, {}, { processArguments: true }) });
        if (model.isDeletable()) obj[`delete${modelName}`] = (root, args, context, info) => resolver.delete(context, model, args.id, args.meta, { fields: GraphqlFields(info, {}, { processArguments: true }) });

        return Object.assign(prev, obj);
      }, {}),

      Schema: schema.getReadModels().reduce((prev, model) => {
        const modelName = model.getName();

        return Object.assign(prev, {
          [`get${modelName}`]: (root, args, context, info) => resolver.get(context, model, args.id, true, info),
          [`find${modelName}`]: (root, args, context, info) => resolver.query(context, model, args, info),
          [`count${modelName}`]: (root, args, context, info) => resolver.count(context, model, args, info),
        });
      }, {}),
    }),
  });
};
