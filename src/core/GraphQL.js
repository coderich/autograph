// https://github.com/graphql/graphql-js/blob/master/src/graphql.js#L32-L33
const { graphql } = require('graphql');

module.exports = class GraphQL {
  constructor(schema, resolver) {
    this.schema = schema.makeExecutableSchema();
    this.contextValue = resolver.getContext();
  }

  exec(source, variableValues) {
    const { schema, contextValue = {} } = this;
    return graphql({ schema, source, variableValues, contextValue });
  }
};
