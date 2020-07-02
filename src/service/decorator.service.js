const { set } = require('lodash');
const GraphqlFields = require('graphql-fields');
const { ucFirst, getDeep } = require('./app.service');

const resolveEmbeddedQuery = (method, resolver, model, embeds = []) => {
  const head = embeds[0];
  const fieldPath = embeds.map(field => field.getName()).join('.');

  return (root, args, context, info) => {
    switch (method) {
      case 'get': {
        if (fieldPath.length) {
          set(args, `query.where.${fieldPath}.id`, args.id);

          return resolver.query(context, head.getModel(), args, info).then(([result]) => {
            const data = getDeep(result, fieldPath, []);
            return data.find(el => `${el.id}` === `${args.id}`);
          });
        }

        return resolver.get(context, model, args, true, info);
      }
      default: {
        return null;
      }
    }
  };
};

const makeEmbeddedAPI = (model, method) => {
  let gql = '';
  const modelName = model.getName();
  const fields = model.getEmbeddedFields().filter(field => field.getModelRef().isMarkedModel());

  if (fields.length) {
    fields.forEach((field) => {
      const modelRef = field.getModelRef();
      const fieldName = ucFirst(field.isArray() ? field.getName().replace(/s$/, '') : field.getName());
      const name = `${modelName}${fieldName}`;

      switch (method) {
        case 'create': {
          gql += exports.makeCreateAPI(name, modelRef);
          break;
        }
        case 'read': {
          gql += exports.makeReadAPI(name, modelRef);
          break;
        }
        case 'update': {
          gql += exports.makeUpdateAPI(name, modelRef);
          break;
        }
        case 'delete': {
          gql += exports.makeDeleteAPI(name, modelRef);
          break;
        }
        default: {
          throw new Error(`Unknown method '${method}'`);
        }
      }
    });
  }

  return gql;
};

const makeEmbeddedResolver = (model, resolver, type, embeds = []) => {
  const obj = {};

  const modelName = model.getName();
  const fields = model.getEmbeddedFields().filter(field => field.getModelRef().isMarkedModel());

  fields.forEach((field) => {
    const modelRef = field.getModelRef();
    const fieldName = ucFirst(field.isArray() ? field.getName().replace(/s$/, '') : field.getName());
    const name = `${modelName}${fieldName}`;

    switch (type) {
      case 'query': {
        Object.assign(obj, exports.makeQueryResolver(name, modelRef, resolver, embeds.concat(field)));
        break;
      }
      case 'mutation': {
        Object.assign(obj, exports.makeMutationResolver(name, modelRef, resolver, embeds.concat(field)));
        break;
      }
      default: {
        throw new Error(`Unknown type '${type}'`);
      }
    }
  });

  return obj;
};

exports.makeInputSplice = (model, embed = false) => {
  let gql = '';
  const fields = model.getArrayFields().filter(field => field.hasGQLScope('c', 'u', 'd'));

  if (fields.length) {
    gql += fields.map((field) => {
      const embedded = field.isEmbedded() ? exports.makeInputSplice(field.getModelRef(), true) : '';

      return `
        ${embedded}
        input ${model.getName()}${ucFirst(field.getName())}InputSplice {
          with: ${field.getGQLType('InputWhere', { splice: true })}
          put: ${field.getGQLType('InputUpdate', { splice: true })}
          ${embedded.length ? `splice: ${field.getModelRef().getName()}InputSplice` : ''}
        }
      `;
    }).join('\n\n');

    gql += `
      input ${model.getName()}InputSplice {
        ${fields.map(field => `${field.getName()}: ${model.getName()}${ucFirst(field.getName())}InputSplice`)}
      }
    `;
  }

  return gql;
};

// APIs
exports.makeCreateAPI = (name, model) => {
  let gql = '';

  if (model.hasGQLScope('c')) {
    gql += `
      create${name}(input: ${model.getName()}InputCreate! meta: ${model.getMeta()}): ${model.getName()}!
    `;
  }

  gql += makeEmbeddedAPI(model, 'create');

  return gql;
};

exports.makeReadAPI = (name, model) => {
  let gql = '';

  if (model.hasGQLScope('r')) {
    gql += `
      get${name}(id: ID!): ${model.getName()}
      find${name}(first: Int after: String last: Int before: String query: ${ucFirst(model.getName())}InputQuery): Connection!
      count${name}(where: ${ucFirst(model.getName())}InputWhere): Int!
    `;
  }

  gql += makeEmbeddedAPI(model, 'read');

  return gql;
};

exports.makeUpdateAPI = (name, model) => {
  let gql = '';

  if (model.hasGQLScope('u')) {
    const spliceFields = model.getArrayFields().filter(field => field.hasGQLScope('c', 'u', 'd'));

    gql += `
      update${name}(
        id: ID!
        input: ${model.getName()}InputUpdate
        ${!spliceFields.length ? '' : `splice: ${model.getName()}InputSplice`}
        meta: ${model.getMeta()}
      ): ${model.getName()}!
    `;
  }

  gql += makeEmbeddedAPI(model, 'update');

  return gql;
};

exports.makeDeleteAPI = (name, model) => {
  let gql = '';

  if (model.hasGQLScope('d')) {
    gql += `
      delete${name}(id: ID! meta: ${model.getMeta()}): ${model.getName()}!
    `;
  }

  gql += makeEmbeddedAPI(model, 'delete');

  return gql;
};

// Resolvers
exports.makeQueryResolver = (name, model, resolver, embeds = []) => {
  const obj = {};

  if (model.hasGQLScope('r')) {
    obj[`get${name}`] = resolveEmbeddedQuery('get', resolver, model, embeds);
    // obj[`get${name}`] = (root, args, context, info) => resolver.get(context, model, args, true, info);
    obj[`find${name}`] = (root, args, context, info) => resolver.query(context, model, args, info);
    obj[`count${name}`] = (root, args, context, info) => resolver.count(context, model, args, info);
  }

  return Object.assign(obj, makeEmbeddedResolver(model, resolver, 'query', embeds));
};

exports.makeMutationResolver = (name, model, resolver, embeds = []) => {
  const obj = {};

  if (model.hasGQLScope('c')) obj[`create${name}`] = (root, args, context, info) => resolver.create(context, model, args, { fields: GraphqlFields(info, {}, { processArguments: true }) });
  if (model.hasGQLScope('u')) obj[`update${name}`] = (root, args, context, info) => resolver.update(context, model, args, { fields: GraphqlFields(info, {}, { processArguments: true }) });
  if (model.hasGQLScope('d')) obj[`delete${name}`] = (root, args, context, info) => resolver.delete(context, model, args, { fields: GraphqlFields(info, {}, { processArguments: true }) });

  return Object.assign(obj, makeEmbeddedResolver(model, resolver, 'mutation', embeds));
};
