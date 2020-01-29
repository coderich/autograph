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
      return resolver.spot(fieldRef).where(where).count();
    }

    if (!Object.keys(where).length) {
      return (doc[this.getName()] || []).length; // Making big assumption that it's an array
    }

    const ids = (doc[this.getName()] || []);
    where[fieldRef.idField()] = ids;
    return resolver.spot(fieldRef).where(where).count();
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
        return resolver.spot(dataType[0]).query(query).many({ find: true });
      }
      const valueIds = (value || []).map(v => (isScalarValue(v) ? v : v.id));
      return Promise.all(valueIds.map(id => resolver.spot(dataType[0]).id(id).one({ required: this.isRequired() }).catch(() => null)));
    }

    // Object Resolvers
    if (this.isVirtual()) {
      query.where[this.getVirtualField().getAlias()] = doc.id;
      return resolver.spot(dataType).query(query).one({ find: true });
    }

    // const id = isScalarValue(value) ? value : value.id;
    // console.log(typeof value, value, id);
    return resolver.spot(dataType).id(value).one({ required: this.isRequired() });
  }

  // Transitional

  getModelRef() {
    return this.schema.getModel(this.getDataRef());
    // return this.field.getModelRef();
  }

  getVirtualModel() {
    return this.schema.getModel(this.getSimpleType());
    // return this.field.getVirtualModel();
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
    return this.field.getSimpleType();
  }

  getDataType() {
    return this.field.getDataType();
  }

  getDataRef() {
    return this.field.getDataRef();
  }

  getAlias(defaultValue) {
    return this.field.getAlias(defaultValue);
  }

  getVirtualRef() {
    return this.field.getVirtualRef();
  }

  getTransforms() {
    return this.field.getTransforms();
  }

  getRules() {
    return this.field.getRules();
  }

  getOnDelete() {
    return this.field.getOnDelete();
  }

  isArray() {
    return this.field.isArray();
  }

  isScalar() {
    return this.field.isScalar();
  }

  isVirtual() {
    return this.field.isVirtual();
  }

  isEmbedded() {
    return this.field.isEmbedded();
  }

  isRequired() {
    return this.field.isRequired();
  }

  isImmutable() {
    return this.field.isImmutable();
  }

  validate(value, mapper) {
    return this.field.validate(value, mapper);
  }
};
