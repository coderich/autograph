const { map } = require('../service/app.service');

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
