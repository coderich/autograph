const Type = require('./Type');
const Field = require('../graphql/ast/Field');
const Rule = require('../core/Rule');
const Pipeline = require('./Pipeline');
const { map, isPlainObject, ensureArray } = require('../service/app.service');

module.exports = class extends Field {
  constructor(model, field) {
    super(model, JSON.parse(JSON.stringify((field.getAST()))));
    this.type = new Type(field);
    this.model = model;
  }

  getStructures() {
    const structures = this.type.getStructures();
    if (this.isPrimaryKeyId()) structures.serializers.unshift(({ value }) => (value != null ? value : this.model.idValue(value)));
    if (this.isIdField()) structures.$serializers.unshift(({ value }) => (value ? map(value, v => this.getIdModel().idValue(v.id || v)) : value));

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

    // if (this.isRequired() && this.isPersistable() && !this.isVirtual()) $structures.serializers.push(Pipeline.required);

    return $structures;
  }

  validate(query, value) {
    const modelRef = this.getModelRef();
    const { rules } = this.getStructures();

    if (this.getModelRef() && !this.isEmbedded()) rules.push(Rule.ensureId());
    if (this.isRequired() && this.isPersistable() && !this.isVirtual()) rules.push(Rule.required());

    return Promise.all(rules.map((rule) => {
      return rule(this, value, query);
    })).then((res) => {
      if (modelRef && isPlainObject(ensureArray(value)[0])) return modelRef.validate(query, value); // Model delegation
      return res;
    });
  }

  resolve(resolver, doc, args = {}) {
    const [name, isArray, isScalar, isVirtual, isRequired, isEmbedded, modelRef, virtualField] = [this.getName(), this.isArray(), this.isScalar(), this.isVirtual(), this.isRequired(), this.isEmbedded(), this.getModelRef(), this.getVirtualField()];
    const value = doc[name];

    // Default resolver return immediately!
    if (isScalar || isEmbedded) return value;

    // Ensure where clause for DB lookup
    args.where = args.where || {};

    if (isArray) {
      if (isVirtual) {
        args.where[[virtualField]] = doc.id; // Is where[[virtualField]] correct?
        return resolver.match(modelRef).merge(args).many();
      }

      // Not a "required" query + strip out nulls
      args.where.id = value;
      return resolver.match(modelRef).merge(args).many();
    }

    if (isVirtual) {
      args.where[[virtualField]] = doc.id;
      return resolver.match(modelRef).merge(args).one();
    }

    return resolver.match(modelRef).id(value).one({ required: isRequired });
  }

  count(resolver, doc, args = {}) {
    const [name, isVirtual, modelRef, virtualField] = [this.getName(), this.isVirtual(), this.getModelRef(), this.getVirtualField()];
    args.where = args.where || {};
    if (isVirtual) args.where[virtualField] = doc.id;
    else args.where.id = doc[name];
    return resolver.match(modelRef).merge(args).count();
  }
};
