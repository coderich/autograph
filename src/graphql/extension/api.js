const GraphqlFields = require('graphql-fields');
const { makeExecutableSchema, mergeSchemas } = require('graphql-tools');
const { ucFirst, fromGUID } = require('../service/app.service');
const ServerResolver = require('../../core/ServerResolver');
const AuthzDirective = require('../directive/authz.directive');

module.exports = (schema) => {
  return null;
  // const resolver = new ServerResolver();

  // const apiSchema = {
  //   typeDefs: this.getModels().map((model) => {
  //     const modelName = model.getName();

  //     return `
  //       type ${modelName} implements Node @authz {
  //         id: ID!
  //         ${model.getSelectFields().map(field => field.getGQLDefinition())}
  //         ${model.getCountableFields().map(field => `count${ucFirst(field.getName())}(where: ${field.getDataRef()}InputWhere): Int!`)}
  //         countSelf(where: ${modelName}InputWhere): Int!
  //       }

  //       type ${modelName}Subscription {
  //         op: String!
  //         model: ${modelName}!
  //       }

  //       input ${modelName}InputCreate {
  //         ${model.getCreateFields().map(field => `${field.getName()}: ${field.getGQLType('InputCreate')}`)}
  //       }

  //       input ${modelName}InputUpdate {
  //         ${model.getUpdateFields().map(field => `${field.getName()}: ${field.getGQLType('InputUpdate')}`)}
  //       }

  //       input ${modelName}InputWhere {
  //         ${model.getSelectFields().map(field => `${field.getName()}: ${field.getDataRef() ? `${ucFirst(field.getDataRef())}InputWhere` : 'String'}`)}
  //         ${model.getCountableFields().map(field => `count${ucFirst(field.getName())}: String`)}
  //         countSelf: String
  //       }

  //       input ${modelName}InputSort {
  //         ${model.getSelectFields().map(field => `${field.getName()}: ${field.getDataRef() ? `${ucFirst(field.getDataRef())}InputSort` : 'SortOrderEnum'}`)}
  //         ${model.getCountableFields().map(field => `count${ucFirst(field.getName())}: SortOrderEnum`)}
  //         countSelf: SortOrderEnum
  //       }

  //       input ${modelName}InputQuery {
  //         where: ${modelName}InputWhere
  //         sortBy: ${modelName}InputSort
  //         limit: Int
  //       }
  //     `;
  //   }).concat([
  //     `
  //     type Connection {
  //       edges: [Edge]
  //       pageInfo: PageInfo!
  //     }

  //     type Edge {
  //       node: Node
  //       cursor: String!
  //     }

  //     type PageInfo {
  //       startCursor: String!
  //       endCursor: String!
  //       hasPreviousPage: Boolean!
  //       hasNextPage: Boolean!
  //       totalCount: Int!
  //     }

  //     interface Node {
  //       id: ID!
  //     }

  //     enum SortOrderEnum { ASC DESC }

  //     directive @authz(model: String) on OBJECT | FIELD_DEFINITION
  //     `,

  //     `type Schema {
  //       _noop: String
  //       ${this.getVisibleModels().map(model => `get${model.getName()}(id: ID!): ${model.getName()} @authz`)}
  //       ${this.getVisibleModels().map(model => `find${model.getName()}(first: Int after: String last: Int before: String query: ${ucFirst(model.getName())}InputQuery): Connection! @authz(model: "${model.getName()}")`)}
  //       ${this.getVisibleModels().map(model => `count${model.getName()}(where: ${ucFirst(model.getName())}InputWhere): Int! @authz(model: "${model.getName()}")`)}
  //     }`,

  //     `type Query {
  //       Schema: Schema!
  //       node(id: ID!): Node
  //       ${this.getVisibleModels().map(model => `get${model.getName()}(id: ID!): ${model.getName()} @authz`)}
  //       ${this.getVisibleModels().map(model => `find${model.getName()}(first: Int after: String last: Int before: String query: ${ucFirst(model.getName())}InputQuery): Connection! @authz(model: "${model.getName()}")`)}
  //       ${this.getVisibleModels().map(model => `count${model.getName()}(where: ${ucFirst(model.getName())}InputWhere): Int! @authz(model: "${model.getName()}")`)}
  //     }`,

  //     `type Mutation {
  //       _noop: String
  //       ${this.getVisibleModels().map(model => `create${model.getName()}(data: ${model.getName()}InputCreate!): ${model.getName()}! @authz`)}
  //       ${this.getVisibleModels().map(model => `update${model.getName()}(id: ID! data: ${model.getName()}InputUpdate!): ${model.getName()}! @authz`)}
  //       ${this.getVisibleModels().map(model => `delete${model.getName()}(id: ID!): ${model.getName()}! @authz`)}
  //     }`,

  //     `type Subscription {
  //       _noop: String
  //       ${this.getVisibleModels().map(model => `${model.getName()}Trigger(first: Int after: String last: Int before: String query: ${ucFirst(model.getName())}InputQuery): Connection!`)}
  //       ${this.getVisibleModels().map(model => `${model.getName()}Changed(query: ${ucFirst(model.getName())}InputQuery): [${model.getName()}Subscription]!`)}
  //     }`,
  //   ]),
  //   resolvers: this.getModels().reduce((prev, model) => {
  //     const modelName = model.getName();

  //     return Object.assign(prev, {
  //       [modelName]: model.getSelectFields().reduce((def, field) => {
  //         const fieldName = field.getName();
  //         return Object.assign(def, { [fieldName]: root => root[`$${fieldName}`] });
  //       }, {
  //         id: (root, args, context) => (context.legacyMode ? root.id : root.$id),
  //         countSelf: (root, args, context, info) => resolver.count(context, model, args, info),
  //       }),
  //     });
  //   }, {
  //     Node: {
  //       __resolveType: (root, args, context, info) => fromGUID(root.$id)[0],
  //     },
  //     Connection: {
  //       edges: root => root.map(node => ({ cursor: node.$$cursor, node })),
  //       pageInfo: root => root.$$pageInfo,
  //     },
  //     // Edge is needed for Trigger Subscription for some reason
  //     Edge: {
  //       node: async (root, args, context, info) => {
  //         const { node } = root;
  //         const { loader } = context;
  //         const [modelName] = fromGUID(node.$id);
  //         const model = this.getModel(modelName);
  //         return model.hydrate(loader, node, { fields: GraphqlFields(info, {}, { processArguments: true }) });
  //       },
  //     },
  //     Query: this.getVisibleModels().reduce((prev, model) => {
  //       const modelName = model.getName();

  //       return Object.assign(prev, {
  //         [`get${modelName}`]: (root, args, context, info) => resolver.get(context, model, args.id, true, info),
  //         [`find${modelName}`]: (root, args, context, info) => resolver.query(context, model, args, info),
  //         [`count${modelName}`]: (root, args, context, info) => resolver.count(context, model, args, info),
  //       });
  //     }, {
  //       Schema: () => ({}),
  //       node: (root, args, context, info) => {
  //         const { id } = args;
  //         const [modelName] = fromGUID(id);
  //         const model = this.getModel(modelName);
  //         return resolver.get(context, model, id, false, info);
  //       },
  //     }),

  //     Mutation: this.getVisibleModels().reduce((prev, model) => {
  //       const modelName = model.getName();

  //       return Object.assign(prev, {
  //         [`create${modelName}`]: (root, args, context, info) => resolver.create(context, model, args.data, { fields: GraphqlFields(info, {}, { processArguments: true }) }),
  //         [`update${modelName}`]: (root, args, context, info) => resolver.update(context, model, args.id, args.data, { fields: GraphqlFields(info, {}, { processArguments: true }) }),
  //         [`delete${modelName}`]: (root, args, context, info) => resolver.delete(context, model, args.id, { fields: GraphqlFields(info, {}, { processArguments: true }) }),
  //       });
  //     }, {}),

  //     Schema: this.getVisibleModels().reduce((prev, model) => {
  //       const modelName = model.getName();

  //       return Object.assign(prev, {
  //         [`get${modelName}`]: (root, args, context, info) => resolver.get(context, model, args.id, true, info),
  //         [`find${modelName}`]: (root, args, context, info) => resolver.query(context, model, args, info),
  //         [`count${modelName}`]: (root, args, context, info) => resolver.count(context, model, args, info),
  //       });
  //     }, {}),
  //   }),
  //   schemaDirectives: {
  //     authz: AuthzDirective,
  //   },
  // };

  // return mergeSchemas({ schemas: [this.getExecutableSchema(), makeExecutableSchema(apiSchema)], mergeDirectives: true });
};
