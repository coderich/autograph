const Field = require('./Field');
const Model = require('../graphql/ast/Model');
const RuleService = require('../service/rule.service');
const { map, ensureArray, stripObjectUndefineds } = require('../service/app.service');

module.exports = class extends Model {
  constructor(schema, model, driver) {
    super(schema, JSON.parse(JSON.stringify((model.getAST()))));
    this.driver = driver;
    this.fields = super.getFields().map(field => new Field(this, field));
    this.namedQueries = {};
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
    options.fields = this.getPersistableFields().map(f => f.getKey());
  }

  getDriver() {
    return this.driver.dao;
  }

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

  async appendCreateFields(input, embed = false) {
    const idKey = this.idKey();

    if (embed && idKey && !input[idKey]) input[idKey] = this.idValue();
    if (!input.createdAt) input.createdAt = new Date();
    input.updatedAt = new Date();

    // Generate embedded default values
    await Promise.all(this.getEmbeddedFields().filter(field => field.hasGQLScope('c')).map((field) => {
      if (!input[field]) return Promise.resolve();
      return Promise.all(ensureArray(map(input[field], v => field.getModelRef().appendCreateFields(v, true))));
    }));

    return input;
  }

  async appendDefaultValues(input) {
    input = await this.resolveDefaultValues(stripObjectUndefineds(input));

    // Generate embedded default values
    await Promise.all(this.getEmbeddedFields().filter(field => field.hasGQLScope('c')).map((field) => {
      if (!input[field]) return Promise.resolve();
      return Promise.all(ensureArray(map(input[field], v => field.getModelRef().appendDefaultValues(v))));
    }));

    return input;
  }

  async appendUpdateFields(input) {
    input.updatedAt = new Date();
    input = this.removeBoundKeys(input);
    return input;
  }

  getDefaultValues(data = {}) {
    if (data === null) return null; // Explicitely being told to null out?

    const defaultedFields = this.getDefaultedFields();
    const fieldNames = [...new Set(Object.keys(ensureArray(data)[0]).concat(defaultedFields.map(field => `${field}`)))];

    return fieldNames.reduce((prev, fieldName) => {
      const field = this.getFieldByName(fieldName);
      if (fieldName !== '_id' && !field) return prev; // There can still be nonsense passed in via the DAO
      let value = data[fieldName];
      if (value === undefined) value = field.getDefaultValue();
      if (fieldName !== '_id' && field.isEmbedded()) value = Array.isArray(value) ? value.map(v => field.getModelRef().getDefaultValues(v)) : field.getModelRef().getDefaultValues(value);
      return Object.assign(prev, { [fieldName]: value });
    }, {});
  }

  resolveDefaultValues(data) {
    return this.resolveBoundValues(this.getDefaultValues(data));
  }

  resolveBoundValues(data) {
    const boundFields = this.getBoundValueFields();

    return Promise.all(ensureArray(data).map((obj) => {
      return Promise.all(boundFields.map((boundField) => {
        return boundField.resolveBoundValue(obj[boundField]);
      })).then((values) => {
        values.forEach((value, i) => { obj[boundFields[i]] = value; }); // Assign new value
        return values;
      });
    })).then(() => {
      return data;
    });
  }

  removeBoundKeys(data) {
    return map(data, obj => Object.entries(obj).reduce((prev, [key, value]) => {
      const field = this.getFieldByName(key);
      if (field && field.hasBoundValue()) return prev;
      return Object.assign(prev, { [key]: value });
    }, {}));
  }

  normalize(data, mapper) {
    return map(data, (obj) => {
      if (obj == null) return obj;

      return Object.entries(obj).reduce((prev, [key, value]) => {
        const field = this.getFieldByName(key) || this.getFieldByKey(key);
        if (!field || !field.isPersistable()) return prev;
        if (value === undefined) value = obj[field.getKey()];
        value = field.normalize(value, mapper);
        if (field.isEmbedded()) value = field.getModelRef().normalize(value, mapper);
        return Object.assign(prev, { [field.getKey()]: value });
      }, {}); // Strip away all props not in schema
    });
  }

  /**
   * From Domain Model to Data Model
   */
  serialize(data) {
    return map(data, (obj) => {
      if (obj == null) return obj;

      return Object.entries(obj).reduce((prev, [key, value]) => {
        const field = this.getFieldByName(key) || this.getFieldByKey(key);
        if (!field || !field.isPersistable()) return prev;
        value = field.serialize(value);
        if (!field.getSerialize() && field.isEmbedded()) value = field.getModelRef().serialize(value);
        return Object.assign(prev, { [field.getKey()]: value });
      }, {});
    });
  }

  /**
   * From Data Model to Domain Model
   */
  deserialize(data) {
    return map(data, (obj) => {
      if (obj == null) return obj;

      return Object.entries(obj).reduce((prev, [key, value]) => {
        const field = this.getFieldByKey(key) || this.getFieldByName(key);
        if (!field) return prev;
        value = field.deserialize(value);
        if (!field.getDeserialize() && field.isEmbedded()) value = field.getModelRef().deserialize(value);
        return Object.assign(prev, { [field.getName()]: value });
      }, {});
    });
  }

  /**
   * Apply user-defined transformations to the data
   */
  transform(data) {
    return map(data, (obj) => {
      if (obj == null) return obj;

      return Object.entries(obj).reduce((prev, [key, value]) => {
        const field = this.getField(key);
        if (!field) return prev;
        return Object.assign(prev, { [field]: field.transform(value) });
      }, obj); // Keep $hydrated props
    });
  }

  /**
   * Validate the data
   */
  validate(data, mapper) {
    // Validate does an explicit transform first
    const transformed = this.transform(data);

    // Enforce the rules
    return Promise.all(this.getFields().map((field) => {
      return Promise.all(ensureArray(map(transformed, (obj) => {
        if (obj == null) return Promise.resolve();
        return field.validate(obj[field.getName()], mapper);
      })));
    })).then(() => transformed);
  }

  validateData(data, oldData, op) {
    const required = (op === 'create' ? (f, v) => v == null : (f, v) => Object.prototype.hasOwnProperty.call(data, f.getName()) && v == null);
    const immutable = (f, v) => RuleService.immutable(v, oldData, op, `${f.getModel()}.${f.getName()}`);
    const selfless = (f, v) => RuleService.selfless(v, oldData, op, `${f.getModel()}.${f.getName()}`);
    return this.validate(data, { required, immutable, selfless });
  }
};
