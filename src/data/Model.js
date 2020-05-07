const Field = require('./Field');
const ResultSet = require('./ResultSet');
const Model = require('../graphql/Model');
const { lcFirst } = require('../service/app.service');

module.exports = class extends Model {
  constructor(schema, model, drivers) {
    super(schema, model.getAST());
    this.driver = drivers[this.getDriverName()];
    this.fields = super.getFields().map(field => new Field(schema, this, field));
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
    return this.getDirectiveArg('model', 'id', this.driver.idField());
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

  getDriver() {
    return this.driver.dao;
  }

  referentialIntegrity(refs) {
    if (refs) this.referentials = refs;
    return this.referentials;
  }

  isVisible() {
    return this.isEntity();
  }

  serialize(data, mapper) {
    if (data == null) data = {};

    return Object.entries(data).reduce((prev, [key, value]) => {
      const field = this.getField(key);
      if (!field) return key === '_id' ? Object.assign(prev, { [key]: value }) : prev;
      const alias = field.getAlias();
      return Object.assign(prev, { [alias]: field.serialize(value, mapper) });
    }, {});
  }

  transform(data, mapper) {
    if (data == null) data = {};

    return Object.entries(data).reduce((prev, [key, value]) => {
      const field = this.getField(key);
      if (!field) return Object.assign(prev, { [key]: value });
      return Object.assign(prev, { [key]: field.transform(value, mapper) });
    }, {});
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
