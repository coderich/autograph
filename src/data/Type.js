const Type = require('../graphql/ast/Type');
const Pipeline = require('./Pipeline');

module.exports = class extends Type {
  constructor(field) {
    super(field.getAST());
    this.field = field;
  }

  getStructures() {
    const type = this.field.getType();
    const enumType = this.field.getEnumRef();
    const scalarType = this.field.getScalarRef();
    const structures = { validators: [], instructs: [], restructs: [], destructs: [], constructs: [], $serializers: [], serializers: [], $deserializers: [], deserializers: [], transforms: [] };

    // Built-in pipelines
    structures.castValue = Pipeline.castValue;
    structures.defaultValue = Pipeline.defaultValue;
    structures.ensureArrayValue = Pipeline.ensureArrayValue;

    if (enumType) structures.validators.push(Pipeline.define(`$allow:${type}`, Pipeline.allow(...enumType.getValue()), { configurable: true }));
    if (!scalarType) return structures;

    return Object.entries(scalarType.getDirectiveArgs('field', {})).reduce((prev, [key, value]) => {
      if (!Array.isArray(value)) value = [value];
      if (key === 'validate') prev.validators.push(...value.map(t => Pipeline[t]));
      if (key === 'instruct') prev.instructs.push(...value.map(t => Pipeline[t]));
      if (key === 'restruct') prev.restructs.push(...value.map(t => Pipeline[t]));
      if (key === 'destruct') prev.destructs.push(...value.map(t => Pipeline[t]));
      if (key === 'construct') prev.constructs.push(...value.map(t => Pipeline[t]));
      if (key === 'transform') prev.transforms.push(...value.map(t => Pipeline[t]));
      if (key === 'serialize') prev.serializers.push(...value.map(t => Pipeline[t]));
      if (key === 'deserialize') prev.deserializers.push(...value.map(t => Pipeline[t]));
      return prev;
    }, structures);
  }
};
