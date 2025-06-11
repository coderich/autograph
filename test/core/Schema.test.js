const FS = require('fs');
const Path = require('path');
const Schema = require('../../src/core/Schema');
const stores = require('../stores');

const simpleSchema = FS.readFileSync(Path.resolve(__dirname, '../fixtures/simple.graphql'), 'utf-8');
const bareSchema = FS.readFileSync(Path.resolve(__dirname, '../fixtures/bare.graphql'), 'utf-8');
const complexSchema = FS.readFileSync(Path.resolve(__dirname, '../fixtures/complex.graphql'), 'utf-8');

describe('CoreSchema', () => {
  test('simpleSchema', () => {
    const schema = new Schema({ typeDefs: simpleSchema }, stores);
    expect(schema).toBeDefined();
    schema.decorate();

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

    return schema.disconnect();
  });

  test('bareSchema', () => {
    const schema = new Schema({ typeDefs: bareSchema }, stores);
    expect(schema).toBeDefined();
    schema.decorate();
    return schema.disconnect();
  });

  test('complexSchema', () => {
    const schema = new Schema({ typeDefs: complexSchema }, stores);
    expect(schema).toBeDefined();
    schema.decorate();
    return schema.disconnect();
  });
});
