module.exports = {
  // neo4j: {
  //   type: 'neo4jDriver',
  //   uri: 'bolt://localhost',
  // },
  default: {
    type: 'mongo',
    uri: 'mongodb://localhost/autograph',
    options: { useNewUrlParser: true, tlsInsecure: true, useUnifiedTopology: true },
    directives: { version: 4 },
  },
};
