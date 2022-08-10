const Stream = require('stream');
const Field = require('./Field');
const Model = require('../graphql/ast/Model');
const { map, castCmp, ensureArray } = require('../service/app.service');

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

  validate(query, data) {
    return Promise.all(this.getFields().map((field) => {
      return Promise.all(ensureArray(map(data, (obj) => {
        if (obj == null) return Promise.resolve();
        return field.validate(query, obj[field.getKey()]);
      })));
    }));
  }

  /**
   * Convenience method to deserialize data from a data source (such as a database)
   */
  deserialize(mixed, query) {
    const shape = this.getShape();

    // If we're not a stream we return the shape
    if (!(mixed instanceof Stream)) return Promise.resolve(this.shapeObject(shape, mixed, query));

    // Stream API
    const results = [];
    return new Promise((resolve, reject) => {
      mixed.on('data', (data) => { results.push(this.shapeObject(shape, data, query)); });
      mixed.on('end', () => { resolve(results); });
      mixed.on('error', reject);
    });
  }

  getShape(crud = 'read', target = 'doc', path = []) {
    const modelName = this.getName();
    const serdes = crud === 'read' ? 'deserialize' : 'serialize';
    const fields = serdes === 'deserialize' ? this.getSelectFields() : this.getPersistableFields();
    const crudMap = { create: ['constructs'], update: ['restructs'], delete: ['destructs'], remove: ['destructs'] };
    const crudKeys = crudMap[crud] || [];

    const targetMap = {
      doc: ['defaultValue', 'ensureArrayValue', 'castValue', ...crudKeys, 'transformers', `$${serdes}rs`, `${serdes}rs`, 'instructs'],
      where: ['castValue', `$${serdes}rs`, 'instructs'],
    };

    const structureKeys = targetMap[target] || ['castValue'];

    return fields.map((field) => {
      const structures = field.getStructures();
      const [key, name, type, isArray] = [field.getKey(), field.getName(), field.getType(), field.isArray(), field.isIdField()];
      const [from, to] = serdes === 'serialize' ? [name, key] : [key, name];
      path.push(to);
      const shape = field.isEmbedded() ? field.getModelRef().getShape(crud, target, path) : null;
      structures.defaultValue = ({ value }) => (value === undefined && target === 'doc' ? field.getDefaultValue() : value);
      structures.ensureArrayValue = ({ value }) => (value != null && isArray && !Array.isArray(value) ? [value] : value);
      structures.castValue = ({ value }) => (value != null && !shape ? map(value, v => castCmp(type, v)) : value);
      const transformers = structureKeys.reduce((prev, struct) => prev.concat(structures[struct]), []).filter(Boolean);
      return { modelName, path, from, to, type, isArray, transformers, shape };
    });
  }

  shapeObject(shape, obj, query, root) {
    const { resolver } = query.toObject();
    const context = resolver.getContext();

    return map(obj, (doc) => {
      root = root || doc;

      return shape.reduce((prev, { modelName, from, to, type, isArray, defaultValue, transformers = [], shape: subShape }) => {
        let value = doc[from];

        // Transform value
        value = transformers.reduce((val, t) => {
          const v = t({ root, doc, value: val, context, fieldName: to, modelName });
          return v === undefined ? val : v;
        }, value);

        // Determine if key should stay or be removed
        if (value === undefined && !Object.prototype.hasOwnProperty.call(doc, from)) return prev;

        // Rename key & assign value
        prev[to] = (!subShape || value == null) ? value : this.shapeObject(subShape, value, query, root);

        return prev;
      }, {});
    });
  }
};
