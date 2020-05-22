module.exports = {
  // neo4j: {
  //   type: 'neo4jDriver',
  //   uri: 'bolt://localhost',
  // },
  default: {
    type: 'mongo',
    uri: 'mongodb://localhost/autograph',
    version: 4,
  },
};
