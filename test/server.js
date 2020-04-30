const { ApolloServer } = require('apollo-server');
const Rule = require('../src/core/Rule');
const Schema = require('../src/core/Schema');
const Resolver = require('../src/core/Resolver');
const gqlSchema = require('./schema');
const stores = require('./stores');

Rule.extend('bookName', Rule.deny('The Bible'));
Rule.extend('bookPrice', Rule.range(0, 100));
Rule.extend('artComment', Rule.allow('yay', 'great', 'boo'));
Rule.extend('colors', Rule.allow('blue', 'red', 'green', 'purple'));
Rule.extend('buildingType', Rule.allow('home', 'office', 'business'));

class Server {
  constructor() {
    const schema = new Schema(gqlSchema, stores);
    const executableSchema = schema.makeServerApiSchema();

    this.server = new ApolloServer({
      schema: executableSchema,
      context: () => ({
        schema,
        permissions: ['**'],
        loader: new Resolver(schema),
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
