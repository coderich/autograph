const { get } = require('lodash');
const Node = require('./Node');
const Type = require('./Type');
const { uvl } = require('../../service/app.service');

module.exports = class Field extends Node {
  constructor(model, ast) {
    super(ast, 'field');
    this.model = model;
    this.schema = model.getSchema();
    this.type = new Type(this.ast);
    this.key = uvl(this.getDirectiveArg('field', 'key'), this.getName());
    this.isArray = this.type.isArray.bind(this.type);
    this.isArrayElementRequired = this.type.isArrayElementRequired.bind(this.type);
  }

  // Field Methods
  getKey() {
    return this.key;
  }

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

  resolveBoundValue(query, initialValue = this.getDefaultValue()) {
    if (!this.hasBoundValue()) return initialValue;

    const { scope, path } = this.getDirectiveArgs('value');

    switch (scope) {
      case 'context': {
        const { resolver } = query.toObject();
        const context = resolver.getContext();
        const value = get(context, path);
        return (typeof value === 'function') ? value() : value;
      }
      default: return this[path];
    }
  }

  // Model Methods
  getSchema() {
    return this.model.getSchema();
  }

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

  isConnection() {
    // Deliberately need to specify this is a connection
    const connection = Boolean(this.getDirectiveArg('field', 'connection'));
    if (!connection) return false;

    // Also needs to be proper
    const modelRef = this.getModelRef();
    return Boolean(modelRef && modelRef.isMarkedModel() && this.isArray() && !this.isEmbedded());
  }

  isSpliceable() {
    const modelRef = this.getModelRef();
    return Boolean(modelRef && modelRef.isMarkedModel() && this.isArray() && this.isEmbedded() && !this.isVirtual());
  }

  // GQL Schema Methods
  getGQLType(suffix, options = {}) {
    let type = this.getType();
    // if (suffix === 'InputUpdate' && this.isSpliceable()) suffix = 'InputSplice';
    const modelType = `${type}${suffix}`;
    if (suffix && !this.isScalar()) type = this.isEmbedded() ? modelType : 'ID';
    type = this.isArray() ? `[${type}${this.isArrayElementRequired() ? '!' : ''}]` : type;
    if (!suffix && this.isRequired()) type += '!';
    if (!options.splice && suffix === 'InputCreate' && this.isRequired() && !this.isDefaulted()) type += '!';
    return type;
  }

  getExtendArgs() {
    return this.isConnection() ? `(
      where: ${this.getType()}InputWhere
      sortBy: ${this.getType()}InputSort
      limit: Int
      skip: Int
      first: Int
      after: String
      last: Int
      before: String
    )` : '';
  }

  getPayloadType() {
    let type = this.getType();
    const req = this.isRequired() ? '!' : '';
    if (this.getName() === 'id') return 'ID!';
    if (this.isConnection()) return `${type}Connection${req}`;
    type = this.isArray() ? `[${type}${this.isArrayElementRequired() ? '!' : ''}]` : type;
    return `${type}${req}`;
  }
};
