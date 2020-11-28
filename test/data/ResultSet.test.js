const ResultSet = require('../../src/data/ResultSet');
const Schema = require('../../src/core/Schema');
const Resolver = require('../../src/core/Resolver');
const Query = require('../../src/query/Query');
const gqlSchema = require('../fixtures/schema');
const stores = require('../stores');

const schema = new Schema(gqlSchema, stores);
const resolver = new Resolver(schema, {});
const model = schema.getModel('Person');
const people = Array.from(new Array(1000)).map((person, i) => {
  return {
    id: i,
    name: `name-${i}`,
    emailAddress: `email-${i}`,
    status: `status-${i}`,
    authored: [{
      id: i,
      name: `name-${i}`,
      price: i,
      chapters: [{
        id: i,
        name: `name-${i}`,
      }],
    }],
  };
});

describe('ResultSet', () => {
  // test('getResults', async () => {
  //   console.time('getResults');
  //   const rs = new ResultSet(model, Promise.resolve(people));
  //   await rs.getResults(resolver, new Query());
  //   console.timeEnd('getResults');
  // });

  test('hydrate', async () => {
    // const rs = new ResultSet(model, Promise.resolve(people));
    // const results = await rs.hydrate(resolver, new Query());
  });
});
