const { MongoDriver, Neo4jRestDriver, Neo4jDriver } = require('../src/driver');

module.exports = {
  default: {
    Driver: MongoDriver,
    uri: 'mongodb://localhost/autograph',
    options: { useNewUrlParser: true, tlsInsecure: true, useUnifiedTopology: true },
    directives: { version: 4 },
  },
  neo4jDriver: {
    Driver: Neo4jDriver,
    uri: 'bolt://localhost',
  },
  neo4jRest: {
    Driver: Neo4jRestDriver,
    uri: 'http://localhost:7474',
  },
};
