const { get, uniqWith } = require('lodash');
const { map, hashObject } = require('../service/app.service');

module.exports = class Pipeline {
  static define(name, factory, options = {}) {
    // A factory must be a function
    if (typeof factory !== 'function') throw new Error(`Pipeline definition for "${name}" must be a function`);

    // Determine options; which may come from the factory function
    const { ignoreNull = true, itemize = true, configurable = false } = Object.assign({}, factory.options, options);

    const wrapper = Object.defineProperty((args) => {
      if (ignoreNull && args.value == null) return args.value;

      if (ignoreNull && itemize) {
        return map(args.value, (val) => {
          const v = factory({ ...args, value: val });
          return v === undefined ? val : v;
        });
      }

      return factory(args);
    }, 'name', { value: name });

    // Attach enumerable method to the Pipeline
    Object.defineProperty(Pipeline, name, {
      value: wrapper,
      configurable,
      enumerable: true,
    });
  }

  static factory(name, thunk, options = {}) {
    if (typeof thunk !== 'function') throw new Error(`Pipeline factory for "${name}" must be a thunk`);
    if (typeof thunk() !== 'function') throw new Error(`Factory thunk() for "${name}" must return a function`);
    Object.defineProperty(Pipeline, name, { value: Object.defineProperty(thunk, 'options', { value: options }) });
  }

  static createPresets() {
    // Built-In Javascript String Transformers
    const jsStringTransformers = ['toLowerCase', 'toUpperCase', 'toString', 'trim', 'trimEnd', 'trimStart'];
    jsStringTransformers.forEach(name => Pipeline.define(`${name}`, ({ value }) => String(value)[name]()));

    // Additional Transformers
    Pipeline.define('toTitleCase', ({ value }) => value.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()));
    Pipeline.define('toSentenceCase', ({ value }) => value.charAt(0).toUpperCase() + value.slice(1));
    Pipeline.define('toArray', ({ value }) => (Array.isArray(value) ? value : [value]), { itemize: false });
    Pipeline.define('toDate', ({ value }) => new Date(value), { configurable: true });
    Pipeline.define('timestamp', ({ value }) => Date.now(), { ignoreNull: false });
    Pipeline.define('createdAt', ({ value }) => value || Date.now(), { ignoreNull: false });
    Pipeline.define('dedupe', ({ value }) => uniqWith(value, (b, c) => hashObject(b) === hashObject(c)), { ignoreNull: false });

    // Required fields
    Pipeline.define('required', ({ value }) => {
      if (value == null) throw new Error('Required.');
    }, { ignoreNull: false });

    // A field cannot hold a reference to itself
    Pipeline.define('selfless', ({ doc, value }) => {
      if (`${value}` === `${get(doc, 'id')}`) throw new Error('Cannot reference to itself');
    });

    Pipeline.factory('allow', (...args) => ({ value }) => {
      if (args.indexOf(value) === -1) throw new Error('allow');
    });

    Pipeline.factory('deny', (...args) => ({ value }) => {
      if (args.indexOf(value) > -1) throw new Error('deny');
    });

    Pipeline.factory('range', (min, max) => {
      if (min == null) min = undefined;
      if (max == null) max = undefined;
      return ({ value }) => {
        const num = +value; // Coerce to number if possible
        const test = Number.isNaN(num) ? value.length : num;
        if (test < min || test > max) throw new Error('range');
      };
    }, { itemize: false });
  }
};

/* ////////////////////////////////////////////// RULES //////////////////////////////////////////////// */

// // Enforces required fields (only during create)
// exports.Rule.define('required', (f, v, q) => {
//   const { crud, input } = q.toObject();
//   return (crud === 'create' ? v == null : Object.prototype.hasOwnProperty.call(input, f.getName()) && v == null);
// }, { ignoreNull: false });
