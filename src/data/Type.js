const Type = require('../graphql/ast/Type');
const Rule = require('../core/Rule');
const Transformer = require('../core/Transformer');

module.exports = class extends Type {
  constructor(field) {
    super(field.getAST());
    this.field = field;
  }

  getRules() {
    const rules = [];
    const scalarType = this.field.getScalarRef();
    const enumType = this.field.getEnumRef();

    if (scalarType) {
      Object.entries(scalarType.getDirectiveArgs('field', {})).forEach(([key, value]) => {
        if (!Array.isArray(value)) value = [value];
        if (key === 'enforce') rules.push(...value.map(r => Rule.getInstances()[r]));
      });
    }

    if (enumType) {
      const values = enumType.getValue();
      rules.push(Rule.allow(...values));
    }

    return rules;
  }

  getStructures() {
    const enumType = this.field.getEnumRef();
    const scalarType = this.field.getScalarRef();
    const structures = { rules: [], instructs: [], restructs: [], destructs: [], constructs: [], $serializers: [], serializers: [], $deserializers: [], deserializers: [], transformers: [] };

    if (enumType) structures.rules.push(Rule.allow(...enumType.getValue()));
    if (!scalarType) return structures;

    return Object.entries(scalarType.getDirectiveArgs('field', {})).reduce((prev, [key, value]) => {
      if (!Array.isArray(value)) value = [value];
      if (key === 'enforce') prev.rules.push(...value.map(r => Transformer.getInstances()[r]));
      if (key === 'instruct') prev.instructs.push(...value.map(t => Transformer.getInstances()[t]));
      if (key === 'serialize') prev.serializers.push(...value.map(t => Transformer.getInstances()[t]));
      if (key === 'deserialize') prev.deserializers.push(...value.map(t => Transformer.getInstances()[t]));
      if (key === 'transform') prev.transformers.push(...value.map(t => Transformer.getInstances()[t]));
      return prev;
    }, structures);
  }

  getTransformers() {
    const transformers = [];
    const scalarType = this.field.getScalarRef();

    if (scalarType) {
      Object.entries(scalarType.getDirectiveArgs('field', {})).forEach(([key, value]) => {
        if (!Array.isArray(value)) value = [value];
        if (key === 'transform') transformers.push(...value.map(t => Transformer.getInstances()[t]));
      });
    }

    return transformers;
  }

  getSerializers() {
    const transformers = [];
    const scalarType = this.field.getScalarRef();

    if (scalarType) {
      Object.entries(scalarType.getDirectiveArgs('field', {})).forEach(([key, value]) => {
        if (!Array.isArray(value)) value = [value];
        if (key === 'serialize') transformers.push(...value.map(t => Transformer.getInstances()[t]));
      });
    }

    return transformers;
  }

  getDeserializers() {
    const transformers = [];
    const scalarType = this.field.getScalarRef();

    if (scalarType) {
      Object.entries(scalarType.getDirectiveArgs('field', {})).forEach(([key, value]) => {
        if (!Array.isArray(value)) value = [value];
        if (key === 'deserialize') transformers.push(...value.map(t => Transformer.getInstances()[t]));
      });
    }

    return transformers;
  }
};
