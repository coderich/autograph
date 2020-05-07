const _ = require('lodash');
const Field = require('../graphql/Field');
const Rule = require('../core/Rule');
const Transformer = require('../core/Transformer');
const { isPlainObject, ensureArray, isScalarValue, isScalarDataType } = require('../service/app.service');

module.exports = class extends Field {
  constructor(schema, model, field) {
    super(schema, model, field.getAST());
    this.toString = () => `${field}`;

    this.rules = [];
    this.transformers = [];

    Object.entries(this.getDirectiveArgs('field', {})).forEach(([key, value]) => {
      if (!Array.isArray(value)) value = [value];

      switch (key) {
        case 'enforce': {
          this.rules.push(...value.map(r => Rule.getInstances()[r]));
          break;
        }
        case 'transform': {
          this.transformers.push(...value.map(t => Transformer.getInstances()[t]));
          break;
        }
        default: {
          break;
        }
      }
    });

    if (this.isRequired() && this.getType() !== 'ID') this.rules.push(Rule.required()); // Required rule
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

  cast(value) {
    const casted = Transformer.cast(this.getType())(this, value);
    return this.isArray() ? ensureArray(casted) : casted;
  }

  serialize(value, mapper) {
    return this.transform(value, mapper, true);
  }

  transform(value, mapper = {}, serialize) {
    const modelRef = this.getModelRef();
    const transformers = [...this.transformers];

    // // Delegate transformations to the actual field responsible
    // const field = this.resolveField();
    // if (field !== this) return field.transform(value, mapper, serialize);

    // If we're a dataRef field, need to either id(value) or delegate object to model
    if (modelRef) {
      if ((!serialize || !modelRef.isEntity()) && isPlainObject(ensureArray(value)[0])) return modelRef.transform(value, mapper); // delegate
      if (serialize) transformers.push(Transformer.serialize()); // Serializer
      transformers.push(Transformer.toId());
    }

    // Perform transformation
    return transformers.reduce((prev, transformer) => {
      const cmp = mapper[transformer.method];
      return transformer(this, prev, cmp);
    }, this.cast(value));
  }

  validate(value, mapper = {}) {
    const modelRef = this.getModelRef();
    const rules = [...this.rules];

    // // Delegate transformations to the actual field responsible
    // const field = this.resolveField();
    // if (field !== this) return field.validate(value, mapper);

    if (modelRef) {
      if (isPlainObject(ensureArray(value)[0])) return modelRef.validate(value, mapper); // Model delegation
      rules.push(Rule.ensureId());
    }

    return Promise.all(rules.map((rule) => {
      const cmp = mapper[rule.method];
      return rule(this, value, cmp);
    }));
  }

  getGQLType(suffix) {
    let type = this.getType();
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
