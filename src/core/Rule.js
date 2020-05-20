const isEmail = require('validator/lib/isEmail');
const { map, ensureArray } = require('../service/app.service');

const instances = {};
const jsStringMethods = ['endsWith', 'includes', 'match', 'search', 'startsWith'];

class Rule {
  constructor(thunk, options = {}, name = 'Unknown') {
    const { ignoreNull = true, itemize = true } = (options || {});

    return Object.defineProperty((field, val, cmp = (f, v) => thunk(f, v)) => {
      return new Promise((resolve, reject) => {
        if (ignoreNull && val == null) return resolve();

        if (ignoreNull && itemize) {
          return Promise.all(ensureArray(map(val, async (v) => {
            const err = await cmp(field, v);
            if (err) return Promise.reject(new Error(`Rule (${name}) failed for { ${field}: ${v} }`));
            return Promise.resolve();
          }))).then(v => resolve()).catch(e => reject(e));
        }

        return Promise.all([(async () => {
          const err = await cmp(field, val);
          if (err) return Promise.reject(new Error(`Rule (${name}) failed for { ${field}: ${val} }`));
          return Promise.resolve();
        })()]).then(v => resolve()).catch(e => reject(e));
      });
    }, 'type', { value: 'rule' });
  }

  static factory(name, thunk, options = {}, descriptor = {}) {
    return Object.defineProperty(Rule, name, {
      value: (...args) => Object.defineProperty(new Rule(thunk(...args), options, name), 'method', { value: name }),
      ...descriptor,
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
// Rule.factory('ensureId', () => (f, v) => false, null, { writable: true });
Rule.factory('required', () => (f, v) => v == null, { ignoreNull: false }, { enumerable: true });
Rule.factory('allow', (...args) => (f, v) => args.indexOf(v) === -1);
Rule.factory('deny', (...args) => (f, v) => args.indexOf(v) > -1);
Rule.factory('range', (min, max) => {
  if (min == null) min = undefined;
  if (max == null) max = undefined;
  return (f, v) => Number.isNaN(v) || v < min || v > max;
});
Rule.factory('email', () => (f, v) => !isEmail(v), null, { enumerable: true });
Rule.factory('selfless', () => (f, v) => false, null, { enumerable: true });
Rule.factory('immutable', () => (f, v) => false, null, { enumerable: true });
Rule.factory('distinct', () => (f, v) => false, null, { enumerable: true });

module.exports = Rule;
