const Node = require('./Node');
const Type = require('./Type');

module.exports = class Field extends Node {
  constructor(model, ast) {
    super(ast);
    this.model = model;
    this.schema = model.getSchema();
    this.type = new Type(this.ast.type);
    this.isArray = this.type.isArray.bind(this.type);
    this.isRequired = this.type.isRequired.bind(this.type);
  }

  // Field Methods
  getType() {
    return this.type.getName();
  }

  getDataType() {
    const type = this.getType();
    return this.isArray() ? [type] : type;
  }

  getDataRef() {
    return this.isScalar() ? null : this.getType();
  }

  // Model Methods
  getModel() {
    return this.model;
  }

  getModelRef() {
    return this.schema.getModel(this.getType());
  }

  getVirtualField() {
    const model = this.getModelRef();
    return model ? model.getField(this.getVirtualRef()) : null;
  }

  resolveField() {
    const field = this.getVirtualField() || this;
    return field === this ? this : field.resolveField();
  }

  // Boolean Methods
  isScalar() {
    return Boolean(this.type.isScalar() || !this.model.getSchema().getModel(this.getType()));
  }

  isEmbedded() {
    const model = this.getModelRef();
    return Boolean(model && !model.isEntity());
  }
};
