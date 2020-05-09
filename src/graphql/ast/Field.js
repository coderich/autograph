const Node = require('./Node');
const Type = require('./Type');

module.exports = class Field extends Node {
  constructor(model, ast) {
    super(ast);
    this.model = model;
    this.schema = model.getSchema();
    this.type = new Type(this.ast);
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

  isSegmented() {
    return Boolean(this.getSegment());
  }

  // GQL Schema Methods
  getGQLType(suffix) {
    let type = this.getType();
    const isModel = Boolean(this.getDataRef());
    const modelType = isModel ? `${type}${suffix}` : type;
    if (suffix && !this.isScalar()) type = this.isEmbedded() ? modelType : 'ID';
    // if (this.options.enum) type = `${this.model.getName()}${ucFirst(this.getName())}Enum`;
    type = this.isArray() ? `[${type}]` : type;
    if (suffix !== 'InputUpdate' && this.isRequired()) type += '!';
    return type;
  }

  getGQLDefinition() {
    const fieldName = this.getName();
    const type = this.getGQLType();
    const ref = this.getDataRef();
    const model = this.getModelRef();

    if (ref && model.isEntity()) {
      if (this.isArray()) return `${fieldName}(first: Int after: String last: Int before: String query: ${ref}InputQuery): Connection`;
      return `${fieldName}(query: ${ref}InputQuery): ${type}`;
    }

    return `${fieldName}: ${type}`;
  }
};
