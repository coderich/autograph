const Query = require('../../src/query/Query');
const { resolveWhereClause } = require('../../src/query/QueryService');
const setup = require('../setup');

let schema, resolver;
let person1, person2, book1, book2, chapter1;

describe('QueryService', () => {
  beforeAll(async () => {
    // Setup
    ({ schema, resolver } = await setup());

    // Fixtures
    person1 = await resolver.match('Person').save({ name: 'person1', emailAddress: 'person1@gmail.com' });
    person2 = await resolver.match('Person').save({ name: 'person2', emailAddress: 'person2@gmail.com' });
    await resolver.match('Person').id(person1.id).save({ friends: [person2.id] });
    book1 = await resolver.match('Book').save({ name: 'book1', price: 9.99, author: person1.id });
    book2 = await resolver.match('Book').save({ name: 'book2', price: 99.99, author: person2.id });
    chapter1 = await resolver.match('Chapter').save({ name: 'chapter1', book: book1.id });
    await resolver.match('Chapter').save({ name: 'chapter2', book: book2.id });
  });

  describe('resolveWhereClause', () => {
    test('Simple where clauses', async () => {
      const model = schema.getModel('Person');
      expect(await resolveWhereClause(new Query({ resolver, model, where: {} }))).toEqual({});
      expect(await resolveWhereClause(new Query({ resolver, model }).where({ name: 'name' }))).toEqual({ name: 'name' });
      expect(await resolveWhereClause(new Query({ resolver, model }).where({ name: 'name', age: 'age' }))).toEqual({ name: 'name', age: 'age' });
    });

    test('FK where clauses', async () => {
      let model = schema.getModel('Person');
      expect(await resolveWhereClause(new Query({ resolver, model }).where({ authored: book1.id }))).toEqual({ id: person1.id });
      expect(await resolveWhereClause(new Query({ resolver, model }).where({ authored: [book1.id] }))).toEqual({ id: person1.id });
      expect(await resolveWhereClause(new Query({ resolver, model }).where({ authored: [person1.id, book1.id] }))).toEqual({ id: person1.id });
      expect(await resolveWhereClause(new Query({ resolver, model }).where({ authored: { name: 'book1' } }))).toEqual({ id: person1.id });
      expect(await resolveWhereClause(new Query({ resolver, model }).where({ authored: [person1.id, { name: 'book1' }] }))).toEqual({ id: person1.id });
      expect(await resolveWhereClause(new Query({ resolver, model }).where({ authored: [{ name: 'book1' }, person1.id] }))).toEqual({ id: person1.id });

      model = schema.getModel('Book');
      expect(await resolveWhereClause(new Query({ resolver, model }).where({ author: person1.id }))).toEqual({ author: person1.id });
      expect(await resolveWhereClause(new Query({ resolver, model }).where({ author: `${person1.id}` }))).toEqual({ author: `${person1.id}` });
      expect(await resolveWhereClause(new Query({ resolver, model }).where({ author: { name: 'person1' } }))).toEqual({ author: person1.id });
      expect(await resolveWhereClause(new Query({ resolver, model }).where({ author: { name: ['person', 'person1'] } }))).toEqual({ author: person1.id });
      expect(await resolveWhereClause(new Query({ resolver, model }).where({ author: [{ name: 'person' }, { name: 'person1' }] }))).toEqual({ author: person1.id });
      expect(await resolveWhereClause(new Query({ resolver, model }).where({ author: [{ name: 'person' }, person1.id] }))).toEqual({ author: person1.id });
      expect(await resolveWhereClause(new Query({ resolver, model }).where({ author: { authored: { name: '*' } } }))).toEqual({ author: [person1.id, person2.id] });
      expect(await resolveWhereClause(new Query({ resolver, model }).where({ chapters: [{ name: 'chapter' }, chapter1.id] }))).toEqual({ id: book1.id });
    });
  });
});
