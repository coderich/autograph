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
      if (`${field.getModelRef()}` === `${parentModel}`) {
        if (model.isEntity()) {
          prev.push({ model, field, isArray: field.isArray(), op: field.getOnDelete() });
        } else {
          prev.push(...exports.identifyOnDeletes(models, model).map(od => Object.assign(od, { fieldRef: field, isArray: field.isArray(), op: field.getOnDelete() })));
        }
      }
    });

    // Assign model referential integrity
    return uniqWith(prev, (a, b) => `${a.model}:${a.field}:${a.fieldRef}:${a.op}` === `${b.model}:${b.field}:${b.fieldRef}:${b.op}`);
  }, []);
};
