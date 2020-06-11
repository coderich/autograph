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

    // Person id
    const personId = schema.getModel('Person').getField('id');
    expect(personId).toBeDefined();
    expect(personId.getKey()).toBe('_id');
    expect(personId.hasGQLScope('c')).toBe(false);
    expect(personId.hasGQLScope('r')).toBe(true);
    expect(personId.hasGQLScope('u')).toBe(false);
    expect(personId.hasGQLScope('d')).toBe(false);

    // Embedded building id
    const building = schema.getModel('Building');
    expect(building.isEmbedded()).toBe(true);
    const buildingId = building.getField('id');
    expect(buildingId).not.toBeDefined();
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
