const Field = require('./Field');
const ResultSet = require('./ResultSet');
const DataResolver = require('./DataResolver');
const Model = require('../graphql/ast/Model');
const { map, ensureArray } = require('../service/app.service');

const assignValue = (doc, prop, value) => {
  if (value == null) return value; // Do not hold on to DataResolver

  return Promise.resolve(value).then(($value) => {
    Object.defineProperty(doc, prop, { value: $value });
    return $value;
  });
};

module.exports = class extends Model {
  constructor(schema, model, driver) {
    super(schema, model.getAST());
    this.driver = driver;
    this.fields = super.getFields().map(field => new Field(this, field));
    this.namedQueries = {};
  }

  // CRUD
  get(query) {
    const [id, options] = [query.getId(), this.normalizeOptions(query.getOptions())];
    return new ResultSet(this, this.driver.dao.get(this.getKey(), this.idValue(id), options));
  }

  find(where = {}, options) {
    this.normalizeOptions(options);
    return new ResultSet(this, this.driver.dao.find(this.getKey(), where, options));
  }

  count(where = {}, options) {
    this.normalizeOptions(options);
    return this.driver.dao.count(this.getKey(), where, options);
  }

  create(data, options) {
    // Generate embedded ids
    this.getEmbeddedFields().forEach((field) => {
      const idKey = field.getModelRef().idKey();
      if (idKey && data[field] && !data[field][idKey]) map(data, obj => (obj[field][idKey] = this.idValue()));
    });
    this.normalizeOptions(options);
    return new ResultSet(this, this.driver.dao.create(this.getKey(), this.serialize(data), options));
  }

  update(id, data, doc, options) {
    this.normalizeOptions(options);
    return new ResultSet(this, this.driver.dao.replace(this.getKey(), this.idValue(id), this.serialize(data), this.serialize(doc), options));
  }

  delete(id, doc, options) {
    this.normalizeOptions(options);
    return new ResultSet(this, this.driver.dao.delete(this.getKey(), this.idValue(id), doc, options));
  }

  native(method, ...args) {
    switch (method) {
      case 'count': return this.driver.dao.native(this.getKey(), method, ...args);
      default: return new ResultSet(this, this.driver.dao.native(this.getKey(), method, ...args));
    }
  }

  raw() {
    return this.driver.dao.raw(this.getKey());
  }

  drop() {
    return this.driver.dao.dropModel(this.getKey());
  }

  //

  idValue(id) {
    return this.driver.idValue(id);
  }

  idKey() {
    return this.getDirectiveArg('model', 'id', this.driver.idKey());
  }

  normalizeOptions(options) {
    options.fields = this.getSelectFields().map(f => f.getKey());
  }

  getDriver() {
    return this.driver.dao;
  }

  // Temporary until you can rely fully on Query for resolver
  getResolver() { return this.resolver; }

  setResolver(resolver) { this.resolver = resolver; }
  //

  createNamedQuery(name, fn) {
    this.namedQueries[name] = fn;
  }

  getNamedQueries(name) {
    return this.namedQueries;
  }

  referentialIntegrity(refs) {
    if (refs) this.referentials = refs;
    return this.referentials;
  }

  getDefaultValues(data = {}) {
    if (data === null) return null; // Explicitely being told to null out?

    const defaultedFields = this.getDefaultedFields();
    const fieldNames = [...new Set(Object.keys(ensureArray(data)[0]).concat(defaultedFields.map(field => `${field}`)))];

    return fieldNames.reduce((prev, fieldName) => {
      const field = this.getFieldByName(fieldName);
      if (fieldName !== '_id' && !field) return prev; // There can still be nonsense passed in via the DAO
      const modelRef = field.getModelRef();
      let value = data[fieldName];
      if (value === undefined) value = field.getDefaultValue();
      if (fieldName !== '_id' && field.isEmbedded()) value = Array.isArray(value) ? value.map(v => modelRef.getDefaultValues(v)) : modelRef.getDefaultValues(value);
      return Object.assign(prev, { [fieldName]: value });
    }, {});
  }

  resolveDefaultValues(data) {
    return this.resolveBoundValues(this.getDefaultValues(data));
  }

  resolveBoundValues(data) {
    const boundFields = this.getBoundValueFields();

    return map(data, obj => Promise.all(boundFields.map((boundField) => {
      return boundField.resolveBoundValue(obj[boundField]);
    })).then((values) => {
      values.forEach((value, i) => { obj[boundFields[i]] = value; }); // Assign new value
      return data;
    }));
  }

  removeBoundKeys(data) {
    return map(data, obj => Object.entries(obj).reduce((prev, [key, value]) => {
      const field = this.getFieldByName(key);
      if (field && field.hasBoundValue()) return prev;
      return Object.assign(prev, { [key]: value });
    }, {}));
  }

  serialize(data, mapper) {
    if (data == null) return data;

    return map(data, obj => Object.entries(obj).reduce((prev, [key, value]) => {
      const field = this.getFieldByName(key) || this.getFieldByKey(key);
      if (!field || !field.isPersistable()) return prev;
      if (value === undefined) value = obj[field.getKey()];
      value = field.serialize(value, mapper);
      if (field.isEmbedded()) value = field.getModelRef().serialize(value, mapper);
      return Object.assign(prev, { [field.getKey()]: value });
    }, {})); // Strip away all props not in schema
  }

  deserialize(data, mapper) {
    if (data == null) return data;

    // You're going to get a mixed bag of DB keys and Field keys here
    const dataWithValues = map(data, obj => Object.entries(obj).reduce((prev, [key, value]) => {
      const field = this.getFieldByKey(key) || this.getFieldByName(key);
      if (!field) return prev; // Strip completely unknown fields
      if (value == null) value = obj[field.getKey()]; // This is intended to level out what the value should be
      value = field.transform(value, mapper);
      if (field.isEmbedded()) value = field.getModelRef().deserialize(value, mapper);
      return Object.assign(prev, { [field]: value });
    }, obj)); // May have $hydrated values you want to keep

    // Finally, remove unwanted database keys
    map(dataWithValues, obj => Object.keys(obj).forEach((key) => {
      if (key !== '_id' && !this.getFieldByName(key)) delete obj[key];
    }));

    return dataWithValues;
  }

  transform(data, mapper) {
    if (data == null) return data;

    return map(data, obj => Object.entries(obj).reduce((prev, [key, value]) => {
      const field = this.getField(key);
      if (!field) return prev;
      return Object.assign(prev, { [field]: field.transform(value, mapper) });
    }, obj)); // Keep $hydrated props
  }

  validate(data, mapper) {
    // Validate does an explicit transform first
    const transformed = this.transform(data, mapper);

    // Enforce the rules
    return Promise.all(this.getFields().map((field) => {
      return Promise.all(ensureArray(map(transformed, obj => field.validate(obj[field.getName()], mapper))));
    })).then(() => transformed);
  }

  resolve(doc, prop, resolver, query) {
    // Value check
    const f = this.getFieldByName(prop);
    const value = doc[prop];

    // Check if already resolved
    if (value !== undefined) {
      if (f && f.isEmbedded()) return new DataResolver(value, (d, p) => f.getModelRef().resolve(d, p, resolver, query));
      return value;
    }

    if (typeof prop === 'symbol') return value;

    // // Count resolver
    // const countField = this.getCountField(prop);
    // if (countField) return assignValue(doc, prop, countField.count(resolver, doc));

    // Hydration check
    const [, $prop] = prop.split('$');
    if (!$prop) return value; // Nothing to hydrate

    // Field check
    const field = this.getField($prop);
    if (!field) return value; // Unknown field

    // Set $value to the original unhydrated value
    const $value = field.resolve(doc[$prop]);
    if (field.isScalar()) return assignValue(doc, prop, $value); // No hydration needed; apply $value
    if (field.isEmbedded()) return $value ? assignValue(doc, prop, new DataResolver($value, (d, p) => field.getModelRef().resolve(d, p, resolver, query))) : $value;

    // Model resolver
    const fieldModel = field.getModelRef();

    if (field.isArray()) {
      if (field.isVirtual()) {
        const where = { [field.getVirtualField().getKey()]: doc.id };
        return assignValue(doc, prop, resolver.match(fieldModel).query({ where }).many({ find: true }));
      }

      // Not a "required" query + strip out nulls
      return assignValue(doc, prop, Promise.all(ensureArray($value).map(id => resolver.match(fieldModel).id(id).one())).then(results => results.filter(r => r != null)));
    }

    if (field.isVirtual()) {
      const where = { [field.getVirtualField().getKey()]: doc.id };
      return assignValue(doc, prop, resolver.match(fieldModel).query({ where }).one({ find: true }));
    }

    return assignValue(doc, prop, resolver.match(fieldModel).id($value).one({ required: field.isRequired() }));
  }
};
