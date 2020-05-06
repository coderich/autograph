const { Kind } = require('graphql');
const Node = require('./Node');
const Model = require('./Model');

module.exports = class Document extends Node {
  constructor(ast) {
    super(ast);

    this.definitions = ast.definitions.map((definition) => {
      switch (definition.kind) {
        case Kind.OBJECT_TYPE_DEFINITION: return new Model(definition);
        default: return definition;
      }
    });
  }

  getDefinitions() {
    return this.definitions;
  }

  getModels() {
    return this.definitions.filter(d => d instanceof Model);
  }
};
