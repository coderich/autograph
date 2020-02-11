const _ = require('lodash');
const { isScalarValue } = require('../service/app.service');

module.exports = class Field {
  constructor(schema, model, field) {
    this.schema = schema;
    this.model = model;
    this.field = field;
    this.toString = () => `${field}`;
  }

  // CRUD
  count(resolver, doc, w = {}) {
    const where = _.cloneDeep(w);
    const fieldRef = this.getModelRef();

    if (this.isVirtual()) {
      where[this.getVirtualRef()] = doc.id;
      return resolver.match(fieldRef).where(where).count();
    }

    if (!Object.keys(where).length) {
      return (doc[this.getName()] || []).length; // Making big assumption that it's an array
    }

    const ids = (doc[this.getName()] || []);
    where[fieldRef.idField()] = ids;
    return resolver.match(fieldRef).where(where).count();
  }

  resolve(resolver, doc, q = {}) {
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
        return resolver.match(dataType[0]).query(query).many({ find: true });
      }
      const valueIds = (value || []).map(v => (isScalarValue(v) ? v : v.id));
      return Promise.all(valueIds.map(id => resolver.match(dataType[0]).id(id).one({ required: this.isRequired() }).catch(() => null)));
    }

    // Object Resolvers
    if (this.isVirtual()) {
      query.where[this.getVirtualField().getAlias()] = doc.id;
      return resolver.match(dataType).query(query).one({ find: true });
    }

    return resolver.match(dataType).id(value).one({ required: this.isRequired() });
  }

  // Transitional

  cast(value) {
    return this.field.cast(value);
  }

  getModelRef() {
    return this.schema.getModel(this.getDataRef());
  }

  getVirtualModel() {
    return this.schema.getModel(this.getSimpleType());
  }

  getVirtualField() {
    return this.getVirtualModel().getField(this.getVirtualRef());
    // return this.field.getVirtualField();
  }

  // GTG

  getName() {
    return this.field.getName();
  }

  getSimpleType() {
    return this.field.getType();
  }

  getDataType() {
    return this.field.getDataType();
  }

  getDataRef() {
    return this.field.getDataRef();
  }

  isArray() {
    return this.field.isArray();
  }

  isScalar() {
    return this.field.isScalar();
  }

  isRequired() {
    return this.field.isRequired();
  }

  getAlias(defaultValue) {
    return this.field.getAlias(defaultValue);
  }

  isVirtual() {
    return this.field.isVirtual();
  }

  getVirtualRef() {
    return this.field.getVirtualRef();
  }

  isEmbedded() {
    return this.field.isEmbedded();
  }

  getOnDelete() {
    return this.field.getDirectiveArg('quin', 'onDelete');
  }

  isImmutable() {
    return Boolean(this.field.getDirectiveArg('quin', 'immutable'));
  }

  serialize(value, mapper) {
    return this.field.serialize(value, mapper);
  }

  transform(value, mapper) {
    return this.field.transform(value, mapper);
  }

  validate(value, mapper) {
    return this.field.validate(value, mapper);
  }
};
