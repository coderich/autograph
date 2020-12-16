const Driver = require('../src/driver');

module.exports = {
  default: {
    Driver: new Driver('Mongo'),
    uri: 'mongodb://localhost/autograph',
    options: { useNewUrlParser: true, tlsInsecure: true, useUnifiedTopology: true },
    directives: { version: 4 },
  },
  neo4jDriver: {
    Driver: new Driver('Neo4jDriver'),
    uri: 'bolt://localhost',
  },
  neo4jRest: {
    Driver: new Driver('Neo4jRestDriver'),
    uri: 'http://localhost:7474',
  },
};
