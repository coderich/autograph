const { MongoMemoryReplSet } = require('mongodb-memory-server');
const GraphQL = require('../src/core/GraphQL');
const Schema = require('../src/core/Schema');
const Resolver = require('../src/core/Resolver');
const gqlSchema = require('./fixtures/schema');
const stores = require('./stores');

module.exports = async (context = {}) => {
  jest.setTimeout(60000);
  const mongoServer = new MongoMemoryReplSet({ replSet: { storageEngine: 'wiredTiger' } });
  await mongoServer.waitUntilRunning();
  const uri = await mongoServer.getUri();
  stores.default.uri = uri;
  const schema = new Schema(gqlSchema, stores);
  schema.getServerApiSchema();
  const resolver = new Resolver(schema, context);
  context.autograph = { resolver };
  const graphql = new GraphQL(schema, resolver);
  return { graphql, schema, resolver, uri };
};
