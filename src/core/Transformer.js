const { get, set, uniqWith } = require('lodash');
const { map, hashObject } = require('../service/app.service');

const instances = {};
let allInstances;

const jsStringMethods = [
  'charAt', 'charCodeAt', 'codePointAt', 'concat', 'indexOf', 'lastIndexOf', 'localeCompare',
  'normalize', 'padEnd', 'padStart', 'repeat', 'replace', 'search', 'slice', 'split', 'substr', 'substring',
  'toLocaleLowerCase', 'toLocaleUpperCase', 'toLowerCase', 'toString', 'toUpperCase', 'trim', 'trimEnd', 'trimStart', 'raw',
];

class Transformer {
  constructor(thunk, options = {}) {
    const { ignoreNull = true, itemize = true } = (options || {});

    return Object.defineProperty((args) => {
      const { value } = args;
      if (ignoreNull && value == null) return value;
      if (ignoreNull && itemize) return map(value, v => thunk({ ...args, value: v }));
      return thunk(args);
    }, 'type', { value: 'transformer' });
  }

  static factory(name, thunk, options = {}) {
    return Object.defineProperty(Transformer, name, {
      value: (...args) => Object.defineProperty(new Transformer(thunk(...args), options), 'method', { value: name }),
      writable: options.writable,
      enumerable: options.enumerable,
    })[name];
  }

  static extend(name, instance) {
    const invalidArg = () => { throw new Error('Invalid argument; expected Transformer factory instance'); };
    const { method = invalidArg(), type = invalidArg() } = instance;
    if (type !== 'transformer' || !Transformer[method]) invalidArg();
    return (instances[name] = instance);
  }

  static getInstances() {
    if (allInstances) return allInstances;
    const defaultTransformers = Object.entries(Transformer).map(([name, method]) => ({ name, instance: method() }));
    const customTransformers = Object.entries(instances).map(([name, instance]) => ({ name, instance }));
    const transformers = defaultTransformers.concat(customTransformers);
    allInstances = transformers.reduce((prev, { name, instance }) => Object.assign(prev, { [name]: instance }), {});
    return allInstances;
  }
}

// Factory methods
const enumerables = ['toLowerCase', 'toUpperCase', 'trim', 'trimEnd', 'trimStart', 'toString'];
jsStringMethods.forEach(name => Transformer.factory(name, (...args) => ({ value }) => String(value)[name](...args), { enumerable: enumerables.indexOf(name) > -1 }));
Transformer.factory('toTitleCase', () => ({ value }) => value.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()), { enumerable: true });
Transformer.factory('toLocaleTitleCase', (...args) => ({ value }) => value.replace(/\w\S*/g, w => w.charAt(0).toLocaleUpperCase(...args) + w.slice(1).toLocaleLowerCase()));
Transformer.factory('toSentenceCase', () => ({ value }) => value.charAt(0).toUpperCase() + value.slice(1), { enumerable: true });
Transformer.factory('toLocaleSentenceCase', (...args) => ({ value }) => value.charAt(0).toLocaleUpperCase(...args) + value.slice(1));
Transformer.factory('toArray', () => ({ value }) => (Array.isArray(value) ? value : [value]), { itemize: false, enumerable: true });
Transformer.factory('toDate', () => ({ value }) => new Date(value), { enumerable: true, writable: true });
Transformer.factory('dedupe', () => ({ value }) => uniqWith(value, (b, c) => hashObject(b) === hashObject(c)), { ignoreNull: false, enumerable: true });
Transformer.factory('dedupeBy', key => ({ value }) => uniqWith(value, (b, c) => hashObject(b[key]) === hashObject(c[key])), { ignoreNull: false, enumerable: true });
Transformer.factory('timestamp', () => () => Date.now(), { enumerable: true });
Transformer.factory('first', () => ({ value }) => (Array.isArray(value) ? value[0] : value), { enumerable: true });
Transformer.factory('get', path => ({ value }) => get(value, path), { enumerable: true });
Transformer.factory('set', path => ({ value }) => set({}, path, value), { enumerable: true });

module.exports = Transformer;
