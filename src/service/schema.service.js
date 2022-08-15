// https://hasura.io/blog/the-ultimate-guide-to-schema-stitching-in-graphql-f30178ac0072/#d677
// https://graphql.org/graphql-js/type/
// https://graphql.org/graphql-js/utilities/

const { uniqWith } = require('lodash');
const { GraphQLScalarType, GraphQLObjectType, GraphQLInterfaceType, GraphQLUnionType, GraphQLEnumType, GraphQLInputObjectType } = require('graphql');

exports.getSchemaData = (schema) => {
  const operations = ['Query', 'Mutation', 'Subscription'];

  return Object.entries(schema.getTypeMap()).reduce((prev, [key, value]) => {
    let type;

    if (value instanceof GraphQLScalarType) {
      type = 'scalars';
    } else if (value instanceof GraphQLEnumType) {
      type = 'enums';
    } else if (value instanceof GraphQLUnionType) {
      type = 'unions';
    } else if (value instanceof GraphQLInterfaceType) {
      type = 'interfaces';
    } else if (value instanceof GraphQLInputObjectType) {
      type = 'inputs';
    } else if (value instanceof GraphQLObjectType) {
      if (operations.includes(key)) {
        type = 'operations';
      } else {
        type = 'models';
      }
    }

    if (type) {
      if (!key.startsWith('__')) {
        prev[type][key] = value;
      }
    } else {
      console.log(`Unknown schema type { ${key}: ${value} }`);
    }

    return prev;
  }, {
    enums: {},
    models: {},
    inputs: {},
    unions: {},
    scalars: {},
    operations: {},
    directives: {},
    interfaces: {},
    enumerations: {},
  });
};

exports.identifyOnDeletes = (models, parentModel) => {
  return models.reduce((prev, model) => {
    model.getOnDeleteFields().forEach((field) => {
      const { modelRef, isArray } = field.toObject();

      if (`${modelRef}` === `${parentModel}`) {
        if (model.isEntity()) {
          prev.push({ model, field, isArray, op: field.getOnDelete() });
        } else {
          prev.push(...exports.identifyOnDeletes(models, model).map(od => Object.assign(od, { fieldRef: field, isArray, op: field.getOnDelete() })));
        }
      }
    });

    // Assign model referential integrity
    return uniqWith(prev, (a, b) => `${a.model}:${a.field}:${a.fieldRef}:${a.op}` === `${b.model}:${b.field}:${b.fieldRef}:${b.op}`);
  }, []);
};

const markGQLModels = (gql, models, weakMap = new WeakMap(), include = false) => models.reduce((map, model) => {
  if (map.has(model)) return map;
  if (model.isMarkedModel() && !model.hasDALScope(gql)) return map.set(model, false);
  if (include) return map.set(model, true);
  if (model.hasGQLScope(gql)) {
    switch (gql) {
      case 'c': case 'u': return markGQLModels(gql, model.getEmbeddedFields().filter(field => field.hasGQLScope(gql)).map(f => f.getModelRef()), map.set(model, true), true);
      default: {
        const modelRefFields = model.getModelRefFields();
        const refFields = modelRefFields.filter(field => field.hasGQLScope(gql));
        const modelRefs = refFields.map(field => field.getModelRef());
        modelRefs.forEach(m => map.set(m, true));
        return markGQLModels(gql, modelRefs, map.set(model, true), true);
      }
    }
  }
  return map;
}, weakMap);

exports.findGQLModels = (gql, models, cmpModels) => {
  const markedModels = markGQLModels(gql, models);
  return (cmpModels || models).filter(model => markedModels.get(model));
};
