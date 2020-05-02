const Field = require('./Field');
const ResultSet = require('./ResultSet');
const { lcFirst } = require('../service/app.service');

module.exports = class Model {
  constructor(schema, model, drivers) {
    this.schema = schema;
    this.model = model;
    this.driver = drivers[this.getDriverName()];
    this.fields = model.getFields().map(field => new Field(schema, this, field));
    this.toString = () => `${model}`;

    // Create collections (mongo)
    if (this.driver.dao.createCollection) this.driver.dao.createCollection(this.getAlias());

    // Create indexes
    this.driver.dao.createIndexes(this.getAlias(), this.getIndexes());
  }

  // CRUD
  get(id, options) {
    return this.driver.dao.get(this.getAlias(), this.idValue(id), options).then(res => (res ? new ResultSet(this, res) : res));
  }

  find(where = {}, options) {
    return this.driver.dao.find(this.getAlias(), where, options).then(res => new ResultSet(this, res));
  }

  count(where = {}, options) {
    return this.driver.dao.count(this.getAlias(), where, options);
  }

  create(data, options) {
    return this.driver.dao.create(this.getAlias(), data, options).then(res => new ResultSet(this, res));
  }

  update(id, data, doc, options) {
    return this.driver.dao.replace(this.getAlias(), this.idValue(id), data, doc, options).then(res => new ResultSet(this, res));
  }

  delete(id, doc, options) {
    return this.driver.dao.delete(this.getAlias(), this.idValue(id), doc, options).then(res => new ResultSet(this, res));
  }

  drop() {
    return this.driver.dao.dropModel(this.getAlias());
  }

  idValue(id) {
    return this.driver.idValue(id);
  }

  idField() {
    return this.model.getDirectiveArg('model', 'id', this.driver.idField());
  }

  async hydrate(resolver, results, query = {}) {
    const { fields = {} } = query;
    const isArray = Array.isArray(results);
    const modelFields = this.getFields().map(f => f.getName());
    const fieldEntries = Object.entries(fields).filter(([k]) => modelFields.indexOf(k) > -1);
    const countEntries = Object.entries(fields).filter(([k]) => modelFields.indexOf(lcFirst(k.substr(5))) > -1); // eg. countAuthored
    results = isArray ? results : [results];

    const data = await Promise.all(results.map(async (doc) => {
      if (doc == null) return doc;

      // Resolve all values
      const [fieldValues, countValues] = await Promise.all([
        Promise.all(fieldEntries.map(async ([field, subFields]) => {
          const [arg = {}] = (fields[field].__arguments || []).filter(el => el.query).map(el => el.query.value); // eslint-disable-line
          const ref = this.getField(field).getModelRef();
          const resolved = await this.getField(field).resolve(resolver, doc, { ...query, ...arg });
          if (Object.keys(subFields).length && ref) return ref.hydrate(resolver, resolved, { ...query, ...arg, fields: subFields });
          return resolved;
        })),
        Promise.all(countEntries.map(async ([field, subFields]) => {
          const [arg = {}] = (fields[field].__arguments || []).filter(el => el.where).map(el => el.where.value); // eslint-disable-line
          return this.getField(lcFirst(field.substr(5))).count(resolver, doc, arg);
        })),
      ]);

      return fieldEntries.reduce((prev, [field], i) => {
        const $key = `$${field}`;
        const $value = fieldValues[i];
        if (!Object.prototype.hasOwnProperty.call(prev, $key)) Object.defineProperty(prev, $key, { value: $value });
        return prev;
      }, countEntries.reduce((prev, [field], i) => {
        return Object.assign(prev, { [field]: countValues[i] });
      }, doc));
    }));

    return isArray ? data : data[0];
  }

  // Transitional
  getField(path) {
    const [name, ...rest] = path.split('.');
    const field = this.fields.find(f => f.getName() === name);
    if (field == null) return field;

    if (rest.length) {
      const modelRef = field.getModelRef();
      if (modelRef) return modelRef.getField(rest.join('.'));
      return null;
    }

    return field;
  }

  getFields() {
    return this.fields;
  }

  getEmbeddedArrayFields() {
    return this.fields.filter(field => field.isArray() && !field.isVirtual());
  }

  getCountableFields() {
    return this.fields.filter(field => field.isArray() && field.getDataRef());
  }

  getSelectFields() {
    return this.fields.filter(field => field.getName() !== 'id');
  }

  getCreateFields() {
    return this.fields.filter(field => !field.isVirtual() && !field.isPrivate());
  }

  getUpdateFields() {
    return this.fields.filter(field => !field.isVirtual() && !field.isImmutable() && !field.isPrivate());
  }

  getDataRefFields() {
    return this.fields.filter(field => Boolean(field.getDataRef() && !field.isEmbedded()));
  }

  getOnDeleteFields() {
    return this.fields.filter(field => Boolean(field.getDataRef()) && Boolean(field.getOnDelete()));
  }

  getScalarFields() {
    return this.fields.filter(field => field.isScalar());
  }

  getDriver() {
    return this.driver.dao;
  }

  getDriverName() {
    return this.model.getDirectiveArg('model', 'driver', 'default');
  }

  referentialIntegrity(refs) {
    if (refs) this.referentials = refs;
    return this.referentials;
  }

  // GTG

  getName() {
    return this.model.getName();
  }

  getType() {
    return this.model.getType();
  }

  getAlias() {
    return this.model.getDirectiveArg('model', 'alias', this.getName());
  }

  getNamespace() {
    return this.model.getDirectiveArg('model', 'namespace', this.getName());
  }

  getIndexes() {
    return this.model.getDirectives('index').map(d => d.getArgs());
  }

  isVisible() {
    return this.model.isEntity();
  }

  isEntity() {
    return this.model.isEntity();
  }

  serialize(value, mapper) {
    return this.model.serialize(value, mapper);
  }

  transform(value, mapper) {
    return this.model.transform(value, mapper);
  }

  validate(value, mapper) {
    return this.model.validate(value, mapper);
  }
};
