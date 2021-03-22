const Field = require('./Field');
const Model = require('../graphql/ast/Model');
const RuleService = require('../service/rule.service');
const { map, ucFirst, ensureArray } = require('../service/app.service');

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

    // Generate embedded default values
    this.getEmbeddedFields().filter(field => field.isPersistable()).forEach((field) => {
      if (input[field]) map(input[field], v => field.getModelRef().appendCreateFields(v, true));
    });

    return input;
  }

  appendUpdateFields(input) {
    input.updatedAt = new Date();
    this.removeBoundKeys(input);
    return input;
  }

  appendDefaultFields(query, input) {
    this.getDefaultedFields().filter(field => field.isPersistable()).forEach((field) => {
      input[field] = field.resolveBoundValue(query, input[field]);
    });

    // Generate embedded default values
    this.getEmbeddedFields().filter(field => field.isPersistable()).forEach((field) => {
      map(input[field], v => field.getModelRef().appendDefaultFields(query, v));
    });

    return input;
  }

  removeBoundKeys(data) {
    this.getBoundValueFields().forEach((field) => {
      delete data[field.getName()];
    });
  }

  /**
   * Serialize data from Domain Model to Data Model (where clause has special handling)
   */
  serialize(query, data, minimal = false) {
    return this.transform(query, data, 'serialize', minimal);
  }

  /**
   * Deserialize data from Data Model to Domain Model
   */
  deserialize(query, data) {
    return this.transform(query, data, 'deserialize');
  }

  /**
   * Serializer/Deserializer
   */
  transform(query, data, serdes = (() => { throw new Error('No Sir Sir SerDes!'); })(), minimal = false) {
    // Serialize always gets the bound values
    const appendFields = (serdes === 'serialize' ? [...this.getBoundValueFields()] : []);

    // Certain cases do not want custom serdes or defaults
    if (!minimal) appendFields.push(...this[`get${ucFirst(serdes)}Fields`](), ...this.getDefaultFields());

    // Transform all the data
    return map(data, (doc) => {
      // We want the appendFields + those in the data, deduped
      const fields = [...new Set(appendFields.concat(Object.keys(doc).map(k => this.getField(k))))].filter(f => f);

      // Loop through the fields and delegate (renaming keys appropriately)
      return fields.reduce((prev, field) => {
        const [key, name] = serdes === 'serialize' ? [field.getKey(), field.getName()] : [field.getName(), field.getKey()];
        prev[key] = field[serdes](query, doc[name], minimal);
        return prev;
      }, {});
    });
  }

  validate(query, data, mapper) {
    const normalized = this.deserialize(query, data);

    return Promise.all(this.getFields().map((field) => {
      return Promise.all(ensureArray(map(normalized, (obj) => {
        if (obj == null) return Promise.resolve();
        return field.validate(query, obj[field.getName()], mapper);
      })));
    }));
  }

  /**
   * The validation method needs to be dynamic based on update vs create
   */
  validateData(query, data, oldData, op) {
    const required = (op === 'create' ? (f, v) => v == null : (f, v) => Object.prototype.hasOwnProperty.call(data, f.getName()) && v == null);
    const immutable = (f, v) => RuleService.immutable(v, oldData, op, `${f.getModel()}.${f.getName()}`);
    const selfless = (f, v) => RuleService.selfless(v, oldData, op, `${f.getModel()}.${f.getName()}`);
    return this.validate(query, data, { required, immutable, selfless });
  }
};
