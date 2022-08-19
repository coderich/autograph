const { cloneDeep } = require('lodash');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const Query = require('../../../src/query/Query');
const ASTSchema = require('../../../src/graphql/ast/Schema');
const CoreSchema = require('../../../src/core/Schema');
const schemaJS = require('./../../fixtures/schema');
const baseGraphql = require('./base.graphql');
const stores = require('../../stores');
const setup = require('../../setup');

const validate = (schema) => {
  // Models
  const models = schema.getModels();
  expect(models.map(m => m.getName())).toEqual(expect.arrayContaining(['Person', 'Book', 'User']));

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

describe('FNSchema', () => {
  let resolver;

  beforeAll(async () => {
    // Setup
    ({ resolver } = await setup());
  });

  test('AST Base', () => {
    const schema = new ASTSchema({ typeDefs: cloneDeep(baseGraphql) }, makeExecutableSchema).initialize();
    validate(schema);
    expect(schema.makeExecutableSchema()).toBeDefined();
    validate(schema);
  });

  test('Core Base', () => {
    const schema = new CoreSchema({ typeDefs: cloneDeep(baseGraphql) }, stores, makeExecutableSchema).initialize();
    validate(schema);
    expect(schema.makeExecutableSchema()).toBeDefined();
    validate(schema);
    expect(schema.decorate()).toBeDefined();
    expect(schema.getModel('Person').getField('_id').getName()).toBe('id');
    expect(schema.getModel('Person').getField('status').getStructures().serializers.length).toBe(1);
    expect(schema.getModel('User').getField('gender').getStructures().serializers.length).toBe(1);
  });

  test('getShape', () => {
    const schema = new CoreSchema(schemaJS, stores, makeExecutableSchema).decorate();
    const artModel = schema.getModel('Art');
    expect(artModel).toBeDefined();

    // Shape
    const shape = artModel.getShape('create');
    expect(shape).toEqual(expect.arrayContaining([
      expect.objectContaining({ from: 'id' }),
      expect.objectContaining({ from: 'name' }),
      expect.objectContaining({ from: 'bids' }),
      expect.objectContaining({ from: 'comments' }),
      expect.objectContaining({
        from: 'sections',
        shape: expect.arrayContaining([
          expect.objectContaining({ from: 'id' }),
          expect.objectContaining({ from: 'name' }),
          expect.objectContaining({ from: 'person' }),
          expect.objectContaining({ from: 'description' }),
        ]),
      }),
    ]));

    // Shape Object
    const obj = artModel.shapeObject(shape, { name: 'art1', sections: [{ name: 'section1' }] }, new Query().resolver(resolver));
    expect(obj).toMatchObject({
      _id: expect.anything(),
      name: 'Art1',
      sections: [{ _id: expect.anything(), name: 'section1' }],
    });
  });
});
