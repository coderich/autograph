const { Kind } = require('graphql');
const AbstractSourceTree = require('./AbstractSourceTree');
const Model = require('./Model');

module.exports = class Document extends AbstractSourceTree {
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
