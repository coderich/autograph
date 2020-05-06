const Schema = require('../../src/core/Schema');
const stores = require('../stores');
const simpleSchema = require('../simple.graphql');
const bareSchema = require('../bare.graphql');
const gozioSchema = require('../gozio.graphql');

describe('CoreSchema', () => {
  test('simpleSchema', () => {
    const schema = new Schema({ typeDefs: simpleSchema }, stores);
    expect(schema).toBeDefined();
    // schema.makeServerApiSchema();
  });

  test('bareSchema', () => {
    const schema = new Schema({ typeDefs: bareSchema }, stores);
    expect(schema).toBeDefined();
    // schema.makeServerApiSchema();
  });

  test('gozioSchema', () => {
    const schema = new Schema({ typeDefs: gozioSchema }, stores);
    expect(schema).toBeDefined();
    // schema.makeServerApiSchema();
  });

  // test('schemaPlay', () => {
  //   // const ast = parse(schema.typeDefs);
  //   // console.log(parseValue(schema.typeDefs[0].value));
  //   // console.log(makeExecutableSchema(schema));
  //   // const schema = buildASTSchema(simpleSchema);
  //   // expect(schema).toBeDefined();
  //   // console.log(schema);
  // });
});
