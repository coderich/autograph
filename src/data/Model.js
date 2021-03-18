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

  appendCreateFields(input, embed = false) {
    const idKey = this.idKey();

    if (embed && idKey && !input[idKey]) input[idKey] = this.idValue();
    if (!input.createdAt) input.createdAt = new Date();
    input.updatedAt = new Date();

    // Generate embedded default values
    this.getEmbeddedFields().filter(field => field.hasGQLScope('c')).forEach((field) => {
      if (input[field]) map(input[field], v => field.getModelRef().appendCreateFields(v, true));
    });

    return input;
  }

  appendUpdateFields(input) {
    input.updatedAt = new Date();
    input = this.removeBoundKeys(input);
    return input;
  }

  // /**
  //  *
  //  */
  // normalize(data) {
  //   const boundFields = this.getBoundValueFields();

  //   return map(data, (doc) => {
  //     const fields = [...new Set(boundFields.concat(Object.keys(doc).map(k => this.getField(k))))].filter(f => f);

  //     return fields.reduce((prev, field) => {
  //       prev[field.getName()] = field.normalize(doc[field.getKey()]);
  //       return prev;
  //     }, {});
  //   });
  // }

  /**
   * Going to the driver
   */
  serialize(data) {
    const boundFields = this.getBoundValueFields();

    return map(data, (doc) => {
      const fields = [...new Set(boundFields.concat(Object.keys(doc).map(k => this.getField(k))))].filter(f => f);

      return fields.reduce((prev, field) => {
        prev[field.getKey()] = field.serialize(doc[field.getName()]);
        return prev;
      }, {});
    });
  }

  /**
   * Enforce validation rules
   */
  validate(data, mapper) {
    return Promise.all(this.getFields().map((field) => {
      return Promise.all(ensureArray(map(data, (obj) => {
        if (obj == null) return Promise.resolve();
        return field.validate(obj[field.getName()], mapper);
      })));
    }));
  }

  validateData(data, oldData, op) {
    const required = (op === 'create' ? (f, v) => v == null : (f, v) => Object.prototype.hasOwnProperty.call(data, f.getName()) && v == null);
    const immutable = (f, v) => RuleService.immutable(v, oldData, op, `${f.getModel()}.${f.getName()}`);
    const selfless = (f, v) => RuleService.selfless(v, oldData, op, `${f.getModel()}.${f.getName()}`);
    return this.validate(data, { required, immutable, selfless });
  }
};
