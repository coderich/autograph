const { get } = require('lodash');
const Node = require('./Node');
const Type = require('./Type');
const { mergeDeep } = require('../../service/app.service');

module.exports = class Field extends Node {
  constructor(model, ast) {
    super(ast);
    this.model = model;
    this.nodeType = 'field';
    this.schema = model.getSchema();
    this.type = new Type(this.ast);
    this.isArray = this.type.isArray.bind(this.type);
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

  getScalarRef() {
    return this.schema.getScalar(this.getType());
  }

  getEnumRef() {
    return this.schema.getEnum(this.getType());
  }

  getDefaultValue() {
    return this.getDirectiveArg('field', 'default');
  }

  resolveBoundValue(initialValue) {
    if (!this.hasBoundValue()) return Promise.resolve(initialValue);

    let promise;
    const context = this.schema.getContext();
    const { scope, path, merge } = this.getDirectiveArgs('value');

    switch (scope) {
      case 'context': {
        const value = get(context, path);
        promise = (typeof value === 'function') ? Promise.resolve(value()) : Promise.resolve(value);
        break;
      }
      default:
        promise = path.split('.').map();
        break;
    }

    return promise.then(value => Promise.resolve(merge ? mergeDeep(initialValue, value) : value));
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
    return Boolean(this.type.isScalar() || !this.getModelRef());
  }

  isDefaulted() {
    return Boolean(this.hasBoundValue() || this.getDefaultValue() != null);
  }

  isRequired() {
    return Boolean(this.type.isRequired());
  }

  // GQL Schema Methods
  getGQLType(suffix) {
    let type = this.getType();
    const modelType = `${type}${suffix}`;
    if (suffix && !this.isScalar()) type = this.isEmbedded() ? modelType : 'ID';
    // if (this.options.enum) type = `${this.model.getName()}${ucFirst(this.getName())}Enum`;
    type = this.isArray() ? `[${type}]` : type;
    if (!suffix && this.isRequired()) type += '!';
    if (suffix === 'InputCreate' && this.isRequired() && !this.isDefaulted()) type += '!';
    return type;
  }

  getGQLDefinition() {
    const fieldName = this.getName();
    const type = this.getGQLType();
    const ref = this.getDataRef();

    if (ref) {
      if (this.isArray()) return `${fieldName}(first: Int after: String last: Int before: String query: ${ref}InputQuery): Connection`;
      return `${fieldName}(query: ${ref}InputQuery): ${type}`;
    }

    return `${fieldName}: ${type}`;
  }
};
