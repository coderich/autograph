const Path = require('path');
const Schema = require('../../../src/graphql/core/Schema');

describe('Schema', () => {
  const schema = new Schema();
  const modulePath = Path.join(__dirname, 'modules');

  test('appendSchemaFromDirectory', () => {
    schema.appendSchemaFromDirectory(modulePath);
    schema.makeExecutableSchema();
    expect(schema).toBeDefined();
  });
});
