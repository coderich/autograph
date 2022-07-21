const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const MongoDriver = require('../../src/driver/MongoDriver');
const Schema = require('../../src/core/SchemaDecorator');
const Resolver = require('../../src/core/Resolver');
const typeDefs = require('../fixtures/driver.graphql');
const stores = require('../stores');

describe('MongoDriver', () => {
  let driver, resolver, person, site;

  beforeAll(async () => {
    jest.setTimeout(10000);

    // Start Mongo Server
    const mongoServer = new MongoMemoryReplSet({ replSet: { storageEngine: 'wiredTiger' } });
    await mongoServer.waitUntilRunning();
    stores.default.uri = await mongoServer.getUri();

    // Create mongo client
    const mongoClient = await new MongoClient(stores.default.uri).connect();
    const db = mongoClient.db();

    // Create core classes
    const schema = new Schema({ typeDefs }, stores).decorate();
    resolver = new Resolver(schema, { network: { id: 'networkId' } });
    driver = new MongoDriver({ uri: stores.default.uri });
    await schema.setup();

    // Fixtures
    person = await db.collection('Person').insertOne({ my_age: 40, name: 'Richard', state: 'alive', email_address: 'rich@coderich.com', network: 'networkId' }).then(r => r.ops[0]);
    site = await db.collection('Site').insertOne({
      site_name: 'site1',
      tags: ['tag1', 'tag2', 'tag3'],
      defaultBuilding: { building_name: 'default', building_floors: [{ floor_name: 'def1' }, { floor_name: 'def2' }], tags: ['t1', 't2'] },
      site_buildings: [
        { building_name: 'building1', building_floors: [{ floor_name: 'floor1' }, { floor_name: 'floor2' }], tags: ['tag1', 'tag2'] },
        { building_name: 'building2', building_floors: [{ floor_name: 'floor3' }, { floor_name: 'floor4' }] },
        { building_name: 'building3', building_floors: [{ floor_name: 'floor5' }, { floor_name: 'floor6', tags: ['tag3', 'tag4'] }] },
      ],
    }).then(r => r.ops[0]);
  });

  test('fixtures', () => {
    expect(person).toBeTruthy();
    expect(site).toBeTruthy();
  });

  test('findOne (person)', async () => {
    const toMatchObject = {
      id: expect.anything(),
      age: 40,
      name: 'Richard',
      status: 'alive',
      emailAddress: 'rich@coderich.com',
      network: 'networkId',
    };

    // Driver
    const query = resolver.match('Person').query.match({ _id: person._id }); // eslint-disable-line
    const data = await driver.findOne(query.toDriver());
    expect(data).toMatchObject(toMatchObject);

    // Resolver
    const res = await resolver.match('Person').id(person._id).one(); // eslint-disable-line
    expect(res).toMatchObject(toMatchObject);
  });

  test('findOne (site)', async () => {
    const toMatchObject = {
      id: expect.anything(),
      name: 'site1',
      tags: ['tag1', 'tag2', 'tag3'],
      defaultBuilding: {
        name: 'default',
        tags: ['t1', 't2'],
        floors: [{ name: 'def1' }, { name: 'def2' }],
      },
      buildings: [
        { name: 'building1', floors: [{ name: 'floor1' }, { name: 'floor2' }], tags: ['tag1', 'tag2'] },
        { name: 'building2', floors: [{ name: 'floor3' }, { name: 'floor4' }] },
        { name: 'building3', floors: [{ name: 'floor5' }, { name: 'floor6', tags: ['tag3', 'tag4'] }] },
      ],
    };

    // Driver
    const query = resolver.match('Site').query.match({ _id: site._id }); // eslint-disable-line
    const data = await driver.findOne(query.toDriver());
    expect(data).toMatchObject(toMatchObject);

    // Resolver
    const res = await resolver.match('Site').id(site._id).one(); // eslint-disable-line
    expect(res).toMatchObject(toMatchObject);
  });
});
