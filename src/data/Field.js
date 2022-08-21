const { isEmpty } = require('lodash');
const Type = require('./Type');
const Field = require('../graphql/ast/Field');
const Pipeline = require('./Pipeline');

module.exports = class extends Field {
  constructor(model, field) {
    super(model, JSON.parse(JSON.stringify((field.getAST()))));
    this.type = new Type(field);
    this.model = model;
  }

  getStructures() {
    // Grab structures from the underlying type
    const structures = this.type.getStructures();
    const { isPrimaryKeyId, isIdField, isRequired, isPersistable, isVirtual, isEmbedded, modelRef } = this.props;

    // Structures defined on the field
    const $structures = Object.entries(this.getDirectiveArgs('field', {})).reduce((prev, [key, value]) => {
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

    // IDs (first - shift)
    if (isPrimaryKeyId) $structures.serializers.unshift(Pipeline.idKey);
    if (isIdField) $structures.$serializers.unshift(Pipeline.idField);

    // Required (last - push)
    if (isRequired && isPersistable && !isVirtual) $structures.validators.push(Pipeline.required);
    if (modelRef && !isEmbedded) $structures.validators.push(Pipeline.ensureId);

    return $structures;
  }

  resolve(resolver, doc, args = {}) {
    const { name, isArray, isScalar, isVirtual, isRequired, isEmbedded, modelRef, virtualField } = this.props;
    const value = doc[name];

    // Default resolver return immediately!
    if (isScalar || isEmbedded) return value;

    // Ensure where clause for DB lookup
    args.where = args.where || {};

    if (isArray) {
      if (isVirtual) {
        if (isEmpty(args.where)) args.batch = `${virtualField}`;
        args.where[virtualField] = doc.id;
        return resolver.match(modelRef).merge(args).many();
      }

      // Not a "required" query + strip out nulls
      if (isEmpty(args.where)) args.batch = 'id';
      args.where.id = value;
      return resolver.match(modelRef).merge(args).many();
    }

    if (isVirtual) {
      if (isEmpty(args.where)) args.batch = `${virtualField}`;
      args.where[virtualField] = doc.id;
      return resolver.match(modelRef).merge(args).one();
    }

    return resolver.match(modelRef).id(value).one({ required: isRequired });
  }

  count(resolver, doc, args = {}) {
    const { name, isVirtual, modelRef, virtualField } = this.props;
    args.where = args.where || {};
    if (isVirtual) args.where[virtualField] = doc.id;
    else args.where.id = doc[name];
    return resolver.match(modelRef).merge(args).count();
  }
};
