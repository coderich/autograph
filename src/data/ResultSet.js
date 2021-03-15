const { map } = require('../service/app.service');

module.exports = class ResultSet {
  constructor(data, schema) {
    return data;
    return map(data, (obj) => {
      if (obj == null || typeof obj !== 'object') return obj;

      return new Proxy(obj, {
        get(target, prop, rec) {
          const value = Reflect.get(target, prop, rec);
          if (typeof value === 'function') return value.bind(target);
          return value;

          // if (/^\$[^$]/.test()) {

          // }

          // return Reflect.get(target, schema[prop].key, rec);
        },
      });
    });
  }
};
