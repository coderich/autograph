const Path = require('path');
const Schema = require('../../../src/graphql/core/Schema');

describe('Schema', () => {
  const schema = new Schema();
  const modulePath = Path.join(__dirname, 'modules');

  test('appendSchemaFromDirectory', () => {
    schema.appendSchemaFromDirectory(modulePath);
    expect(Object.keys(schema.models).sort()).toEqual(['Person', 'Book'].sort());
    expect(Object.keys(schema.models.Person.fields).sort()).toEqual(['name', 'authored', 'emailAddress', 'status', 'age'].sort());
    expect(Object.keys(schema.models.Book.fields).sort()).toEqual(['name', 'price', 'author', 'bestSeller', 'bids'].sort());
  });

  test('appendSchemaFromDirectory', () => {
    schema.appendSchemaFromDirectory(modulePath);
    expect(Object.keys(schema.models).sort()).toEqual(['Person', 'Book'].sort());
    expect(Object.keys(schema.models.Person.fields).sort()).toEqual(['name', 'authored', 'emailAddress', 'status', 'age'].sort());
    expect(Object.keys(schema.models.Book.fields).sort()).toEqual(['name', 'price', 'author', 'bestSeller', 'bids'].sort());
  });
});
