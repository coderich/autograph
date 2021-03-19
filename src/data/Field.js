const _ = require('lodash');
const Type = require('./Type');
const Field = require('../graphql/ast/Field');
const Rule = require('../core/Rule');
const Transformer = require('../core/Transformer');
const { map, uvl, isPlainObject, ensureArray, promiseChain } = require('../service/app.service');

module.exports = class extends Field {
  constructor(model, field) {
    super(model, JSON.parse(JSON.stringify((field.getAST()))));
    this.type = new Type(field);
    this.model = model;
    this.allSerializers = [...this.getTransformers(), ...this.getSerializers()];
    this.allDeserializers = [...this.getTransformers(), ...this.getDeserializers()];
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
    where[fieldRef.idKey()] = ids;
    return resolver.match(fieldRef).where(where).count();
  }

  cast(value) {
    if (value == null) return value;
    const casted = Transformer.cast(this.getType())(this, value);
    return this.isArray() ? ensureArray(casted) : casted;
  }

  getRules() {
    const rules = [];

    Object.entries(this.getDirectiveArgs('field', {})).forEach(([key, value]) => {
      if (!Array.isArray(value)) value = [value];
      if (key === 'enforce') rules.push(...value.map(r => Rule.getInstances()[r]));
    });

    if (this.isRequired() && this.isPersistable()) rules.push(Rule.required());

    return rules.concat(this.type.getRules());
  }

  getTransformers() {
    const transformers = [];

    Object.entries(this.getDirectiveArgs('field', {})).forEach(([key, value]) => {
      if (!Array.isArray(value)) value = [value];
      if (key === 'transform') transformers.push(...value.map(t => Transformer.getInstances()[t]));
    });

    return transformers.concat(this.type.getTransformers());
  }

  getSerializers() {
    const transformers = [];

    Object.entries(this.getDirectiveArgs('field', {})).forEach(([key, value]) => {
      if (!Array.isArray(value)) value = [value];
      if (key === 'serialize') transformers.push(...value.map(t => Transformer.getInstances()[t]));
    });

    return transformers.concat(this.type.getSerializers());
  }

  getDeserializers() {
    const transformers = [];

    Object.entries(this.getDirectiveArgs('field', {})).forEach(([key, value]) => {
      if (!Array.isArray(value)) value = [value];
      if (key === 'deserialize') transformers.push(...value.map(t => Transformer.getInstances()[t]));
    });

    return transformers.concat(this.type.getDeserializers());
  }

  getResolvers() {
    const resolvers = [];

    Object.entries(this.getDirectiveArgs('field', {})).forEach(([key, value]) => {
      if (!Array.isArray(value)) value = [value];
      if (key === 'resolve') resolvers.push(...value.map(t => Transformer.getInstances()[t]));
    });

    return resolvers.concat(this.type.getResolvers());
  }

  validate(value, mapper) {
    mapper = mapper || {};
    const modelRef = this.getModelRef();
    const rules = [...this.getRules()];

    if (modelRef) {
      if (isPlainObject(ensureArray(value)[0])) return modelRef.validate(value, mapper); // Model delegation
      if (!this.isEmbedded()) rules.push(Rule.ensureId());
    }

    return Promise.all(rules.map((rule) => {
      const cmp = mapper[rule.method];
      return rule(this, value, cmp);
    }));
  }

  normalize(value) {
    // // If embedded; delegate
    // if (this.isEmbedded()) {
    //   const modelRef = this.getModelRef();

    //   return map(value, (doc) => {
    //     return Object.entries(doc).reduce((prev, [k, v]) => {
    //       const field = modelRef.getField(k);
    //       if (!field) return prev;
    //       prev[k] = field.normalize(v);
    //       return prev;
    //     }, {});
    //   });
    // }

    // Determine value
    const $value = this.resolveBoundValue(value);

    // Transform
    return this.getTransformers().reduce((prev, transformer) => {
      return transformer(this, prev);
    }, this.cast($value));
  }

  serialize(value) {
    const modelRef = this.getModelRef();
    const isEmbedded = this.isEmbedded();

    // If embedded, simply delgate
    if (isEmbedded) return modelRef.serialize(value);

    // Now, normalize and resolve
    const $value = this.normalize(value);
    if (modelRef && !isEmbedded) return map($value, v => modelRef.idValue(v.id || v));
    return $value;
  }

  resolve(value) {
    const resolvers = [...this.getResolvers()];

    return promiseChain(resolvers.map(resolver => (chain) => {
      return Promise.resolve(resolver(this, uvl(this.cast(chain.pop()), value)));
    })).then((results) => {
      return uvl(this.cast(results.pop()), value);
    });
  }
};
