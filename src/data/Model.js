const Field = require('./Field');
const ResultSet = require('./ResultSet');
const Model = require('../graphql/ast/Model');

module.exports = class extends Model {
  constructor(schema, model, drivers) {
    super(schema, model.getAST());
    this.driver = drivers[this.getDriverName()];
    this.fields = super.getFields().map(field => new Field(this, field));

    if (this.isEntity()) {
      // Create collections (mongo)
      if (this.driver.dao.createCollection) this.driver.dao.createCollection(this.getAlias());

      // Create indexes
      this.driver.dao.createIndexes(this.getAlias(), this.getIndexes());
    }
  }

  // CRUD
  get(query) {
    const [id, options] = [query.getId(), this.normalizeOptions(query.getOptions())];
    return new ResultSet(this, this.driver.dao.get(this.getAlias(), this.idValue(id), options));
  }

  find(where = {}, options) {
    this.normalizeOptions(options);
    return new ResultSet(this, this.driver.dao.find(this.getAlias(), where, options));
  }

  count(where = {}, options) {
    this.normalizeOptions(options);
    return this.driver.dao.count(this.getAlias(), where, options);
  }

  create(data, options) {
    this.normalizeOptions(options);
    return new ResultSet(this, this.driver.dao.create(this.getAlias(), data, options));
  }

  update(id, data, doc, options) {
    this.normalizeOptions(options);
    return new ResultSet(this, this.driver.dao.replace(this.getAlias(), this.idValue(id), data, doc, options));
  }

  delete(id, doc, options) {
    this.normalizeOptions(options);
    return new ResultSet(this, this.driver.dao.delete(this.getAlias(), this.idValue(id), doc, options));
  }

  drop() {
    return this.driver.dao.dropModel(this.getAlias());
  }

  idValue(id) {
    return this.driver.idValue(id);
  }

  idField() {
    return this.getDirectiveArg('model', 'id', this.driver.idField());
  }

  normalizeOptions(options) {
    options.fields = this.getSelectFields().map(f => f.getAlias());
  }

  getDriver() {
    return this.driver.dao;
  }

  referentialIntegrity(refs) {
    if (refs) this.referentials = refs;
    return this.referentials;
  }

  setDefaultValues(data) {
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
        field.getModelRef().setDefaultValues(data[key]);
      }
    });
  }

  serialize(data, mapper) {
    if (data == null) data = {};

    return Object.entries(data).reduce((prev, [key, value]) => {
      const field = this.getField(key);
      if (!field) return Object.assign(prev, { [key]: value });
      if (value == null) value = data[field.getAlias()];
      return Object.assign(prev, { [field.getAlias()]: field.serialize(value, mapper) });
    }, {}); // Strip $hydrated props
  }

  transform(data, mapper) {
    if (data == null) data = {};

    return Object.entries(data).reduce((prev, [key, value]) => {
      const field = this.getField(key);
      if (!field) return prev;
      if (value == null) value = data[field.getAlias()];
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
