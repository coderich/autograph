const { graphql } = require('graphql');

/**
 * GraphQL.
 *
 * This is a wrapper class to the underlying GraphQL Executable Schema.
 * It can be useful for testing and/or exercising the API as an outside caller would.
 *
 * Reference: https://github.com/graphql/graphql-js/blob/master/src/graphql.js#L32-L33
 */
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
