const Schema = require('../../src/core/Schema');
const stores = require('../stores');
const simpleSchema = require('../simpleSchema');

describe('Schema', () => {
  test('simpleSchema', () => {
    const schema = new Schema(simpleSchema, stores);
    expect(schema).toBeDefined();
  });
});
