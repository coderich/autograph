const Stream = require('stream');
const Field = require('./Field');
const Model = require('../graphql/ast/Model');
const { eventEmitter } = require('../service/event.service');
const { finalizeResults } = require('./DataService');
const { map, ensureArray, mapPromise, seek, deseek } = require('../service/app.service');

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
    const shape = this.getShape();

    return new Promise((resolve, reject) => {
      if (!(mixed instanceof Stream)) {
        resolve(this.shapeObject(shape, mixed, query));
      } else {
        const results = [];
        mixed.on('data', (data) => { results.push(this.shapeObject(shape, data, query)); });
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
    const sortKeys = ['isIdField', 'isBasicType', 'isEmbedded'];
    const crudKeys = crudMap[crud] || [];

    // Define target mapping
    const targetMap = {
      doc: ['defaultValue', 'castValue', 'ensureArrayValue', 'normalizers', 'instructs', ...crudKeys, `$${serdes}rs`, `${serdes}rs`, 'transforms'],
      input: ['defaultValue', 'castValue', 'ensureArrayValue', 'normalizers', 'instructs', ...crudKeys, `$${serdes}rs`, `${serdes}rs`, 'transforms'],
      // input: ['defaultValue', 'castValue', 'ensureArrayValue'],
      where: ['castValue', 'instructs', `$${serdes}rs`],
    };

    const structureKeys = targetMap[target] || ['castValue'];

    // Create sorted shape, recursive
    const shape = fields.sort((a, b) => {
      const aObject = a.toObject();
      const bObject = b.toObject();

      // PK first
      if (aObject.isPrimaryKeyId) return -1;
      if (bObject.isPrimaryKeyId) return 1;

      // Arrays last
      if (aObject.isArray && !bObject.isArray) return 1;
      if (bObject.isArray && !aObject.isArray) return -1;

      // Now, follow sort keys
      const aNum = sortKeys.findIndex(key => aObject[key]);
      const bNum = sortKeys.findIndex(key => bObject[key]);
      if (aNum < bNum) return -1;
      if (aNum > bNum) return 1;
      return 0;
    }).map((field) => {
      let instructed = false;
      const structures = field.getStructures();
      const { key, name, type, isArray, isEmbedded, modelRef } = field.toObject();
      const [from, to] = serdes === 'serialize' ? [name, key] : [key, name];
      const actualTo = target === 'input' || target === 'splice' ? from : to;
      const path = paths.concat(actualTo);
      const subCrud = crud === 'update' && isArray ? 'create' : crud; // Due to limitation to update embedded array
      const subShape = isEmbedded ? modelRef.getShape(subCrud, target, path) : null;
      const transformers = structureKeys.reduce((prev, struct) => {
        const structs = structures[struct];
        if (struct === 'instructs' && structs.length) instructed = true;
        return prev.concat(structs);
      }, []).filter(Boolean);
      return { instructed, field, path, from, to: actualTo, type, isArray, transformers, validators: structures.validators, shape: subShape };
    });

    // Adding useful shape info
    shape.crud = crud;
    shape.model = this;
    shape.serdes = serdes;
    shape.target = target;

    // Cache and return
    this.shapesCache.set(cacheKey, shape);
    return shape;
  }

  shapeObject(shape, obj, query, root) {
    const { serdes, model } = shape;
    const { context, resolver, doc = {}, flags = {} } = query.toObject();
    const { pipeline } = flags;

    if (!pipeline) return obj;
    // const filters = pipeline === true ? [] : Object.entries(pipeline).map(([k, v]) => (v === false ? k : null)).filter(Boolean);

    return map(obj, (parent) => {
      // "root" is the base of the object
      root = root || parent;

      // Lookup helper functions
      const docPath = (p, hint) => seek(doc, p, hint); // doc is already serialized; so always a seek
      const rootPath = (p, hint) => (serdes === 'serialize' ? seek(root, p, hint) : deseek(shape, root, p, hint));
      const parentPath = (p, hint) => (serdes === 'serialize' ? seek(parent, p, hint) : deseek(shape, parent, p, hint));

      return shape.reduce((prev, { instructed, field, from, to, path, type, isArray, defaultValue, transformers = [], shape: subShape }) => {
        const startValue = parent[from];
        // transformers = filters.length ? transformers.filter() : transformers;

        // Transform value
        const transformedValue = transformers.reduce((value, t) => {
          const v = t({ model, field, path, docPath, rootPath, parentPath, startValue, value, resolver, context });
          return v === undefined ? value : v;
        }, startValue);

        // Determine if key should stay or be removed
        if (!instructed && transformedValue === undefined && !Object.prototype.hasOwnProperty.call(parent, from)) return prev;
        if (!instructed && subShape && typeof transformedValue !== 'object') return prev;

        // Rename key & assign value
        prev[to] = (!subShape || transformedValue == null) ? transformedValue : this.shapeObject(subShape, transformedValue, query, root);

        return prev;
      }, {});
    });
  }

  validateObject(shape, obj, query, root, silent = false) {
    const { model } = shape;
    const { context, resolver, doc = {}, flags = {} } = query.toObject();
    const { validate = true } = flags;

    if (!validate) return Promise.resolve();

    return Promise.all(ensureArray(obj).map((parent) => {
      // "root" is the base of the object
      root = root || parent;

      // Lookup helper functions
      const docPath = (p, hint) => seek(doc, p, hint);
      const rootPath = (p, hint) => seek(root, p, hint);
      const parentPath = (p, hint) => seek(parent, p, hint);

      return Promise.all(shape.map(({ field, from, path, validators, shape: subShape }) => {
        const value = parent[from]; // It hasn't been shaped yet

        return Promise.all(validators.map(v => v({ model, field, path, docPath, rootPath, parentPath, startValue: value, value, resolver, context }))).then(() => {
          return subShape ? this.validateObject(subShape, value, query, root, true) : Promise.resolve();
        });
      }));
    })).then(() => {
      return silent ? Promise.resolve() : eventEmitter.emit('validate', query.toObject());
    });
  }
};
