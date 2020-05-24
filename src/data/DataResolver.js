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
