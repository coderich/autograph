const { get } = require('lodash');
const Stream = require('stream');
const Field = require('./Field');
const Model = require('../graphql/ast/Model');
const { eventEmitter } = require('../service/event.service');
const { map, castCmp, ensureArray } = require('../service/app.service');

const shapesCache = new Map();

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
    const { flags } = query.toObject();
    if (get(flags, 'novalidate')) return Promise.resolve();

    return Promise.all(this.getFields().map((field) => {
      return Promise.all(ensureArray(map(data, (obj) => {
        if (obj == null) return Promise.resolve();
        return field.validate(query, obj[field.getKey()]);
      })));
    })).then(() => {
      return eventEmitter.emit('validate', query);
    });
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

  getShape(crud = 'read', target = 'doc') {
    // const cacheKey = `${crud}:${target}`;
    // if (shapesCache.has(cacheKey)) return shapesCache.get(cacheKey);

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

    // Create shape, recursive
    const shape = fields.map((field, i) => {
      const structures = field.getStructures();
      const defaultValue = field.getDefaultValue();
      const [key, name, type, isArray] = [field.getKey(), field.getName(), field.getType(), field.isArray(), field.isIdField()];
      const [from, to] = serdes === 'serialize' ? [name, key] : [key, name];
      const subShape = field.isEmbedded() ? field.getModelRef().getShape(crud, target) : null;
      structures.defaultValue = ({ value }) => (value === undefined && target === 'doc' ? defaultValue : value);
      structures.ensureArrayValue = ({ value }) => (value != null && isArray && !Array.isArray(value) ? [value] : value);
      structures.castValue = ({ value }) => (value != null && !subShape ? map(value, v => castCmp(type, v)) : value);
      const transformers = structureKeys.reduce((prev, struct) => prev.concat(structures[struct]), []).filter(Boolean);
      return { from, to, type, isArray, transformers, shape: subShape };
    });

    // Adding useful shape info
    shape.crud = crud;
    shape.serdes = serdes;
    shape.modelName = modelName;

    // Cache and return
    // shapesCache.set(cacheKey, shape);
    return shape;
  }

  shapeObject(shape, obj, query, root, paths = []) {
    const { serdes, modelName } = shape;
    const { context, doc = {} } = query.toObject();
    const docPath = p => get(doc, p);

    return map(obj, (parent) => {
      root = root || parent;
      const rootPath = serdes === 'serialize' ? p => get(root, p) : {};
      const parentPath = serdes === 'serialize' ? p => get(parent, p) : {};

      return shape.reduce((prev, { from, to, type, isArray, defaultValue, transformers = [], shape: subShape }) => {
        const fieldName = to;
        const startValue = parent[from];
        const path = paths.concat(to);

        // Transform value
        const transformedValue = transformers.reduce((value, t) => {
          const v = t({ modelName, fieldName, path, docPath, rootPath, parentPath, startValue, value, context });
          return v === undefined ? value : v;
        }, startValue);

        // Determine if key should stay or be removed
        if (transformedValue === undefined && !Object.prototype.hasOwnProperty.call(parent, from)) return prev;

        // Rename key & assign value
        prev[fieldName] = (!subShape || transformedValue == null) ? transformedValue : this.shapeObject(subShape, transformedValue, query, root, path);

        return prev;
      }, {});
    });
  }
};
