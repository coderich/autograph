const { map } = require('../service/app.service');

class Method {
  constructor(name, fn, options = {}) {
    const { ignoreNull = true, itemize = true, writable = false } = Object.assign({}, fn.options, options);

    Object.defineProperty(Method, name, {
      value: (args) => {
        const { value } = args;
        if (ignoreNull && value == null) return value;
        if (ignoreNull && itemize) return map(value, v => fn({ ...args, value: v }));
        return fn(args);
      },
      writable,
      enumerable: true,
    });
  }

  static register(name, fn, options = {}) {
    Object.defineProperty(Method, name, {
      value: Object.defineProperty(fn, 'options', { value: options }),
    });
  }
}

exports.Rule = class Rule extends Method {
  constructor(name, fn, options = {}) {
    super(name, fn, options = {});
    Object.defineProperty(Method[name], 'kind', { value: 'rule' });
  }
};

exports.Transformer = class Transformer extends Method {
  constructor(name, fn, options = {}) {
    super(name, fn, options = {});
    Object.defineProperty(Method[name], 'kind', { value: 'transformer' });
  }
};


// Rule.factory('multiplyBy', x => ({ value }) => value * x).itemize(true);
// Rule.template('multiplyBy', x => ({ value }) => value * x).itemize(true);
// Rule.register('multiplyBy', x => ({ value }) => value * x).itemize(true);

// new Rule('multiplyBy10', Rule.multiplyBy(10)).itemize(false);
// new Rule('required', ({ value }) => value == null);
