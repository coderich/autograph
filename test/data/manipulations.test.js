const { MongoMemoryReplSet } = require('mongodb-memory-server');
const Schema = require('../../src/core/Schema');
const Resolver = require('../../src/core/Resolver');
const gqlSchema = require('../fixtures/schema');
const stores = require('../stores');

let schema;
let resolver;
let rawPerson;

describe('DataManipulations', () => {
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
    const result = await resolver.raw('Person').insertOne({ name: 'name' });
    ([rawPerson] = result.ops);
  });

  test('person', async () => {
    expect(rawPerson).toBeDefined();
    expect(rawPerson._id).toBeDefined(); // eslint-disable-line no-underscore-dangle
    expect(rawPerson.name).toEqual('name');
    expect(rawPerson.telephone).toBeUndefined();
  });

  test('getPerson', async () => {
    const person = await resolver.match('Person').id(rawPerson._id).one(); // eslint-disable-line no-underscore-dangle
    expect(person).toBeDefined();
    expect(person.name).toEqual('Name');
    expect(person.$manipulate).toBeDefined();
    expect(await person.$manipulate).toBe(5);
    // expect(person.telephone).toEqual('###-###-####');
  });
});
