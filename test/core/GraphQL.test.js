const { MongoMemoryReplSet } = require('mongodb-memory-server');
const GraphQL = require('../../src/core/GraphQL');
const Schema = require('../../src/core/Schema');
const Resolver = require('../../src/core/Resolver');
// const { eventEmitter } = require('../../src/service/event.service');
const gqlSchema = require('../fixtures/schema');
const stores = require('../stores');

let schema;
let resolver;
let graphql;
let personId;

describe('GraphQL', () => {
  beforeAll(async () => {
    jest.setTimeout(60000);
    const mongoServer = new MongoMemoryReplSet({ replSet: { storageEngine: 'wiredTiger' } });
    await mongoServer.waitUntilRunning();
    stores.default.uri = await mongoServer.getUri();
    schema = new Schema(gqlSchema, stores);
    schema.getServerApiSchema();
    const context = {};
    resolver = new Resolver(schema, context);
    context.autograph = { resolver };
    graphql = new GraphQL(schema, resolver);
  });

  test('exec (create)', async () => {
    expect(schema).toBeDefined();
    expect(graphql).toBeDefined();
    expect(resolver).toBeDefined();

    const result = await graphql.exec(`
      mutation {
        createPerson(input: {
          name: "GraphQL"
          emailAddress: "graphql@gmail.com"
          telephone: null
        }) {
          id
          name
          emailAddress
          telephone
          authored {
            name
            price
          }
        }
      }
    `);

    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(result.errors).not.toBeDefined();
    expect(result.data.createPerson.id).toBeDefined();
    expect(result.data.createPerson.name).toBe('Graphql'); // Titlecase
    expect(result.data.createPerson.telephone).toBe(null); // Explicit null (no default applied)

    // Save off personId
    personId = result.data.createPerson.id;
  });

  test('exec (update)', async () => {
    expect(schema).toBeDefined();
    expect(graphql).toBeDefined();
    expect(resolver).toBeDefined();

    const result = await graphql.exec(`
      mutation {
        updatePerson(id: "${personId}", input: {
          name: "NewName"
        }) {
          id
          name
          emailAddress
          telephone
          authored {
            name
            price
          }
        }
      }
    `);

    expect(result).toBeDefined();
    expect(result.data).toBeDefined();
    expect(result.errors).not.toBeDefined();
    expect(result.data.updatePerson.name).toBe('Newname'); // Titlecase
    expect(result.data.updatePerson.telephone).toBe(null);
  });

  // test('exec with systemEvent override', async () => {
  //   expect(schema).toBeDefined();
  //   expect(graphql).toBeDefined();
  //   expect(resolver).toBeDefined();

  //   // Listen for event (change result)
  //   eventEmitter.onKeys('preMutation', ['createPersony', 'createPerson'], (event, next) => {
  //     next({ id: 1, name: 'NewName', emailAddress: 'emailAddress' });
  //   });

  //   const result = await graphql.exec(`
  //     mutation {
  //       createPerson(input: {
  //         name: "GraphQL"
  //         emailAddress: "graphql@gmail.com"
  //       }) {
  //         id
  //         name
  //         emailAddress
  //         telephone
  //         authored {
  //           name
  //           price
  //         }
  //       }
  //     }
  //   `);

  //   expect(result).toBeDefined();
  //   expect(result.data).toBeDefined();
  //   expect(result.errors).not.toBeDefined();
  //   expect(result.data.createPerson.id).toBeDefined();
  //   expect(result.data.createPerson.name).toBe('Newname'); // Title case
  // });
});
