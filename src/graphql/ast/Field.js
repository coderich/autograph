const Node = require('./Node');
const Type = require('./Type');

module.exports = class Field extends Node {
  constructor(model, ast) {
    super(ast);
    this.model = model;
    this.type = new Type(this.ast.type);
    this.isArray = this.type.isArray.bind(this.type);
  }

  getType() {
    return this.type.getName();
  }

  getModel() {
    return this.model;
  }

  getModelRef() {
    return this.model.getSchema().getModel(this.getType());
  }

  isScalar() {
    return Boolean(this.type.isScalar() || !this.model.getSchema().getModel(this.getType()));
  }

  isEmbedded() {
    const model = this.getModelRef();
    return Boolean(model && !model.isEntity());
  }
};
