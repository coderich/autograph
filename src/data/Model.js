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

  referentialIntegrity(refs) {
    if (refs) this.referentials = refs;
    return this.referentials;
  }

  resolveDefaultValues(data) {
    if (data == null) return data;

    // Default fields
    this.getDefaultedFields().forEach((field) => {
      const key = field.getName();

      if (!Object.prototype.hasOwnProperty.call(data, key)) {
        const value = field.getDefaultValue();
        data[key] = value;
      }
    });

    // Embedded fields
    this.getEmbeddedFields().forEach((field) => {
      const key = field.getName();

      if (Object.prototype.hasOwnProperty.call(data, key)) {
        data[key] = field.getModelRef().resolveDefaultValues(data[key]);
      }
    });

    return data;
  }

  // resolveValues(data) {
  //   // Default fields
  //   this.getDefaultedFields().forEach((field) => {
  //     const key = field.getName();

  //     if (!Object.prototype.hasOwnProperty.call(data, key)) {
  //       const value = field.getDefaultValue();
  //       data[key] = value;
  //     }
  //   });

  //   // Embedded fields
  //   this.getEmbeddedFields().forEach((field) => {
  //     const key = field.getName();

  //     if (Object.prototype.hasOwnProperty.call(data, key)) {
  //       field.getModelRef().resolveDefaultValues(data[key]);
  //     }
  //   });
  // }

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

    return Object.entries(data).reduce((prev, [key, value]) => {
      const field = this.getField(key);
      if (!field) return prev;
      if (value == null) value = data[field.getKey()];
      return Object.assign(prev, { [field]: field.transform(value, mapper) });
    }, data); // Keep $hydrated props
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
