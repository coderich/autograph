const ASTSchema = require('../../../src/graphql/ast/Schema');
const CoreSchema = require('../../../src/core/Schema');
const baseGraphql = require('./base.graphql');
const stores = require('../../stores');

const validate = (schema) => {
  // Models
  const models = schema.getModels();
  expect(models.map(m => m.getName())).toEqual(expect.arrayContaining(['Person', 'Book']));

  // Fields
  const [Person, Book] = models;
  const [personFields, bookFields] = models.map(m => m.getFields());
  expect(personFields.map(f => f.getName())).toEqual(['name', 'authored', 'emailAddress', 'status', 'age']);
  expect(personFields.map(f => f.getType())).toEqual(['String', 'Book', 'String', 'Mixed', 'Int']);
  expect(personFields.map(f => f.isArray())).toEqual([false, true, false, false, false]);
  expect(personFields.map(f => f.isScalar())).toEqual([true, false, true, true, true]);
  expect(personFields.map(f => f.isRequired())).toEqual([true, false, true, false, false]);
  expect(Person.getField('name').getDirective('field').getArg('transform')).toEqual(['toTitleCase', 'toUpperCase']);
  expect(Person.getRequiredFields().map(f => `${f}`)).toEqual(['name', 'emailAddress']);
  expect(bookFields.map(f => f.getName())).toEqual(['name', 'price', 'author', 'bestSeller', 'bids']);
  expect(bookFields.map(f => f.getType())).toEqual(['String', 'Float', 'Person', 'Boolean', 'Float']);
  expect(bookFields.map(f => f.isArray())).toEqual([false, false, false, false, true]);
  expect(bookFields.map(f => f.isScalar())).toEqual([true, true, false, true, true]);
  expect(bookFields.map(f => f.isRequired())).toEqual([true, true, true, false, false]);
  expect(Book.getField('bestSeller').getDefaultValue()).toBe(false);
};

const validateFull = (schema) => {
  // Models
  const models = schema.getModels();
  expect(models.map(m => m.getName())).toEqual(expect.arrayContaining(['Person', 'Book']));

  // Fields
  const [Person, Book] = models;
  const [personFields, bookFields] = models.map(m => m.getFields());
  expect(personFields.map(f => f.getName())).toEqual(['name', 'authored', 'emailAddress', 'status', 'age', 'id', 'createdAt', 'updatedAt']);
  expect(personFields.map(f => f.getType())).toEqual(['String', 'Book', 'String', 'Mixed', 'Int', 'ID', 'AutoGraphDateTime', 'AutoGraphDateTime']);
  expect(personFields.map(f => f.isArray())).toEqual([false, true, false, false, false, false, false, false]);
  expect(personFields.map(f => f.isScalar())).toEqual([true, false, true, true, true, true, true, true]);
  expect(personFields.map(f => f.isRequired())).toEqual([true, false, true, false, false, false, false, false]);
  expect(Person.getField('name').getDirective('field').getArg('transform')).toEqual(['toTitleCase', 'toUpperCase']);
  expect(Person.getRequiredFields().map(f => `${f}`)).toEqual(['name', 'emailAddress']);
  expect(bookFields.map(f => f.getName())).toEqual(['name', 'price', 'author', 'bestSeller', 'bids', 'id', 'createdAt', 'updatedAt']);
  expect(bookFields.map(f => f.getType())).toEqual(['String', 'Float', 'Person', 'Boolean', 'Float', 'ID', 'AutoGraphDateTime', 'AutoGraphDateTime']);
  expect(bookFields.map(f => f.isArray())).toEqual([false, false, false, false, true, false, false, false]);
  expect(bookFields.map(f => f.isScalar())).toEqual([true, true, false, true, true, true, true, true]);
  expect(bookFields.map(f => f.isRequired())).toEqual([true, true, true, false, false, false, false, false]);
  expect(Book.getField('bestSeller').getDefaultValue()).toBe(false);
};

describe('FNSchema', () => {
  test('AST Base', () => {
    const schema = new ASTSchema({ typeDefs: baseGraphql });
    validate(schema);
    expect(schema.makeExecutableSchema()).toBeDefined();
    validate(schema);
  });

  test('Core Base', () => {
    const schema = new CoreSchema({ typeDefs: baseGraphql }, stores);
    validateFull(schema);
    expect(schema.makeExecutableSchema()).toBeDefined();
    validateFull(schema);
    expect(schema.getServerApiSchema()).toBeDefined();
    expect(schema.getModel('Person').getField('_id').getName()).toBe('id');
    expect(schema.getModel('Person').getField('status').getRules().length).toBe(1);
    expect(schema.getModel('User').getField('gender').getRules().length).toBe(1);
    validateFull(schema);
  });
});
