const { get } = require('lodash');
const { map, hashObject } = require('../service/app.service');

exports.Method = class Method {
  static define(kind, name, fn, options = {}) {
    // Methods are functions
    if (typeof fn !== 'function') throw new Error(`${kind} definition for "${name}" must be a function`);

    // Determine options; which may come from a factory function
    const { ignoreNull = true, itemize = true, configurable = false } = Object.assign({}, fn.options, options);

    // Function wrapper
    const wrapper = (args) => {
      if (ignoreNull && args.value == null) return args.value;
      if (ignoreNull && itemize) return map(args.value, v => fn({ ...args, value: v }));
      return fn(args);
    };

    Object.defineProperty(wrapper, 'kind', { value: kind }); // Used to filter Transformer/Rule functions
    Object.defineProperty(Method, name, { value: wrapper, configurable, enumerable: true }); // Create enumerable method
  }

  static factory(name, thunk, options = {}) {
    if (typeof thunk !== 'function') throw new Error(`Factory definition for "${name}" must be a thunk`);
    if (typeof thunk() !== 'function') throw new Error(`Factory thunk() for "${name}" must return a function`);
    Object.defineProperty(Method, name, { value: Object.defineProperty(thunk, 'options', { value: options }) });
  }

  static createPresets() {
    // Built-In Javascript String Transformers
    const jsStringTransformers = ['toLowerCase', 'toUpperCase', 'toString', 'trim', 'trimEnd', 'trimStart'];
    jsStringTransformers.forEach(name => exports.Transformer.define(`$${name}`, ({ value }) => String(value)[name]()));

    // Additional Transformers
    exports.Transformer.define('$toTitleCase', ({ value }) => value.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()));
    exports.Transformer.define('$toSentenceCase', ({ value }) => value.charAt(0).toUpperCase() + value.slice(1));
    exports.Transformer.define('$toArray', ({ value }) => (Array.isArray(value) ? value : [value]), { itemize: false });
    exports.Transformer.define('$toDate', ({ value }) => new Date(value), { configurable: true });
    exports.Transformer.define('$timestamp', ({ value }) => Date.now(), { ignoreNull: false });
    exports.Transformer.define('$createdAt', ({ value }) => value || Date.now(), { ignoreNull: false });
  }
};

exports.Rule = class Rule extends exports.Method {
  static define(name, fn, options) {
    exports.Method.define('Rule', name, fn, options);
  }
};

exports.Transformer = class Transformer extends exports.Method {
  static define(name, fn, options) {
    exports.Method.define('Transformer', name, fn, options);
  }
};

/* ////////////////////////////////////////////// RULES //////////////////////////////////////////////// */

// // Enforces required fields (only during create)
// exports.Rule.define('required', (f, v, q) => {
//   const { crud, input } = q.toObject();
//   return (crud === 'create' ? v == null : Object.prototype.hasOwnProperty.call(input, f.getName()) && v == null);
// }, { ignoreNull: false });

// // A field cannot hold a reference to itself (model)
// exports.Rule.factory('selfless', (f, v, q) => {
//   const { doc } = q.toObject();
//   if (`${v}` === `${get(doc, 'id')}`) throw Boom.badRequest(`${f.getModel()}.${f.getName()} cannot hold a reference to itself`);
//   return false;
// });

// // Once set it cannot be changed
// exports.Rule.factory('immutable', (f, v, q) => {
//   const { doc, crud } = q.toObject();
//   const path = `${f.getModel()}.${f.getName()}`;
//   const p = path.substr(path.indexOf('.') + 1);
//   const oldVal = get(doc, p);
//   if (crud === 'update' && oldVal !== undefined && v !== undefined && `${hashObject(v)}` !== `${hashObject(oldVal)}`) throw Boom.badRequest(`${path} is immutable; cannot be changed once set`);
//   return false;
// });

// exports.Rule.define('distinct', (f, v) => false);
// exports.Rule.factory('allow', (...args) => (f, v) => args.indexOf(v) === -1);
// exports.Rule.factory('deny', (...args) => (f, v) => args.indexOf(v) > -1);

// exports.Rule.factory('range', (min, max) => {
//   if (min == null) min = undefined;
//   if (max == null) max = undefined;
//   return (f, v) => {
//     const num = +v; // Coerce to number if possible
//     const test = Number.isNaN(num) ? v.length : num;
//     return test < min || test > max;
//   };
// }, { itemize: false });
