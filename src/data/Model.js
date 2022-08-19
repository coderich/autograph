const Stream = require('stream');
const Field = require('./Field');
const Pipeline = require('./Pipeline');
const Model = require('../graphql/ast/Model');
const { paginateResultSet } = require('./DataService');
const { eventEmitter } = require('../service/event.service');
const { map, seek, deseek, ensureArray } = require('../service/app.service');

module.exports = class extends Model {
  constructor(schema, model, driver) {
    super(schema, JSON.parse(JSON.stringify((model.getAST()))));
    this.driver = driver;
    this.fields = super.getFields().map(field => new Field(this, field));
    this.namedQueries = {};
    this.shapesCache = new Map();
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
    const { flags = {} } = query.toObject();
    const { validate = true } = flags;

    if (!validate) return Promise.resolve();

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
    const { flags = {} } = query.toObject();
    const { pipeline = true } = flags;
    const shape = this.getShape();

    return new Promise((resolve, reject) => {
      if (!(mixed instanceof Stream)) {
        resolve(pipeline ? this.shapeObject(shape, mixed, query) : mixed);
      } else {
        const results = [];
        mixed.on('data', (data) => { results.push(pipeline ? this.shapeObject(shape, data, query) : data); });
        mixed.on('end', () => { resolve(results); });
        mixed.on('error', reject);
      }
    }).then((results) => {
      return results.length && pipeline ? paginateResultSet(results, query) : results;
    });
  }

  getShape(crud = 'read', target = 'doc', paths = []) {
    const cacheKey = `${crud}:${target}`;
    if (this.shapesCache.has(cacheKey)) return this.shapesCache.get(cacheKey);

    const serdes = crud === 'read' ? 'deserialize' : 'serialize';
    const fields = serdes === 'deserialize' ? this.getSelectFields() : this.getPersistableFields();
    const crudMap = { create: ['constructs'], update: ['restructs'], delete: ['destructs'], remove: ['destructs'] };
    const crudKeys = crudMap[crud] || [];

    const targetMap = {
      doc: ['defaultValue', 'ensureArrayValue', 'castValue', ...crudKeys, `$${serdes}rs`, 'instructs', 'transformers', `${serdes}rs`],
      where: ['castValue', `$${serdes}rs`, 'instructs'],
    };

    const structureKeys = targetMap[target] || ['castValue'];

    // Create shape, recursive
    const shape = fields.map((field) => {
      const structures = field.getStructures();
      const [key, name, type, isArray] = [field.getKey(), field.getName(), field.getType(), field.isArray(), field.isIdField()];
      const [from, to] = serdes === 'serialize' ? [name, key] : [key, name];
      const path = paths.concat(to);
      const subShape = field.isEmbedded() ? field.getModelRef().getShape(crud, target, path) : null;

      structures.castValue = Pipeline.castValue;
      structures.defaultValue = Pipeline.defaultValue;

      structures.ensureArrayValue = ({ value }) => (value != null && isArray && !Array.isArray(value) ? [value] : value);
      const transformers = structureKeys.reduce((prev, struct) => prev.concat(structures[struct]), []).filter(Boolean);
      return { field, path, from, to, type, isArray, transformers, shape: subShape };
    });

    // Adding useful shape info
    shape.crud = crud;
    shape.model = this;
    shape.serdes = serdes;

    // Cache and return
    this.shapesCache.set(cacheKey, shape);
    return shape;
  }

  shapeObject(shape, obj, query, root) {
    const { serdes, model } = shape;
    const { context, doc = {} } = query.toObject();

    return map(obj, (parent) => {
      // "root" is the base of the object
      root = root || parent;

      // Lookup helper functions
      const docPath = (p, hint) => seek(doc, p, hint); // doc is already serialized; so always a seek
      const rootPath = (p, hint) => (serdes === 'serialize' ? seek(root, p, hint) : deseek(shape, root, p, hint));
      const parentPath = (p, hint) => (serdes === 'serialize' ? seek(parent, p, hint) : deseek(shape, parent, p, hint));

      return shape.reduce((prev, { field, from, to, path, type, isArray, defaultValue, transformers = [], shape: subShape }) => {
        const startValue = parent[from];

        // Transform value
        const transformedValue = transformers.reduce((value, t) => {
          const v = t({ model, field, path, docPath, rootPath, parentPath, startValue, value, context });
          return v === undefined ? value : v;
        }, startValue);

        // if (`${field}` === 'searchability') console.log(startValue, transformedValue, transformers);

        // Determine if key should stay or be removed
        if (transformedValue === undefined && !Object.prototype.hasOwnProperty.call(parent, from)) return prev;

        // Rename key & assign value
        prev[to] = (!subShape || transformedValue == null) ? transformedValue : this.shapeObject(subShape, transformedValue, query, root);

        return prev;
      }, {});
    });
  }
};
