const _ = require('lodash');
const Field = require('../graphql/Field');
const { isScalarValue, isScalarDataType } = require('../service/app.service');

module.exports = class extends Field {
  constructor(schema, model, field) {
    super(schema, model, field.getAST());

    this.schema = schema;
    this.model = model;
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

  getSimpleType() {
    return this.getType();
  }

  getOnDelete() {
    return this.getDirectiveArg('field', 'onDelete');
  }

  isImmutable() {
    const enforce = this.getDirectiveArg('field', 'enforce', '');
    return Boolean(JSON.stringify(enforce).indexOf('immutable') > -1);
  }

  //

  getGQLType(suffix) {
    let type = this.getSimpleType();
    const isModel = Boolean(this.getDataRef());
    if (suffix && !isScalarDataType(type)) type = (this.isEmbedded() ? (isModel ? `${type}${suffix}` : type) : 'ID');
    // if (this.options.enum) type = `${this.model.getName()}${ucFirst(this.getName())}Enum`;
    type = this.isArray() ? `[${type}]` : type;
    if (suffix !== 'InputUpdate' && this.isRequired()) type += '!';
    return type;
  }

  getGQLDefinition() {
    const fieldName = this.getName();
    const type = this.getGQLType();
    const ref = this.getDataRef();

    // console.log(fieldName, ref, typeof ref);

    if (ref) {
      if (this.isArray()) return `${fieldName}(first: Int after: String last: Int before: String query: ${ref}InputQuery): Connection`;
      return `${fieldName}(query: ${ref}InputQuery): ${type}`;
    }

    return `${fieldName}: ${type}`;
  }
};
