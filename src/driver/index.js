/* eslint-disable global-require */
module.exports = class Driver {
  constructor(name) {
    switch (name) {
      case 'Mongo': return require('./MongoDriver');
      // case 'Neo4jDriver': return require('./Neo4jDriver').Neo4jDriver;
      // case 'Neo4jRestDriver': return require('./Neo4jDriver').Neo4jRestDriver;
      default: throw new Error(`Unknown driver ${name}`);
    }
  }
};
