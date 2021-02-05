/**
 * Memoizer.
 *
 * Keeps a memoized cache of function call results; executing them once and reusing the result.
 *
 * @param {Object} src - the object|function to memoize
 * @param {Array} whitelist - whitelist of src methods to memoize (defaults to enumerable functions)
 */
module.exports = class Memoizer {
  constructor(src, whitelist = Object.keys(src).filter(k => typeof src[k] === 'function')) {
    const cache = {};

    return new Proxy(src, {
      // This gets called when accessing properties of an object
      get(target, prop, rec) {
        const value = Reflect.get(target, prop, rec);

        if (typeof value === 'function') {
          if (whitelist.indexOf(prop) === -1) return value.bind(target);

          return (...args) => {
            const key = `${prop}:${JSON.stringify(args)}`;
            cache[key] = Object.prototype.hasOwnProperty.call(cache, key) ? cache[key] : value.bind(target)(...args);
            return cache[key];
          };
        }

        return value;
      },

      // This gets called when src is a function
      apply(target, thisArg, args) {
        const key = JSON.stringify(args);
        cache[key] = Object.prototype.hasOwnProperty.call(cache, key) ? cache[key] : target.call(thisArg, ...args);
        return cache[key];
      },
    });
  }
};
