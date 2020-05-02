const Schema = require('../../src/core/Schema');
const stores = require('../stores');
const simpleSchema = require('../simpleSchema');
const noSchema = require('../noSchema');

describe('Schema', () => {
  test('simpleSchema', () => {
    const schema = new Schema(simpleSchema, stores);
    expect(schema).toBeDefined();
    schema.makeServerApiSchema();
  });

  test('noSchema', () => {
    const schema = new Schema(noSchema, stores);
    expect(schema).toBeDefined();
    schema.makeServerApiSchema();
  });
});
