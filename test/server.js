const { ApolloServer } = require('apollo-server');
const { importSchema } = require('graphql-import');
const Schema = require('../src/core/Schema');
const Resolver = require('../src/core/Resolver');
const gqlSchema = require('./fixtures/schema');
const stores = require('./stores');

class Server {
  constructor() {
    // const typeDefs = importSchema(`${__dirname}/fixtures/complex.graphql`);
    const schema = new Schema(gqlSchema, stores);
    const executableSchema = schema.makeServerApiSchema();

    this.server = new ApolloServer({
      schema: executableSchema,
      context: () => ({
        autograph: {
          schema,
          permissions: ['**'],
          legacyMode: true,
          loader: new Resolver(schema),
        },
      }),
    });
  }

  start() {
    this.server.listen(3000).then(({ url, subscriptionsUrl }) => {
      console.log(`Server running: ${url}`);
      console.log(`Subscriptions running: ${subscriptionsUrl}`);
    });
  }
}

new Server().start();
