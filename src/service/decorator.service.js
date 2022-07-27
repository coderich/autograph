const GraphqlFields = require('graphql-fields');

const resolveQuery = (method, name, resolver, model) => {
  return async (root, args, context, info) => {
    const queryInfo = { fields: GraphqlFields(info, {}, { processArguments: true }) };

    switch (method) {
      case 'get': return resolver.get(context, model, args, true, queryInfo);
      case 'find': {
        return {
          edges: () => resolver.query(context, model, args, queryInfo),
          pageInfo: () => resolver.query(context, model, args, queryInfo),
          count: () => resolver.count(context, model, args, queryInfo),
        };
      }
      case 'count': return resolver.count(context, model, args, queryInfo);
      case 'create': return resolver.create(context, model, args, queryInfo);
      case 'update': return resolver.update(context, model, args, queryInfo);
      case 'delete': return resolver.delete(context, model, args, queryInfo);
      default: return null;
    }
  };
};

// APIs
exports.makeCreateAPI = (name, model, parent) => {
  let gql = '';

  if (model.hasGQLScope('c')) {
    const meta = model.getMeta() ? `meta: ${model.getMeta()}` : '';
    gql += `create${name}(input: ${model.getName()}InputCreate! ${meta}): ${model.getName()}!`;
  }

  return gql;
};

exports.makeReadAPI = (name, model, parent) => {
  let gql = '';

  if (model.hasGQLScope('r')) {
    gql += `
      get${name}(id: ID!): ${model.getName()}
      find${name}(
        where: ${model.getName()}InputWhere
        sortBy: ${model.getName()}InputSort
        limit: Int
        skip: Int
        first: Int
        after: String
        last: Int
        before: String
      ): ${model.getName()}Connection!
    `;
  }

  return gql;
};

exports.makeUpdateAPI = (name, model, parent) => {
  let gql = '';

  if (model.hasGQLScope('u')) {
    const meta = model.getMeta() ? `meta: ${model.getMeta()}` : '';
    gql += `update${name}(id: ID! input: ${model.getName()}InputUpdate ${meta}): ${model.getName()}!`;
  }

  return gql;
};

exports.makeDeleteAPI = (name, model, parent) => {
  let gql = '';

  if (model.hasGQLScope('d')) {
    const meta = model.getMeta() ? `meta: ${model.getMeta()}` : '';
    gql += `delete${name}(id: ID! ${meta}): ${model.getName()}!`;
  }

  return gql;
};

exports.makeSubscriptionAPI = (name, model, parent) => {
  let gql = '';

  if (model.hasGQLScope('s')) {
    gql += `${name} (
      on: [SubscriptionCrudEnum!]! = [create, update, delete]
      filter: ${name}SubscriptionInputFilter
    ): ${name}SubscriptionPayload!`;
  }

  return gql;
};

// Resolvers
exports.makeQueryResolver = (name, model, resolver) => {
  const obj = {};

  if (model.hasGQLScope('r')) {
    obj[`get${name}`] = resolveQuery('get', name, resolver, model);
    obj[`find${name}`] = resolveQuery('find', name, resolver, model);
  }

  return obj;
};

exports.makeMutationResolver = (name, model, resolver) => {
  const obj = {};

  if (model.hasGQLScope('c')) obj[`create${name}`] = resolveQuery('create', name, resolver, model);
  if (model.hasGQLScope('u')) obj[`update${name}`] = resolveQuery('update', name, resolver, model);
  if (model.hasGQLScope('d')) obj[`delete${name}`] = resolveQuery('delete', name, resolver, model);

  return obj;
};
