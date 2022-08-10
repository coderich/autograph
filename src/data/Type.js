const Type = require('../graphql/ast/Type');
const Pipeline = require('./Pipeline');

module.exports = class extends Type {
  constructor(field) {
    super(field.getAST());
    this.field = field;
  }

  getStructures() {
    const enumType = this.field.getEnumRef();
    const scalarType = this.field.getScalarRef();
    const structures = { rules: [], instructs: [], restructs: [], destructs: [], constructs: [], $serializers: [], serializers: [], $deserializers: [], deserializers: [], transformers: [] };

    if (enumType) structures.rules.push(Pipeline.allow(...enumType.getValue()));
    if (!scalarType) return structures;

    return Object.entries(scalarType.getDirectiveArgs('field', {})).reduce((prev, [key, value]) => {
      if (!Array.isArray(value)) value = [value];
      // if (key === 'enforce') prev.rules.push(...value.map(r => Rule.getInstances()[r]));
      if (key === 'instruct') prev.instructs.push(...value.map(t => Pipeline[t]));
      if (key === 'restruct') prev.restructs.push(...value.map(t => Pipeline[t]));
      if (key === 'destruct') prev.destructs.push(...value.map(t => Pipeline[t]));
      if (key === 'construct') prev.constructs.push(...value.map(t => Pipeline[t]));
      if (key === 'serialize') prev.serializers.push(...value.map(t => Pipeline[t]));
      if (key === 'deserialize') prev.deserializers.push(...value.map(t => Pipeline[t]));
      if (key === 'transform') prev.transformers.push(...value.map(t => Pipeline[t]));
      return prev;
    }, structures);
  }
};
