const { MongoClient } = require('mongodb');
const Pipeline = require('../../src/stream/Pipeline');
const setup = require('../setup');

let resolver, friends, uri, collection;

describe('Pipeline', () => {
  beforeAll(async () => {
    // Setup
    ({ resolver, uri } = await setup());

    // Mongo
    const client = await MongoClient.connect(uri, { useUnifiedTopology: true });
    const db = client.db();
    collection = db.collection('Person');
    const person = await collection.insert({ name: 'friend1', emailAddress: 'friend1@gmail.com' }).then(r => r.ops[0]);
    friends = [person];
  });

  test('mongodb', async () => {
    const cursor = collection.find();
    const stream = cursor.stream();
    const pipeline = new Pipeline(stream, d => d);
    const data = await pipeline;
    expect(friends).toMatchObject(data);
  });
});
