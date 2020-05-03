// const { buildSchema, printSchema } = require('graphql');
const Schema = require('../../src/core/Schema');
const stores = require('../stores');
const simpleSchema = require('../simple.graphql');
const bareSchema = require('../bare.graphql');
const gozioSchema = require('../gozio.graphql');

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

  test('gozioSchema', () => {
    const schema = new Schema({ typeDefs: gozioSchema }, stores);
    expect(schema).toBeDefined();
    schema.makeServerApiSchema();
  });

  // test('buildSchema', () => {
  //   const schema1 = buildSchema('type User { name: String }');
  //   expect(schema1).toBeDefined();
  //   const s = printSchema(schema1);
  //   console.log(s);
  //   const schema2 = buildSchema(s);
  //   expect(schema2).toBeDefined();
  // });
});
