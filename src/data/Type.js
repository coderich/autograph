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

  getResolvers() {
    const transformers = [];
    const scalarType = this.field.getScalarRef();

    if (scalarType) {
      Object.entries(scalarType.getDirectiveArgs('field', {})).forEach(([key, value]) => {
        if (!Array.isArray(value)) value = [value];
        if (key === 'resolve') transformers.push(...value.map(t => Transformer.getInstances()[t]));
      });
    }

    return transformers;
  }
};
