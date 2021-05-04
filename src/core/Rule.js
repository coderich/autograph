const { get } = require('lodash');
const isEmail = require('validator/lib/isEmail');
const Boom = require('./Boom');
const { map, ensureArray, hashObject } = require('../service/app.service');

const instances = {};
const jsStringMethods = ['endsWith', 'includes', 'match', 'search', 'startsWith'];

class Rule {
  constructor(thunk, options = {}, name = 'Unknown') {
    const {
      ignoreNull = true,
      itemize = true,
      toError = (field, value, msg) => Boom.notAcceptable(`Rule (${name}) failed for { ${field.getModel()}.${field}: ${value} }`),
    } = (options || {});

    return Object.defineProperty((field, val, query) => {
      return new Promise((resolve, reject) => {
        if (ignoreNull && val == null) return resolve();

        if (ignoreNull && itemize) {
          return Promise.all(ensureArray(map(val, async (v) => {
            const err = await thunk(field, v, query);
            if (err) return Promise.reject(toError(field, v));
            return Promise.resolve();
          }))).then(v => resolve()).catch(e => reject(e));
        }

        return Promise.all([(async () => {
          const err = await thunk(field, val, query);
          if (err) return Promise.reject(toError(field, val));
          return Promise.resolve();
        })()]).then(v => resolve()).catch(e => reject(e));
      });
    }, 'type', { value: 'rule' });
  }

  static factory(name, thunk, options = {}) {
    return Object.defineProperty(Rule, name, {
      value: (...args) => Object.defineProperty(new Rule(thunk(...args), options, name), 'method', { value: name }),
      writable: options.writable,
      enumerable: options.enumerable,
    })[name];
  }

  static extend(name, instance) {
    const invalidArg = () => { throw new Error('Invalid argument; expected Rule factory instance'); };
    const { method = invalidArg(), type = invalidArg() } = instance;
    if (type !== 'rule' || !Rule[method]) invalidArg();
    return (instances[name] = instance);
  }

  static getInstances() {
    const defaultRules = Object.entries(Rule).map(([name, method]) => ({ name, instance: method() }));
    const customRules = Object.entries(instances).map(([name, instance]) => ({ name, instance }));
    const rules = defaultRules.concat(customRules);
    return rules.reduce((prev, { name, instance }) => Object.assign(prev, { [name]: instance }), {});
  }
}

// Factory methods
jsStringMethods.forEach(name => Rule.factory(name, (...args) => (f, v) => !String(v)[name](...args)));

// Ensures Foreign Key relationships
Rule.factory('ensureId', () => (f, v, q) => {
  const { resolver } = q.toObject();
  return resolver.match(f.getType()).id(v).one().then(doc => Boolean(doc == null));
});

// Enforces required fields (only during create)
Rule.factory('required', () => (f, v, q) => {
  const { crud, input } = q.toObject();
  return (crud === 'create' ? v == null : Object.prototype.hasOwnProperty.call(input, f.getName()) && v == null);
}, { ignoreNull: false, enumerable: true });

// A field cannot hold a reference to itself (model)
Rule.factory('selfless', () => (f, v, q) => {
  const { doc } = q.toObject();
  if (`${v}` === `${get(doc, 'id')}`) throw Boom.badRequest(`${f.getModel()}.${f.getName()} cannot hold a reference to itself`);
  return false;
}, { enumerable: true });

// Once set it cannot be changed
Rule.factory('immutable', () => (f, v, q) => {
  const { doc, crud } = q.toObject();
  const path = `${f.getModel()}.${f.getName()}`;
  const p = path.substr(path.indexOf('.') + 1);
  const oldVal = get(doc, p);
  if (crud === 'update' && v !== undefined && `${hashObject(v)}` !== `${hashObject(oldVal)}`) throw Boom.badRequest(`${path} is immutable; cannot be changed once set`);
  return false;
}, { enumerable: true });

Rule.factory('allow', (...args) => (f, v) => args.indexOf(v) === -1);
Rule.factory('deny', (...args) => (f, v) => args.indexOf(v) > -1);
Rule.factory('range', (min, max) => {
  if (min == null) min = undefined;
  if (max == null) max = undefined;
  return (f, v) => (Number.isNaN(v) ? v.length < min || v.length > max : v < min || v > max);
});
Rule.factory('email', () => (f, v) => !isEmail(v), { enumerable: true });
Rule.factory('distinct', () => (f, v) => false, { enumerable: true });

module.exports = Rule;
