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

  validate(resolver, value, mapper) {
    mapper = mapper || {};
    const modelRef = this.getModelRef();
    const rules = [...this.getRules()];

    if (modelRef) {
      if (isPlainObject(ensureArray(value)[0])) return modelRef.validate(resolver, value, mapper); // Model delegation
      if (!this.isEmbedded()) rules.push(Rule.ensureId());
    }

    return Promise.all(rules.map((rule) => {
      const cmp = mapper[rule.method];
      return rule(this, value, cmp);
    }));
  }

  /**
   * Ensures the value of the field via bound @value + transformations
   */
  transform(resolver, value, serdes = (() => { throw new Error('No Sir Sir SerDes!'); })()) {
    // Determine value
    const $value = serdes === 'serialize' ? this.resolveBoundValue(resolver, value) : value;

    // Determine transformers
    const transformers = [...(serdes === 'serialize' ? this.getSerializers() : this.getDeserializers()), ...this.getTransformers()];

    // Transform
    return transformers.reduce((prev, transformer) => {
      return transformer(this, prev);
    }, this.cast($value));
  }

  /**
   * Ensures the value of the field is appropriate for the driver
   */
  serialize(resolver, value, minimal = false) {
    const modelRef = this.getModelRef();
    const isEmbedded = this.isEmbedded();

    // If embedded, simply delgate
    if (isEmbedded) return modelRef.serialize(resolver, value, minimal);

    // Now, normalize and resolve
    const $value = this.transform(resolver, value, 'serialize');
    if (modelRef && !isEmbedded) return map($value, v => modelRef.idValue(v.id || v));
    return $value;
  }

  deserialize(resolver, value) {
    return this.transform(resolver, value, 'deserialize');
  }

  /**
   * Applies any user-defined @field(resolve: [...methods]) in series
   * This is ONLY run when resolving a value via the $<name> attribute
   */
  resolve(resolver, value) {
    const resolvers = [...this.getResolvers()];

    return promiseChain(resolvers.map(fn => (chain) => {
      return Promise.resolve(fn(this, uvl(this.cast(chain.pop()), value)));
    })).then((results) => {
      return uvl(this.cast(results.pop()), value);
    });
  }
};
