Error.stackTraceLimit = 50;

// const { MongoMemoryReplSet } = require('mongodb-memory-server');
const Validator = require('validator');
// const Schema = require('../src/core/Schema');
// const Resolver = require('../src/core/Resolver');
// const gqlSchema = require('./fixtures/schema');
// const GraphQL = require('./GraphQL');
// const stores = require('./stores');
const Pipeline = require('../src/data/Pipeline');

Pipeline.define('email', ({ value }) => {
  if (!Validator.isEmail(value)) throw new Error('Invalid email');
});

// beforeAll(async () => {
//   jest.setTimeout(10000);
//   const mongoServer = await MongoMemoryReplSet.create({ replSet: { storageEngine: 'wiredTiger' } });
//   stores.default.uri = mongoServer.getUri();
//   const context = {};
//   const schema = new Schema(gqlSchema, stores).decorate();
//   const resolver = new Resolver(schema, context);
//   context.autograph = { resolver };
//   context.network = { id: 'network' };
//   const graphql = new GraphQL(schema, resolver);
//   Object.assign(global, { graphql, schema, resolver });
// });

// // afterAll();
