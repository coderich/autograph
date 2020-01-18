const _ = require('lodash');
const { ucFirst, isScalarValue, isScalarDataType } = require('../service/app.service');

module.exports = class Field {
  constructor(schema, model, name, options = {}) {
    this.schema = schema;
    this.model = model;
    this.name = name;
    this.options = options;
    this.toString = () => `${name}`;
  }

  // CRUD
  count(loader, doc, w = {}) {
    const where = _.cloneDeep(w);
    const fieldRef = this.getModelRef();

    if (this.isVirtual()) {
      where[this.getVirtualRef()] = doc.id;
      return loader.match(fieldRef).where(where).count();
    }

    if (!Object.keys(where).length) {
      return (doc[this.getName()] || []).length; // Making big assumption that it's an array
    }

    const ids = (doc[this.getName()] || []);
    where[fieldRef.idField()] = ids;
    return loader.match(fieldRef).where(where).count();
  }

  resolve(loader, doc, q = {}) {
    if (doc == null) return doc;

    const query = _.cloneDeep(q);
    const dataType = this.getDataType();
    const value = doc[this.getAlias()];
    query.where = query.where || {};

    // Scalar Resolvers
    if (this.isScalar()) return value;

    // Array Resolvers
    if (Array.isArray(dataType)) {
      if (this.isVirtual()) {
        query.where[this.getVirtualField().getAlias()] = doc.id;
        return loader.match(dataType[0]).query(query).many({ find: true });
      }
      const valueIds = (value || []).map(v => (isScalarValue(v) ? v : v.id));
      return Promise.all(valueIds.map(id => loader.match(dataType[0]).id(id).one({ required: this.isRequired() }).catch(() => null)));
    }

    // Object Resolvers
    if (this.isVirtual()) {
      query.where[this.getVirtualField().getAlias()] = doc.id;
      return loader.match(dataType).query(query).one({ find: true });
    }

    const id = isScalarValue(value) ? value : value.id;
    return loader.match(dataType).id(id).one({ required: this.isRequired() });
  }

  //

  getName() {
    return this.name;
  }

  getSimpleType() {
    const val = this.getDataType();
    return Array.isArray(val) ? val[0] : val;
  }

  getDataType(field = this.options) {
    switch (field) {
      case String: return 'String';
      case Number: return 'Float';
      case Boolean: return 'Boolean';
      default: {
        if (Array.isArray(field)) { field[0] = this.getDataType(field[0]); return field; }
        if (field instanceof Object) return this.getDataType(field.type);
        return field;
      }
    }
  }

  getGQLType(suffix) {
    let type = this.getSimpleType();
    if (suffix && !isScalarDataType(type)) type = this.options.embedded ? `${type}${suffix}` : 'ID';
    if (this.options.enum) type = `${this.model.getName()}${ucFirst(this.getName())}Enum`;
    type = this.isArray() ? `[${type}]` : type;
    if (suffix !== 'InputUpdate' && this.isRequired()) type += '!';
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

  getDataRef() {
    const ref = this.getSimpleType();
    return isScalarDataType(ref) ? null : ref;
  }

  getModelRef() {
    return this.schema.getModel(this.getDataRef());
  }

  getAlias(alias) {
    return this.options.alias || alias || this.getName();
  }

  getVirtualRef() {
    return this.options.by;
  }

  getVirtualModel() {
    return this.schema.getModel(this.getSimpleType());
  }

  getVirtualField() {
    return this.getVirtualModel().getField(this.getVirtualRef());
  }

  getTransforms() {
    return this.options.transforms;
  }

  getRules() {
    return this.options.rules;
  }

  getOnDelete() {
    return this.options.onDelete;
  }

  isArray() {
    return Array.isArray(this.getDataType());
  }

  isScalar() {
    return isScalarDataType(this.getSimpleType());
  }

  isRequired() {
    return this.options.required;
  }

  isVirtual() {
    return Boolean(this.options.by);
  }

  isImmutable() {
    return this.options.immutable;
  }

  isEmbedded() {
    return this.options.embedded;
  }
};
