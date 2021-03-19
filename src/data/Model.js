const Field = require('./Field');
const Model = require('../graphql/ast/Model');
const RuleService = require('../service/rule.service');
const { map, ensureArray } = require('../service/app.service');

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

  /**
   * Called when creating a new document. Will add attributes such as id, createdAt, updatedAt
   * while ensuring that all defaulted values are set appropriately
   */
  appendCreateFields(input, embed = false) {
    // id, createdAt, updatedAt
    if (embed && !input.id && this.idKey()) input.id = this.idValue();
    if (!input.createdAt) input.createdAt = new Date();
    input.updatedAt = new Date();

    // Bound + Default value
    this.getDefaultedFields().filter(field => field.hasGQLScope('c')).forEach((field) => {
      const key = field.getKey();
      if (!Object.prototype.hasOwnProperty.call(input, key)) input[key] = undefined;
    });

    // Generate embedded default values
    this.getEmbeddedFields().filter(field => field.hasGQLScope('c')).forEach((field) => {
      if (input[field]) map(input[field], v => field.getModelRef().appendCreateFields(v, true));
    });

    return input;
  }

  appendUpdateFields(input) {
    input.updatedAt = new Date();
    // input = this.removeBoundKeys(input);
    return input;
  }

  serialize(data) {
    return this.transform(data, 'serialize');
  }

  deserialize(data) {
    return this.transform(data, 'deserialize');
  }

  transform(data, serdes = (() => { throw new Error('No Sir Sir SerDes!'); })()) {
    const boundFields = this.getBoundValueFields();

    return map(data, (doc) => {
      const fields = [...new Set(boundFields.concat(Object.keys(doc).map(k => this.getField(k))))].filter(f => f);

      return fields.reduce((prev, field) => {
        const [key, name] = serdes === 'serialize' ? [field.getKey(), field.getName()] : [field.getName(), field.getKey()];
        prev[key] = field[serdes](doc[name]);
        return prev;
      }, {});
    });
  }

  validate(data, mapper) {
    const normalized = this.deserialize(data);

    return Promise.all(this.getFields().map((field) => {
      return Promise.all(ensureArray(map(normalized, (obj) => {
        if (obj == null) return Promise.resolve();
        return field.validate(obj[field.getName()], mapper);
      })));
    }));
  }

  /**
   * The validation method needs to be dynamic based on update vs create
   */
  validateData(data, oldData, op) {
    const required = (op === 'create' ? (f, v) => v == null : (f, v) => Object.prototype.hasOwnProperty.call(data, f.getName()) && v == null);
    const immutable = (f, v) => RuleService.immutable(v, oldData, op, `${f.getModel()}.${f.getName()}`);
    const selfless = (f, v) => RuleService.selfless(v, oldData, op, `${f.getModel()}.${f.getName()}`);
    return this.validate(data, { required, immutable, selfless });
  }
};
