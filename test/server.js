const FS = require('fs');
const Path = require('path');
const { get } = require('lodash');
const { ApolloServer } = require('apollo-server');
const Schema = require('../src/core/Schema');
const Resolver = require('../src/core/Resolver');
const gqlSchema = require('./fixtures/schema');
const stores = require('./stores');

// const loadFile = file => FS.readFileSync(Path.resolve(file), 'utf8');
// const typeDefs = loadFile(`${__dirname}/fixtures/complex.graphql`);

class Server {
  constructor() {
    this.schema = new Schema(gqlSchema, stores);
    const { schema } = this;

    this.server = new ApolloServer({
      playground: {
        settings: {
          'schema.polling.enable': false,
        },
      },
      schema: schema.makeServerApiSchema(),
      context: ({ req }) => {
        const rawHeaders = get(req, 'rawHeaders', []).reduce((prev, key, i, arr) => (i % 2 === 0 ? Object.assign(prev, { [key]: arr[i + 1] }) : prev), {});
        const headers = Object.assign({}, rawHeaders || {}, get(req, 'query', {}));

        return {
          ...headers,
          get autograph() {
            return {
              schema,
              permissions: ['**'],
              legacyMode: true,
              resolver: new Resolver(schema, this),
            };
          },
        };
      },
    });
  }

  async start() {
    await this.schema.setup();

    return this.server.listen(3000).then(({ url, subscriptionsUrl }) => {
      console.log(`Server running: ${url}`);
      console.log(`Subscriptions running: ${subscriptionsUrl}`);
    });
  }
}

new Server().start();
