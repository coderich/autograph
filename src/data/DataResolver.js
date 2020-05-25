/**
 * DataResolver.
 *
 * A simple Proxy to allow dynamic lazy-loading of data attributes. It's primary use is to hydrate
 * data from the database as needed.
 */
module.exports = class DataResolver {
  constructor(data, resolver = (d, p) => d[p]) {
    return new Proxy(data, {
      get(target, prop, rec) {
        const value = Reflect.get(target, prop, rec);
        if (typeof value === 'function') return value.bind(target);
        return resolver(data, prop);
      },
    });
  }
};
