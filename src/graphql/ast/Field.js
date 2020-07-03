const { get } = require('lodash');
const Node = require('./Node');
const Type = require('./Type');
const { mergeDeep } = require('../../service/app.service');

module.exports = class Field extends Node {
  constructor(model, ast) {
    super(ast, 'field');
    this.model = model;
    this.schema = model.getSchema();
    this.type = new Type(this.ast);
    this.isArray = this.type.isArray.bind(this.type);
    this.isArrayElementRequired = this.type.isArrayElementRequired.bind(this.type);
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

  getFieldRef() {
    const ref = this.getDirectiveArg('field', 'ref');
    const modelRef = this.getModelRef();
    if (!ref || !modelRef) return null;
    return modelRef.getField(ref);
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
    return this.type.isRequired() && this.getName() !== 'id';
  }

  isReference() {
    return Boolean(this.getDirectiveArg('field', 'ref'));
  }

  // GQL Schema Methods
  getGQLType(suffix, options = {}) {
    let type = this.getType();
    const modelType = `${type}${suffix}`;
    if (suffix && !this.isScalar()) type = this.isEmbedded() ? modelType : 'ID';
    type = this.isArray() ? `[${type}${this.isArrayElementRequired() ? '!' : ''}]` : type;
    if (!suffix && this.isRequired()) type += '!';
    if (!options.splice && suffix === 'InputCreate' && this.isRequired() && !this.isDefaulted()) type += '!';
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
