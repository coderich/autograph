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
  }

  getStructures() {
    const structures = this.type.getStructures();
    if (this.isIdField()) structures.serializers.push(({ value }) => (value != null ? value : this.model.idValue(value)));
    if (this.getModelRef() && !this.isEmbedded()) structures.rules.push(Rule.ensureId());
    if (this.isRequired() && this.isPersistable() && !this.isVirtual()) structures.rules.push(Rule.required());

    return Object.entries(this.getDirectiveArgs('field', {})).reduce((prev, [key, value]) => {
      if (!Array.isArray(value)) value = [value];
      if (key === 'enforce') prev.rules.push(...value.map(r => Rule.getInstances()[r]));
      if (key === 'instruct') prev.instructs.push(...value.map(t => Transformer.getInstances()[t]));
      if (key === 'serialize') prev.serializers.push(...value.map(t => Transformer.getInstances()[t]));
      if (key === 'deserialize') prev.deserializers.push(...value.map(t => Transformer.getInstances()[t]));
      if (key === 'transform') prev.transformers.push(...value.map(t => Transformer.getInstances()[t]));
      return prev;
    }, structures);
  }

  getRules() {
    const rules = [];

    Object.entries(this.getDirectiveArgs('field', {})).forEach(([key, value]) => {
      if (!Array.isArray(value)) value = [value];
      if (key === 'enforce') rules.push(...value.map(r => Rule.getInstances()[r]));
    });

    if (this.isRequired() && this.isPersistable() && !this.isVirtual()) rules.push(Rule.required());

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

  validate(query, value) {
    const modelRef = this.getModelRef();
    const rules = [...this.getRules()];

    if (modelRef && !this.isEmbedded()) rules.push(Rule.ensureId());

    return Promise.all(rules.map((rule) => {
      return rule(this, value, query);
    })).then((res) => {
      if (modelRef && isPlainObject(ensureArray(value)[0])) return modelRef.validate(query, value); // Model delegation
      return res;
    });
  }

  /**
   * Ensures the value of the field via bound @value + transformations
   */
  transform(query, value, serdes = (() => { throw new Error('No Sir Sir SerDes!'); })()) {
    // Determine value
    const $value = serdes === 'serialize' ? value : uvl(value, this.getDefaultValue());

    // Determine transformers
    const transformers = [...(serdes === 'serialize' ? this.getSerializers() : this.getDeserializers()), ...this.getTransformers()];

    // Transform
    return transformers.reduce((prev, transformer) => {
      return transformer(this, prev, query);
    }, $value);
  }

  /**
   * Ensures the value of the field is appropriate for the driver
   */
  serialize(query, value, minimal = false) {
    const modelRef = uvl(this.getModelRef(), this.getType() === 'ID' ? this.model : undefined);
    const isEmbedded = this.isEmbedded();

    // If embedded, simply delgate
    if (isEmbedded) return modelRef.serialize(query, value, minimal);

    // Now, normalize and resolve
    const $value = this.transform(query, value, 'serialize');
    if (modelRef && !isEmbedded) return map($value, v => modelRef.idValue(v.id || v));
    return $value;
  }

  deserialize(query, value) {
    return this.transform(query, value, 'deserialize');
  }
};
