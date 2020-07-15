// https://github.com/graphql/graphql-js/blob/master/src/graphql.js#L32-L33
const { graphql } = require('graphql');
const Resolver = require('./Resolver');

module.exports = class GraphQL {
  constructor(schema) {
    this.schema = schema.makeExecutableSchema();
    this.contextValue = schema.getContext();
  }

  exec(source, variableValues) {
    const { schema, contextValue } = this;
    const autograph = { resolver: new Resolver(schema) };

    return graphql({
      schema,
      source,
      variableValues,
      contextValue: { autograph, ...contextValue },
    });
  }
};
