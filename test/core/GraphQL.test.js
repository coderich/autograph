// const GraphQL = require('../../src/core/GraphQL');
// const Schema = require('../../src/core/Schema');
// const Resolver = require('../../src/core/Resolver');
// const gqlSchema = require('../fixtures/schema');
// const stores = require('../stores');

// const schema = new Schema(gqlSchema, stores);
// const graphql = new GraphQL(schema);
// const resolver = new Resolver(schema);

// describe('GraphQL', () => {
//   test('exec', async () => {
//     expect(schema).toBeDefined();
//     expect(graphql).toBeDefined();
//     expect(resolver).toBeDefined();

//     const result = await graphql.exec(`
//       mutation {
//         createPerson(input: {
//           name: "GraphQL"
//           emailAddress: "graphql@gmail.com"
//         }) {
//           id
//           name
//         }
//       }
//     `);

//     expect(result).toBeDefined();
//     expect(result.data).toBeDefined();
//     expect(result.errors).not.toBeDefined();
//     expect(result.createPerson.id).toBeDefined();
//     expect(result.createPerson.name).toBe('GraphQL');
//   });
// });
