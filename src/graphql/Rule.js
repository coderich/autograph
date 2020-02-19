const { map, ensureArray } = require('../service/app.service');

const jsStringMethods = ['endsWith', 'includes', 'match', 'search', 'startsWith'];

class Rule {
  constructor(thunk, ignoreNull = true, name = 'Unknown') {
    return Object.defineProperty((field, val, cmp = (f, v) => thunk(f, v)) => {
      return new Promise((resolve, reject) => {
        if (ignoreNull) {
          if (val != null) {
            return Promise.all(ensureArray(map(val, async (v) => {
              const err = await cmp(field, v);
              if (err) return Promise.reject(new Error(`Rule Error: ${name}`));
              return Promise.resolve();
            }))).then(v => resolve()).catch(e => reject(e));
          }
        } else {
          return Promise.all([(async () => {
            const err = await cmp(field, val);
            if (err) return Promise.reject(new Error(`Rule Error: ${name}`));
            return Promise.resolve();
          })()]).then(v => resolve()).catch(e => reject(e));
        }

        return resolve();
      });
    }, 'type', { value: 'rule' });
  }

  static factory(name, thunk, ignoreNull = true, descriptor = {}) {
    return Object.defineProperty(Rule, name, {
      value: (...args) => Object.defineProperty(new Rule(thunk(...args), ignoreNull, name), 'method', { value: name }),
      ...descriptor,
    })[name];
  }
}

// Factory methods
jsStringMethods.forEach(name => Rule.factory(name, (...args) => (f, v) => !String(v)[name](...args)));
Rule.factory('ensureId', () => (f, v) => false, true, { writable: true });
Rule.factory('required', () => (f, v) => v == null, false, { enumerable: true });
Rule.factory('allow', (...args) => (f, v) => args.indexOf(v) === -1);
Rule.factory('deny', (...args) => (f, v) => args.indexOf(v) > -1);
Rule.factory('range', (min, max) => {
  if (min == null) min = undefined;
  if (max == null) max = undefined;
  return (f, v) => Number.isNaN(v) || v < min || v > max;
});

module.exports = Rule;
