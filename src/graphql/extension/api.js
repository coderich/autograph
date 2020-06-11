const GraphqlFields = require('graphql-fields');
const { ucFirst, fromGUID } = require('../../service/app.service');
const { findGQLModels } = require('../../service/schema.service');
const ServerResolver = require('../../core/ServerResolver');

module.exports = (schema) => {
  const resolver = new ServerResolver();
  const createModels = findGQLModels('c', schema.getMarkedModels());
  const updateModels = findGQLModels('u', schema.getMarkedModels());

  return ({
    typeDefs: [
      ...createModels.map(model => `
        input ${model.getName()}InputCreate {
          ${model.getFields().filter(field => field.getName() !== 'id' && field.hasGQL('c')).map(field => `${field.getName()}: ${field.getGQLType('InputCreate')}`)}
        }
      `),
      ...updateModels.map(model => `
        input ${model.getName()}InputUpdate {
          ${model.getFields().filter(field => field.getName() !== 'id' && field.hasGQL('u')).map(field => `${field.getName()}: ${field.getGQLType('InputUpdate')}`)}
        }
      `),
    ].concat(schema.getMarkedModels().map((model) => {
      const modelName = model.getName();

      return `
        ${model.isGQLSubscribable() ? `type ${modelName}Subscription {
          op: String!
          model: ${modelName}!
        }` : ''}

        input ${modelName}InputWhere {
          ${model.getGQLWhereFields().map(field => `${field.getName()}: ${field.getDataRef() ? `${ucFirst(field.getDataRef())}InputWhere` : 'String'}`)}
          # ${model.getCountableFields().map(field => `count${ucFirst(field.getName())}: String`)}
        }

        input ${modelName}InputSort {
          ${model.getGQLSortFields().map(field => `${field.getName()}: ${field.getDataRef() ? `${ucFirst(field.getDataRef())}InputSort` : 'SortOrderEnum'}`)}
          # ${model.getCountableFields().map(field => `count${ucFirst(field.getName())}: SortOrderEnum`)}
        }

        input ${modelName}InputQuery {
          where: ${modelName}InputWhere
          sortBy: ${modelName}InputSort
          limit: Int
        }
      `;
    })).concat([
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
        ${schema.getMarkedModels().filter(model => model.hasGQL('r')).map(model => `get${model.getName()}(id: ID!): ${model.getName()} `)}
        ${schema.getMarkedModels().filter(model => model.hasGQL('r')).map(model => `find${model.getName()}(first: Int after: String last: Int before: String query: ${ucFirst(model.getName())}InputQuery): Connection!`)}
        ${schema.getMarkedModels().filter(model => model.hasGQL('r')).map(model => `count${model.getName()}(where: ${ucFirst(model.getName())}InputWhere): Int!`)}
      }`,

      `type Query {
        Schema: Schema!
        node(id: ID!): Node
        ${schema.getMarkedModels().filter(model => model.hasGQL('r')).map(model => `get${model.getName()}(id: ID!): ${model.getName()} `)}
        ${schema.getMarkedModels().filter(model => model.hasGQL('r')).map(model => `find${model.getName()}(first: Int after: String last: Int before: String query: ${ucFirst(model.getName())}InputQuery): Connection!`)}
        ${schema.getMarkedModels().filter(model => model.hasGQL('r')).map(model => `count${model.getName()}(where: ${ucFirst(model.getName())}InputWhere): Int!`)}
      }`,

      `type Mutation {
        _noop: String
        ${schema.getMarkedModels().filter(model => model.hasGQL('c')).map(model => `create${model.getName()}(input: ${model.getName()}InputCreate! meta: ${model.getMeta()}): ${model.getName()}! `)}
        ${schema.getMarkedModels().filter(model => model.hasGQL('u')).map(model => `update${model.getName()}(id: ID! input: ${model.getName()}InputUpdate meta: ${model.getMeta()}): ${model.getName()}! `)}
        ${schema.getMarkedModels().filter(model => model.hasGQL('d')).map(model => `delete${model.getName()}(id: ID! meta: ${model.getMeta()}): ${model.getName()}! `)}
      }`,

      `type Subscription {
        _noop: String
        ${schema.getGQLSubscribeModels().map(model => `${model.getName()}Trigger(first: Int after: String last: Int before: String query: ${ucFirst(model.getName())}InputQuery): Connection!`)}
        ${schema.getGQLSubscribeModels().map(model => `${model.getName()}Changed(query: ${ucFirst(model.getName())}InputQuery): [${model.getName()}Subscription]!`)}
      }`,
    ]),
    resolvers: schema.getGQLSubscribeModels().reduce((prev, model) => {
      const modelName = model.getName();

      return Object.assign(prev, {
        [modelName]: model.getGQLSelectFields().reduce((def, field) => {
          const fieldName = field.getName();
          if (fieldName === 'id') return Object.assign(def, { id: (root, args, { autograph }) => (autograph.legacyMode ? root.id : root.$id) });
          return Object.assign(def, { [fieldName]: root => root[`$${fieldName}`] });
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
      // Edge: {
      //   node: async (root, args, { autograph }, info) => {
      //     const { node } = root;
      //     const [modelName] = fromGUID(node.$id);
      //     const model = schema.getModel(modelName);
      //     return autograph.resolver.match(model).id(node.id).select(GraphqlFields(info, {}, { processArguments: true })).one();
      //   },
      // },
      Query: schema.getGQLReadModels().reduce((prev, model) => {
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

      Mutation: schema.getMarkedModels().reduce((prev, model) => {
        const obj = {};
        const modelName = model.getName();

        if (model.hasGQL('c')) obj[`create${modelName}`] = (root, args, context, info) => resolver.create(context, model, args.input, args.meta, { fields: GraphqlFields(info, {}, { processArguments: true }) });
        if (model.hasGQL('u')) obj[`update${modelName}`] = (root, args, context, info) => resolver.update(context, model, args.id, args.input, args.meta, { fields: GraphqlFields(info, {}, { processArguments: true }) });
        if (model.hasGQL('d')) obj[`delete${modelName}`] = (root, args, context, info) => resolver.delete(context, model, args.id, args.meta, { fields: GraphqlFields(info, {}, { processArguments: true }) });

        return Object.assign(prev, obj);
      }, {}),

      Schema: schema.getGQLReadModels().reduce((prev, model) => {
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
