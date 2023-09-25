const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { MongoClient } = require('mongodb');
const MongoDriver = require('../../src/driver/MongoDriver');
const Schema = require('../../src/core/Schema');
const Resolver = require('../../src/core/Resolver');
const typeDefs = require('../fixtures/driver.graphql');
const stores = require('../stores');

describe('MongoDriver', () => {
  let driver, resolver, schema, person, site;

  beforeAll(async () => {
    jest.setTimeout(10000);

    // Start Mongo Server
    const mongoServer = await MongoMemoryReplSet.create({ replSet: { storageEngine: 'wiredTiger' } });
    stores.default.uri = mongoServer.getUri();

    // Create mongo client
    const mongoClient = await new MongoClient(stores.default.uri).connect();
    const db = mongoClient.db();

    // Create core classes
    schema = new Schema({ typeDefs }, stores).decorate();
    resolver = new Resolver(schema, { network: { id: 'networkId' } });
    driver = new MongoDriver({ uri: stores.default.uri });
    await schema.setup();

    // Fixtures
    const personObj = { my_age: 40, name: 'Richard', state: 'alive', email_address: 'rich@coderich.com', network: 'networkId' };
    person = await db.collection('Person').insertOne(personObj).then(r => Object.assign(personObj, { _id: r.insertedId }));

    const siteObj = {
      site_name: 'site1',
      tags: ['tag1', 'tag2', 'tag3'],
      defaultBuilding: { building_name: 'default', building_floors: [{ floor_name: 'def1' }, { floor_name: 'def2' }], tags: ['t1', 't2'] },
      site_buildings: [
        { building_name: 'building1', building_floors: [{ floor_name: 'floor1' }, { floor_name: 'floor2' }], tags: ['tag1', 'tag2'] },
        { building_name: 'building2', building_floors: [{ floor_name: 'floor3' }, { floor_name: 'floor4' }] },
        { building_name: 'building3', building_floors: [{ floor_name: 'floor5' }, { floor_name: 'floor6', tags: ['tag3', 'tag4'] }] },
      ],
    };
    site = await db.collection('Site').insertOne(siteObj).then(r => Object.assign(siteObj, { _id: r.insertedId }));
  });

  afterAll(() => {
    return schema.disconnect();
  });

  test('fixtures', () => {
    expect(person).toBeTruthy();
    expect(site).toBeTruthy();
  });

  describe('find', () => {
    test('findOne (person)', async () => {
      const toMatchObject = {
        id: expect.anything(),
        age: 40,
        name: 'Richard',
        status: 'alive',
        emailAddress: 'rich@coderich.com',
        network: 'networkId',
      };

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

      // Resolver
      const res = await resolver.match('Site').id(site._id).one(); // eslint-disable-line
      expect(res).toMatchObject(toMatchObject);
    });
  });

  describe('create', () => {
    test('person', async () => {
      const newPerson = await resolver.match('Person').save({ name: 'suzy', age: 30, emailAddress: 'thesuz@gmail.com' });
      expect(newPerson).toMatchObject({ id: expect.anything(), name: 'suzy', age: 30 });
    });
  });
});
