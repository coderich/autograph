const { graphql, execute, validate } = require('graphql');
const Schema = require('./Schema');

module.exports = class GraphQL {
  constructor(schema) {
    this.schema = (schema instanceof Schema ? schema : new Schema(schema)).makeExecutableSchema();
  }

  exec(source, variableValues) {
    const { schema } = this.schema;
    return graphql({ schema, source, variableValues, contextValue: schema.context });
  }

  execute(source, variableValues) {

  }

  validate(source, variableValues) {

  }
};
