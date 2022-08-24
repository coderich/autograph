const { uniqWith } = require('lodash');
const { map, ensureArray, hashObject } = require('../service/app.service');
const Boom = require('../core/Boom');

module.exports = class Pipeline {
  constructor() {
    throw new Error('Pipeline is a singleton; use the static {define|factory} methods');
  }

  static define(name, factory, options = {}) {
    // A factory must be a function
    if (typeof factory !== 'function') throw new Error(`Pipeline definition for "${name}" must be a function`);

    // Determine options; which may come from the factory function
    const { ignoreNull = true, itemize = true, configurable = false } = Object.assign({}, factory.options, options);

    const wrapper = Object.defineProperty((args) => {
      if (ignoreNull && args.value == null) return args.value;

      if (ignoreNull && itemize) {
        return map(args.value, (val, index) => {
          const v = factory({ ...args, value: val, index });
          return v === undefined ? val : v;
        });
      }

      const val = factory(args);
      return val === undefined ? args.value : val;
    }, 'name', { value: name });

    // Attach enumerable method to the Pipeline
    return Object.defineProperty(Pipeline, name, {
      value: wrapper,
      configurable,
      enumerable: true,
    })[name];
  }

  static factory(name, thunk, options = {}) {
    if (typeof thunk !== 'function') throw new Error(`Pipeline factory for "${name}" must be a thunk`);
    if (typeof thunk() !== 'function') throw new Error(`Factory thunk() for "${name}" must return a function`);
    return Object.defineProperty(Pipeline, name, { value: (...args) => Object.defineProperty(thunk(...args), 'options', { value: options }) })[name];
  }

  // static wrapper(name, factory, { ignoreNull, itemize }) {
  //   return Object.defineProperty((args) => {
  //     if (ignoreNull && args.value == null) return args.value;

  //     if (ignoreNull && itemize) {
  //       return map(args.value, (val, index) => {
  //         const v = factory({ ...args, value: val, index });
  //         return v === undefined ? val : v;
  //       });
  //     }

  //     const val = factory(args);
  //     return val === undefined ? args.value : val;
  //   }, 'name', { value: name });
  // }

  static createPresets() {
    // Built-In Javascript String Transformers
    const jsStringTransformers = ['toLowerCase', 'toUpperCase', 'toString', 'trim', 'trimEnd', 'trimStart'];
    jsStringTransformers.forEach(name => Pipeline.define(`${name}`, ({ value }) => String(value)[name]()));

    // Additional Transformers
    Pipeline.define('toTitleCase', ({ value }) => value.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()));
    Pipeline.define('toSentenceCase', ({ value }) => value.charAt(0).toUpperCase() + value.slice(1));
    Pipeline.define('toId', ({ model, value }) => model.idValue(value));
    Pipeline.define('toArray', ({ value }) => (Array.isArray(value) ? value : [value]), { itemize: false });
    Pipeline.define('toDate', ({ value }) => new Date(value), { configurable: true });
    Pipeline.define('timestamp', ({ value }) => Date.now(), { ignoreNull: false });
    Pipeline.define('createdAt', ({ value }) => value || Date.now(), { ignoreNull: false });
    Pipeline.define('dedupe', ({ value }) => uniqWith(value, (b, c) => hashObject(b) === hashObject(c)), { itemize: false });
    Pipeline.define('idKey', ({ model, value }) => (value == null ? model.idValue() : value), { ignoreNull: false });
    Pipeline.define('idField', ({ model, field, value }) => field.getIdModel().idValue(value.id || value));
    // Pipeline.define('idField', ({ model, field, value }) => map(value, v => field.getIdModel().idValue(v.id || v)));
    Pipeline.define('ensureArrayValue', ({ field, value }) => (field.toObject().isArray && !Array.isArray(value) ? [value] : value), { itemize: false });

    Pipeline.define('ensureId', ({ resolver, field, value }) => {
      const { type } = field.toObject();
      const ids = Array.from(new Set(ensureArray(value).map(v => `${v}`)));

      return resolver.match(type).where({ id: ids }).count().then((count) => {
        if (count !== ids.length) throw Boom.notFound(`${type} Not Found`);
      });
    }, { itemize: false });

    Pipeline.define('defaultValue', ({ field, value }) => {
      const { defaultValue } = field.toObject();
      return value === undefined ? defaultValue : value;
    }, { ignoreNull: false });

    Pipeline.define('castValue', ({ field, value }) => {
      const { type, isEmbedded } = field.toObject();

      if (isEmbedded) return value;

      return map(value, (v) => {
        switch (type) {
          case 'String': {
            return `${v}`;
          }
          case 'Float': case 'Number': {
            const num = Number(v);
            if (!Number.isNaN(num)) return num;
            return v;
          }
          case 'Int': {
            const num = Number(v);
            if (!Number.isNaN(num)) return parseInt(v, 10);
            return v;
          }
          case 'Boolean': {
            if (v === 'true') return true;
            if (v === 'false') return false;
            return v;
          }
          default: {
            return v;
          }
        }
      });
    }, { itemize: false });

    // Required fields
    Pipeline.define('required', ({ model, field, value }) => {
      if (value == null) throw Boom.badRequest(`${model}.${field} is required`);
    }, { ignoreNull: false });

    // A field cannot hold a reference to itself
    Pipeline.define('selfless', ({ model, field, parent, parentPath, value }) => {
      if (`${value}` === `${parentPath('id')}`) throw Boom.badRequest(`${model}.${field} cannot hold a reference to itself`);
    });

    // Once set it cannot be changed
    Pipeline.define('immutable', ({ model, field, docPath, parentPath, path, value }) => {
      const hint = { id: parentPath('id') };
      const oldVal = docPath(path, hint);
      if (oldVal !== undefined && value !== undefined && `${hashObject(oldVal)}` !== `${hashObject(value)}`) throw Boom.badRequest(`${model}.${field} is immutable; cannot be changed once set ${oldVal} -> ${value}`);
    });

    // List of allowed values
    Pipeline.factory('Allow', (...args) => function allow({ model, field, value }) {
      if (args.indexOf(value) === -1) throw Boom.badRequest(`${model}.${field} allows ${args}; found '${value}'`);
    });

    // List of disallowed values
    Pipeline.factory('Deny', (...args) => function deny({ model, field, value }) {
      if (args.indexOf(value) > -1) throw Boom.badRequest(`${model}.${field} denys ${args}; found '${value}'`);
    });

    // Min/Max range
    Pipeline.factory('Range', (min, max) => {
      if (min == null) min = undefined;
      if (max == null) max = undefined;

      return function range({ model, field, value }) {
        const num = +value; // Coerce to number if possible
        const test = Number.isNaN(num) ? value.length : num;
        if (test < min || test > max) throw Boom.badRequest(`${model}.${field} must satisfy range ${min}:${max}; found '${value}'`);
      };
    }, { itemize: false });
  }
};

// const jsStringMethods = [
//   'charAt', 'charCodeAt', 'codePointAt', 'concat', 'indexOf', 'lastIndexOf', 'localeCompare',
//   'normalize', 'padEnd', 'padStart', 'repeat', 'replace', 'search', 'slice', 'split', 'substr', 'substring',
//   'toLocaleLowerCase', 'toLocaleUpperCase', 'toLowerCase', 'toString', 'toUpperCase', 'trim', 'trimEnd', 'trimStart', 'raw',
// ];

// Transformer.factory('toTitleCase', () => ({ value }) => value.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()), { enumerable: true });
// Transformer.factory('toLocaleTitleCase', (...args) => ({ value }) => value.replace(/\w\S*/g, w => w.charAt(0).toLocaleUpperCase(...args) + w.slice(1).toLocaleLowerCase()));
// Transformer.factory('toSentenceCase', () => ({ value }) => value.charAt(0).toUpperCase() + value.slice(1), { enumerable: true });
// Transformer.factory('toLocaleSentenceCase', (...args) => ({ value }) => value.charAt(0).toLocaleUpperCase(...args) + value.slice(1));
// Transformer.factory('toArray', () => ({ value }) => (Array.isArray(value) ? value : [value]), { itemize: false, enumerable: true });
// Transformer.factory('toDate', () => ({ value }) => new Date(value), { enumerable: true, writable: true });
// Transformer.factory('dedupe', () => ({ value }) => uniqWith(value, (b, c) => hashObject(b) === hashObject(c)), { ignoreNull: false, enumerable: true });
// Transformer.factory('dedupeBy', key => ({ value }) => uniqWith(value, (b, c) => hashObject(b[key]) === hashObject(c[key])), { ignoreNull: false, enumerable: true });
// Transformer.factory('timestamp', () => () => Date.now(), { enumerable: true, ignoreNull: false });
// Transformer.factory('createdAt', () => ({ value }) => value || Date.now(), { enumerable: true, ignoreNull: false });
// Transformer.factory('first', () => ({ value }) => (Array.isArray(value) ? value[0] : value), { enumerable: true });
// Transformer.factory('get', path => ({ value }) => get(value, path), { enumerable: true });
// Transformer.factory('set', path => ({ value }) => set({}, path, value), { enumerable: true });
