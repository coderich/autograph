const Stream = require('stream');
const Field = require('./Field');
const Model = require('../graphql/ast/Model');
const { finalizeResults } = require('./DataService');
const { map, mapPromise, seek, deseek } = require('../service/app.service');

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
    }).then(rs => finalizeResults(rs, query));
  }

  getShape(crud = 'read', target = 'doc', paths = []) {
    // Cache check
    const cacheKey = `${crud}:${target}`;
    if (this.shapesCache.has(cacheKey)) return this.shapesCache.get(cacheKey);

    const serdes = crud === 'read' ? 'deserialize' : 'serialize';
    const fields = serdes === 'deserialize' ? this.getSelectFields() : this.getPersistableFields();
    const crudMap = { create: ['constructs'], update: ['restructs'], delete: ['destructs'], remove: ['destructs'] };
    const crudKeys = crudMap[crud] || [];

    const targetMap = {
      doc: ['defaultValue', 'castValue', 'ensureArrayValue', 'instructs', 'transforms', ...crudKeys, `$${serdes}rs`, `${serdes}rs`],
      where: ['castValue', 'instructs', `$${serdes}rs`],
    };

    const structureKeys = targetMap[target] || ['castValue'];

    // Create shape, recursive
    const shape = fields.map((field) => {
      let instructed = false;
      const structures = field.getStructures();
      const { key, name, type, isArray, isEmbedded, modelRef } = field.toObject();
      const [from, to] = serdes === 'serialize' ? [name, key] : [key, name];
      const path = paths.concat(to);
      const subShape = isEmbedded ? modelRef.getShape(crud, target, path) : null;
      const transformers = structureKeys.reduce((prev, struct) => {
        if (instructed) return prev;
        const structs = structures[struct];
        if (struct === 'instructs' && structs.length) instructed = true;
        return prev.concat(structs);
      }, []).filter(Boolean);
      return { field, path, from, to, type, isArray, transformers, validators: structures.validators, shape: subShape };
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
    const { context, resolver, doc = {} } = query.toObject();

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
          const v = t({ model, field, path, docPath, rootPath, parentPath, startValue, value, resolver, context });
          return v === undefined ? value : v;
        }, startValue);

        // Determine if key should stay or be removed
        if (transformedValue === undefined && !Object.prototype.hasOwnProperty.call(parent, from)) return prev;
        if (subShape && typeof transformedValue !== 'object') return prev;

        // Rename key & assign value
        prev[to] = (!subShape || transformedValue == null) ? transformedValue : this.shapeObject(subShape, transformedValue, query, root);

        return prev;
      }, {});
    });
  }

  validateObject(shape, obj, query, root) {
    // return data;
    const { serdes, model } = shape;
    const { context, resolver, doc = {}, flags = {} } = query.toObject();
    const { validate = true } = flags;

    if (!validate) return Promise.resolve();

    return mapPromise(obj, (parent) => {
      // "root" is the base of the object
      root = root || parent;

      // Lookup helper functions
      const docPath = (p, hint) => seek(doc, p, hint); // doc is already serialized; so always a seek
      const rootPath = (p, hint) => (serdes === 'serialize' ? seek(root, p, hint) : deseek(shape, root, p, hint));
      const parentPath = (p, hint) => (serdes === 'serialize' ? seek(parent, p, hint) : deseek(shape, parent, p, hint));

      return Promise.all(shape.map(({ field, to, path, validators, shape: subShape }) => {
        const value = parent[to]; // It's already been shaped

        return Promise.all(validators.map(v => v({ model, field, path, docPath, rootPath, parentPath, startValue: value, value, resolver, context }))).then(() => {
          return subShape ? this.validateObject(subShape, value, query, root) : Promise.resolve();
        });
      }));
    });
  }
};
