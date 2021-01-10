const { resolveModelWhereClause } = require('../../src/service/data.service');
const setup = require('../setup');

let schema;
let resolver;
let person, book;

describe('DataService', () => {
  beforeAll(async () => {
    // Setup
    ({ schema, resolver } = await setup());

    // Fixtures
    const [person1, person2] = await Promise.all([
      resolver.match('Person').save({ name: 'name1', emailAddress: 'name1@gmail.com' }),
      resolver.match('Person').save({ name: 'name2', emailAddress: 'name2@gmail.com' }),
    ]);

    // Save those of interest
    book = await resolver.match('Book').save({ name: 'book', price: 9.99, author: person1.id });
    person = await resolver.match('Person').id(person1.id).save({ friends: [person2.id] });
  });

  describe('resolveModelWhereClause', () => {
    test('Simple where clauses', async () => {
      expect(await resolveModelWhereClause(resolver, schema.getModel('Person'), {})).toEqual({});
      expect(await resolveModelWhereClause(resolver, schema.getModel('Person'), { name: 'name' })).toEqual({ name: 'name' });
      expect(await resolveModelWhereClause(resolver, schema.getModel('Person'), { name: 'name', age: 'age' })).toEqual({ name: 'name', age: 'age' });
    });

    test('FK where clauses', async () => {
      expect(await resolveModelWhereClause(resolver, schema.getModel('Person'), { authored: book.id })).toEqual({ id: [person.id] });
      expect(await resolveModelWhereClause(resolver, schema.getModel('Person'), { authored: { name: 'book' } })).toEqual({ id: [person.id] });
    });
  });
});
