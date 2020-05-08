const Schema = require('../../src/core/Schema');
const stores = require('../stores');
const simpleSchema = require('../fixtures/simple.graphql');
const bareSchema = require('../fixtures/bare.graphql');
const complexSchema = require('../fixtures/complex.graphql');

describe('CoreSchema', () => {
  test('simpleSchema', () => {
    const schema = new Schema({ typeDefs: simpleSchema }, stores);
    expect(schema).toBeDefined();
    schema.makeServerApiSchema();
  });

  test('bareSchema', () => {
    const schema = new Schema({ typeDefs: bareSchema }, stores);
    expect(schema).toBeDefined();
    schema.makeServerApiSchema();
  });

  test('complexSchema', () => {
    const schema = new Schema({ typeDefs: complexSchema }, stores);
    expect(schema).toBeDefined();
    schema.makeServerApiSchema();
  });
});
