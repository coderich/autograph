const { Kind } = require('graphql');
const Node = require('./Node');
const Model = require('./Model');

module.exports = class Schema extends Node {
  constructor(ast) {
    super(ast);

    this.definitions = ast.definitions.map((definition) => {
      switch (definition.kind) {
        case Kind.OBJECT_TYPE_DEFINITION: return new Model(this, definition);
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

  getModel(name) {
    return this.getModels().find(model => model.getName() === name);
  }

  getModelNames() {
    return this.getModels().map(model => model.getName());
  }

  getModelMap() {
    return this.getModels().reduce((prev, model) => Object.assign(prev, { [model.getName()]: model }), {});
  }
};
