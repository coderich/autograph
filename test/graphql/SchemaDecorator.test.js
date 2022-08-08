const Path = require('path');
const Schema = require('../../src/graphql/ast/Schema');
const schemaFixtures = require('../fixtures/schema');

describe('Schema', () => {
  test('mergeSchemaFromFiles', async () => {
    const schema = new Schema();
    const modulePath = Path.join(__dirname, 'modules');

    //
    await schema.mergeSchemaFromFiles(`${modulePath}/**/*.{js,gql,graphql}`).then(s => s.decorate());
    const [Person, Book] = [schema.getModel('Person'), schema.getModel('Book')];
    const [personFields, bookFields] = [Object.values(Person.getFields()), Object.values(Book.getFields())];
    expect(personFields.map(f => f.toString())).toEqual(['name', 'authored', 'emailAddress', 'status', 'age', 'id', 'createdAt', 'updatedAt']);
    expect(personFields.map(f => f.getType())).toEqual(['String', 'BookConnection', 'String', 'Mixed', 'Int', 'ID', 'AutoGraphDateTime', 'AutoGraphDateTime']);
    expect(personFields.map(f => f.isArray())).toEqual([false, false, false, false, false, false, false, false]);
    expect(personFields.map(f => f.isScalar())).toEqual([true, true, true, true, true, true, true, true]);
    expect(personFields.map(f => f.isRequired())).toEqual([true, false, true, false, false, false, false, false]);
    expect(Person.getField('name').getDirective('field').getArg('transform')).toEqual(['toTitleCase', 'toUpperCase']);
    expect(Person.getRequiredFields().map(f => `${f}`)).toEqual(['name', 'emailAddress']);
    expect(bookFields.map(f => f.toString())).toEqual(['name', 'price', 'author', 'bestSeller', 'bids', 'id']);
    expect(bookFields.map(f => f.getType())).toEqual(['String', 'Float', 'Person', 'Boolean', 'Float', 'ID']);
    expect(bookFields.map(f => f.isArray())).toEqual([false, false, false, false, true, false]);
    expect(bookFields.map(f => f.isScalar())).toEqual([true, true, false, true, true, true]);
    expect(bookFields.map(f => f.isRequired())).toEqual([true, true, true, false, false, false]);
    expect(Book.getField('bestSeller').getDefaultValue()).toBe(false);

    // Executable schema
    const xschema = schema.makeExecutableSchema();
    expect(xschema).toBeDefined();
  });

  test('schema fixture', () => {
    const schema = new Schema(schemaFixtures).decorate();
    expect(schema).toBeDefined();

    const xschema = schema.makeExecutableSchema();
    expect(xschema).toBeDefined();
  });
});
