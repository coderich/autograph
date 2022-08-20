const { isEmpty } = require('lodash');
const Type = require('./Type');
const Field = require('../graphql/ast/Field');
const Boom = require('../core/Boom');
const Pipeline = require('./Pipeline');
const { map, isPlainObject, ensureArray } = require('../service/app.service');

module.exports = class extends Field {
  constructor(model, field) {
    super(model, JSON.parse(JSON.stringify((field.getAST()))));
    this.type = new Type(field);
    this.model = model;
  }

  getStructures() {
    // Grab structures from the underlying type
    const structures = this.type.getStructures();
    const { isRequired, isPersistable, isVirtual, isPrimaryKeyId, isIdField } = this.props;

    // Structures defined on the field
    const $structures = Object.entries(this.getDirectiveArgs('field', {})).reduce((prev, [key, value]) => {
      if (!Array.isArray(value)) value = [value];
      if (key === 'instruct') prev.instructs.unshift(...value.map(t => Pipeline[t]));
      if (key === 'restruct') prev.restructs.unshift(...value.map(t => Pipeline[t]));
      if (key === 'destruct') prev.destructs.unshift(...value.map(t => Pipeline[t]));
      if (key === 'construct') prev.constructs.unshift(...value.map(t => Pipeline[t]));
      if (key === 'serialize') prev.serializers.unshift(...value.map(t => Pipeline[t]));
      if (key === 'deserialize') prev.deserializers.unshift(...value.map(t => Pipeline[t]));
      if (key === 'transform') prev.transformers.unshift(...value.map(t => Pipeline[t]));
      return prev;
    }, structures);

    // IDs (first - shift)
    if (isPrimaryKeyId) $structures.serializers.unshift(Pipeline.idKey);
    if (isIdField) $structures.$serializers.unshift(Pipeline.idField);
    // if (this.isIdField()) structures.$serializers.unshift(({ value }) => (value ? map(value, v => this.getIdModel().idValue(v.id || v)) : value));

    // Required (last - push)
    if (isRequired && isPersistable && !isVirtual) $structures.serializers.push(Pipeline.required);

    return $structures;
  }

  async validate(query, value) {
    if (value == null) return value;
    const { resolver } = query.toObject();
    const { type, modelRef, isEmbedded } = this.props;

    if (modelRef && !isEmbedded) {
      const ids = Array.from(new Set(ensureArray(value).map(v => `${v}`)));
      await resolver.match(type).where({ id: ids }).count().then((count) => {
        // if (type === 'Category') console.log(value, ids, count);
        if (count !== ids.length) throw Boom.notFound(`${type} Not Found`);
      });
    }

    if (modelRef && isPlainObject(ensureArray(value)[0])) return modelRef.validate(query, value); // Model delegation

    return value;
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
