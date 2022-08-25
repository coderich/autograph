const { MongoMemoryReplSet } = require('mongodb-memory-server');
const Schema = require('../src/core/Schema');
const Resolver = require('../src/core/Resolver');
const gqlSchema = require('./fixtures/schema');
const GraphQL = require('./GraphQL');
const stores = require('./stores');

module.exports = async (context = {}) => {
  jest.setTimeout(10000);
  const mongoServer = await MongoMemoryReplSet.create({ replSet: { storageEngine: 'wiredTiger' } });
  const uri = mongoServer.getUri();
  stores.default.uri = uri;
  const schema = new Schema(gqlSchema, stores);
  schema.decorate();
  const resolver = new Resolver(schema, context);
  context.autograph = { resolver };
  context.network = { id: 'network' };
  const graphql = new GraphQL(schema, resolver);
  return { graphql, schema, resolver, uri };
};
