const Field = require('./Field');
const ResultSet = require('./ResultSet');
const Model = require('../graphql/ast/Model');

module.exports = class extends Model {
  constructor(schema, model, driver) {
    super(schema, model.getAST());
    this.driver = driver;
    this.fields = super.getFields().map(field => new Field(this, field));
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

  referentialIntegrity(refs) {
    if (refs) this.referentials = refs;
    return this.referentials;
  }

  resolveDefaultValues(data) {
    data = data || {};
    const defaultedFields = this.getDefaultedFields();
    const fieldNames = [...new Set(Object.keys(data).concat(defaultedFields.map(field => `${field}`)))];

    return fieldNames.reduce((prev, fieldName) => {
      const field = this.getFieldByName(fieldName);
      if (fieldName !== '_id' && !field) return prev; // There can still be nonsense passed in via the DAO
      let value = data[fieldName];
      // if (fieldName !== '_id' && field.isValueBound()) value = await field.resolveBoundValue(value);
      if (value === undefined) value = field.getDefaultValue();
      if (fieldName !== '_id' && field.isEmbedded()) value = field.getModelRef().resolveDefaultValues(value);
      return Object.assign(prev, { [fieldName]: value });
    }, {});
  }

  serialize(data, mapper) {
    if (data == null) data = {};

    return Object.entries(data).reduce((prev, [key, value]) => {
      const field = this.getField(key);
      if (!field) return prev;
      if (!field.isPersistable()) return prev;
      if (value === undefined) value = data[field.getKey()];
      return Object.assign(prev, { [field.getKey()]: field.serialize(value, mapper) });
    }, {}); // Strip away all props not in schema
  }

  deserialize(data, mapper) {
    if (data == null) data = {};

    // You're going to get a mixed bag of DB keys and Field keys here
    const dataWithValues = Object.entries(data).reduce((prev, [key, value]) => {
      const field = this.getField(key);
      if (!field) return prev; // Strip completely unknown fields
      if (value == null) value = data[field.getKey()]; // This is intended to level out what the value should be
      return Object.assign(prev, { [field]: field.transform(value, mapper) });
    }, data); // May have $hydrated values you want to keep

    // Finally, remove unwanted database keys
    Object.keys(dataWithValues).forEach((key) => {
      if (key !== '_id' && !this.getFieldByName(key)) delete dataWithValues[key];
    });

    return dataWithValues;
  }

  transform(data, mapper) {
    if (data == null) data = {};

    return Object.entries(data).reduce((prev, [key, value]) => {
      const field = this.getField(key);
      if (!field) return prev;
      return Object.assign(prev, { [field]: field.transform(value, mapper) });
    }, data); // Keep $hydrated props
  }

  validate(data, mapper) {
    // Validate does an explicit transform first
    const transformed = this.transform(data, mapper);

    // Enforce the rules
    return Promise.all(this.getFields().map((field) => {
      return field.validate(transformed[field.getName()], mapper);
    })).then(() => transformed);
  }
};
