const { get, set } = require('lodash');
const GraphqlFields = require('graphql-fields');
const Boom = require('../core/Boom');
const { spliceEmbeddedArray } = require('./data.service');
const { guidToId, unrollGuid, ucFirst, getDeep, objectContaining } = require('./app.service');

const resolveQuery = (method, resolver, model, embeds = []) => {
  const [base] = embeds;
  const curr = embeds[embeds.length - 1];
  const fieldPath = embeds.map(field => field.getName()).join('.');

  return async (root, args, context, info) => {
    const { autograph } = context;

    if (fieldPath.length) {
      switch (method) {
        case 'get': {
          // Readjust the where clause
          const where = get(args, 'query.where', {});
          set(where, `${fieldPath}.id`, args.id);
          set(args, 'query.where', where);

          return resolver.query(context, base.getModel(), args, info).then(([result]) => {
            const arr = getDeep(result, fieldPath, []);
            return arr.find(el => `${el.id}` === `${args.id}`);
          });
        }
        case 'find': {
          // Readjust the where clause
          const where = get(args, 'query.where', {});
          const $where = set({}, `${fieldPath}`, where);
          set(args, 'query.where', $where);

          return resolver.query(context, base.getModel(), args, info).then((results) => {
            const arr = results.map(result => getDeep(result, fieldPath, [])).flat();
            return arr.filter(el => objectContaining(el, where));
          });
        }
        case 'count': {
          // Readjust the where clause
          const where = get(args, 'where', {});
          const $where = set({}, `${fieldPath}`, where);
          set(args, 'query.where', $where);

          return resolver.query(context, base.getModel(), args, info).then((results) => {
            const arr = results.map(result => getDeep(result, fieldPath, [])).flat();
            return arr.length;
          });
        }
        case 'create': {
          const modelName = model.getName();
          const fieldName = ucFirst(curr.isArray() ? curr.getName().replace(/s$/, '') : curr.getName());
          const parentModelName = modelName.substr(0, modelName.lastIndexOf(fieldName));
          const field = model.getFields().find(f => f.getType() === parentModelName);
          if (!field) throw Boom.badData(`Unable to locate parent field: '${model.getName()} -> ${parentModelName}'`);

          const input = unrollGuid(autograph, model, args.input);
          const id = get(input, field.getName());

          if (curr.isArray()) {
            return autograph.resolver.match(parentModelName).id(id).push(curr.getName(), args.input).then((doc) => {
              return get(doc, fieldPath).pop();
            });
          }

          return null;
        }
        case 'update': {
          const modelName = model.getName();
          const fieldName = ucFirst(curr.isArray() ? curr.getName().replace(/s$/, '') : curr.getName());
          const parentModelName = modelName.substr(0, modelName.lastIndexOf(fieldName));
          const field = model.getFields().find(f => f.getType() === parentModelName);
          if (!field) throw Boom.badData(`Unable to locate parent field: '${model.getName()} -> ${parentModelName}'`);

          const id = guidToId(autograph, args.id);
          const where = { [`${fieldPath}.id`]: id };
          const doc = await autograph.resolver.match(parentModelName).where(where).one();
          if (!doc) throw Boom.notFound(`${parentModelName} Not Found`);

          if (curr.isArray()) {
            return autograph.resolver.match(parentModelName).id(doc.id).splice(curr.getName(), { id }, args.input).then((result) => {
              return get(result, fieldPath).find(el => `${el.id}` === `${id}`);
            });
          }

          return null;
        }
        case 'delete': {
          const modelName = model.getName();
          const fieldName = ucFirst(curr.isArray() ? curr.getName().replace(/s$/, '') : curr.getName());
          const parentModelName = modelName.substr(0, modelName.lastIndexOf(fieldName));
          const field = model.getFields().find(f => f.getType() === parentModelName);
          if (!field) throw Boom.badData(`Unable to locate parent field: '${model.getName()} -> ${parentModelName}'`);

          const id = guidToId(autograph, args.id);
          const where = { [`${fieldPath}.id`]: id };
          const doc = await autograph.resolver.match(parentModelName).where(where).one();
          if (!doc) throw Boom.notFound(`${parentModelName} Not Found`);

          if (curr.isArray()) {
            return autograph.resolver.match(parentModelName).id(doc.id).pull(curr.getName(), { id }).then((result) => {
              return get(result, fieldPath).find(el => `${el.id}` === `${id}`);
            });
          }

          return null;
        }
        default: {
          return null;
        }
      }
    }

    switch (method) {
      case 'get': return resolver.get(context, model, args, true, info);
      case 'find': return resolver.query(context, model, args, info);
      case 'count': return resolver.count(context, model, args, info);
      case 'create': return resolver.create(context, model, args, { fields: GraphqlFields(info, {}, { processArguments: true }) });
      case 'update': return resolver.update(context, model, args, { fields: GraphqlFields(info, {}, { processArguments: true }) });
      case 'delete': return resolver.delete(context, model, args, { fields: GraphqlFields(info, {}, { processArguments: true }) });
      default: return null;
    }
  };
};

const makeEmbeddedAPI = (model, method, parent) => {
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
          gql += exports.makeCreateAPI(name, modelRef, field);
          break;
        }
        case 'read': {
          gql += exports.makeReadAPI(name, modelRef, field);
          break;
        }
        case 'update': {
          gql += exports.makeUpdateAPI(name, modelRef, field);
          break;
        }
        case 'delete': {
          gql += exports.makeDeleteAPI(name, modelRef, field);
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

  const parent = embeds[embeds.length - 1];
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
exports.makeCreateAPI = (name, model, parent) => {
  let gql = '';

  if (model.hasGQLScope('c')) {
    gql += `
      create${name}(input: ${model.getName()}InputCreate! meta: ${model.getMeta()}): ${model.getName()}!
    `;
  }

  gql += makeEmbeddedAPI(model, 'create', parent);

  return gql;
};

exports.makeReadAPI = (name, model, parent) => {
  let gql = '';

  if (model.hasGQLScope('r')) {
    gql += `
      get${name}(id: ID!): ${model.getName()}
      find${name}(first: Int after: String last: Int before: String query: ${ucFirst(model.getName())}InputQuery): Connection!
      count${name}(where: ${ucFirst(model.getName())}InputWhere): Int!
    `;
  }

  gql += makeEmbeddedAPI(model, 'read', parent);

  return gql;
};

exports.makeUpdateAPI = (name, model, parent) => {
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

  gql += makeEmbeddedAPI(model, 'update', parent);

  return gql;
};

exports.makeDeleteAPI = (name, model, parent) => {
  let gql = '';

  if (model.hasGQLScope('d')) {
    gql += `
      delete${name}(id: ID! meta: ${model.getMeta()}): ${model.getName()}!
    `;
  }

  gql += makeEmbeddedAPI(model, 'delete', parent);

  return gql;
};

// Resolvers
exports.makeQueryResolver = (name, model, resolver, embeds = []) => {
  const obj = {};

  if (model.hasGQLScope('r')) {
    obj[`get${name}`] = resolveQuery('get', resolver, model, embeds);
    obj[`find${name}`] = resolveQuery('find', resolver, model, embeds);
    obj[`count${name}`] = resolveQuery('count', resolver, model, embeds);
  }

  return Object.assign(obj, makeEmbeddedResolver(model, resolver, 'query', embeds));
};

exports.makeMutationResolver = (name, model, resolver, embeds = []) => {
  const obj = {};

  if (model.hasGQLScope('c')) obj[`create${name}`] = resolveQuery('create', resolver, model, embeds);
  if (model.hasGQLScope('u')) obj[`update${name}`] = resolveQuery('update', resolver, model, embeds);
  if (model.hasGQLScope('d')) obj[`delete${name}`] = resolveQuery('delete', resolver, model, embeds);

  return Object.assign(obj, makeEmbeddedResolver(model, resolver, 'mutation', embeds));
};
