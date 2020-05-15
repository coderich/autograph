const _ = require('lodash');
const Field = require('../graphql/ast/Field');
const Rule = require('../core/Rule');
const Transformer = require('../core/Transformer');
const { isPlainObject, ensureArray, isScalarValue } = require('../service/app.service');

module.exports = class extends Field {
  constructor(model, field) {
    super(model, field.getAST());
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
    const value = doc[this.getName()];
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

  getRules() {
    const rules = [];

    Object.entries(this.getDirectiveArgs('field', {})).forEach(([key, value]) => {
      if (!Array.isArray(value)) value = [value];
      if (key === 'enforce') rules.push(...value.map(r => Rule.getInstances()[r]));
    });

    if (this.isRequired() && this.getType() !== 'ID') rules.push(Rule.required()); // Required rule

    return rules;
  }

  getTransformers() {
    const transformers = [];

    Object.entries(this.getDirectiveArgs('field', {})).forEach(([key, value]) => {
      if (!Array.isArray(value)) value = [value];
      if (key === 'transform') transformers.push(...value.map(t => Transformer.getInstances()[t]));
    });

    return transformers;
  }

  serialize(value, mapper) {
    return this.transform(value, mapper, true);
  }

  transform(value, mapper = {}, serialize) {
    const modelRef = this.getModelRef();
    const transformers = [...this.getTransformers()];

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
    const rules = [...this.getRules()];

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
};
