/* eslint-disable */
exports.require = (name) => {
  switch (name) {
    case 'mongo': return require('./MongoDriver');
    case 'neo4jDriver': return require('./Neo4jDriver').Neo4jDriver;
    case 'neo4jRest': return require('./Neo4jDriver').Neo4jRestDriver;
    case 'redis': return require('./RedisDriver');
    default: throw new Error(`Unknown driver '${name}'`);
  }
};
