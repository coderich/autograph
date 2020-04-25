const _ = require('lodash');
const UUID = require('uuid/v4');
const PicoMatch = require('picomatch');
const FillRange = require('fill-range');
const DeepMerge = require('deepmerge');
const { ObjectID } = require('mongodb');
const ObjectHash = require('object-hash');
// const IPO = require('is-plain-object');

exports.id = '3d896496-02a3-4ee5-8e42-2115eb215f7e';
exports.generateId = () => UUID();
exports.ucFirst = string => string.charAt(0).toUpperCase() + string.slice(1);
exports.lcFirst = string => string.charAt(0).toLowerCase() + string.slice(1);
exports.isPlainObject = obj => typeof obj === 'object' && !Array.isArray(obj) && !(obj instanceof ObjectID);
// exports.isPlainObject = obj => IPO(obj) && !Array.isArray(obj);
exports.isScalarValue = value => typeof value !== 'object' && typeof value !== 'function';
exports.isScalarDataType = value => ['ID', 'String', 'Float', 'Int', 'Boolean', 'DateTime'].indexOf(value) > -1;
exports.isIdValue = value => exports.isScalarValue(value) || value instanceof ObjectID;
exports.mergeDeep = (...args) => DeepMerge.all(args, { isMergeableObject: obj => (exports.isPlainObject(obj) || Array.isArray(obj)), arrayMerge: (d, s, o) => s });
exports.uniq = arr => [...new Set(arr.map(a => `${a}`))];
exports.timeout = ms => new Promise(res => setTimeout(res, ms));
exports.hashObject = obj => ObjectHash(obj, { respectType: false, respectFunctionNames: false, respectFunctionProperties: false, unorderedArrays: true, ignoreUnknown: true });
exports.globToRegex = (glob, options = {}) => PicoMatch.makeRe(glob, { maxLength: 100, ...options, expandRange: (a, b) => `(${FillRange(a, b, { toRegex: true })})` });
exports.globToRegexp = (glob, options = {}) => PicoMatch.toRegex(exports.globToRegex(glob, options));
exports.toGUID = (model, id) => Buffer.from(`${model},${`${id}`}`).toString('base64');
exports.fromGUID = guid => Buffer.from(`${guid}`, 'base64').toString('ascii').split(',');
exports.ensureArray = a => (Array.isArray(a) ? a : [a]);
exports.uvl = (...values) => values.reduce((prev, value) => (prev === undefined ? value : prev), undefined);

exports.getDeep = (obj, path, defaultValue) => {
  const results = [];
  const [prop, ...rest] = path.split('.');
  const value = _.get(obj, prop);
  if (Array.isArray(value) && value.length) return results.concat(_.flatten(value.map(v => exports.getDeep(v, rest.join('.'), defaultValue))));
  if (rest.length) return results.concat(exports.getDeep(value, rest.join('.'), defaultValue));
  return results.concat(value === undefined ? defaultValue : value);
};

exports.map = (mixed, fn) => {
  if (mixed == null) return mixed;
  const isArray = Array.isArray(mixed);
  const arr = isArray ? mixed : [mixed];
  const results = arr.map(el => fn(el));
  return isArray ? results : results[0];
};

exports.castCmp = (type, value) => {
  switch (type) {
    case 'String': {
      return `${value}`;
    }
    case 'Float': case 'Number': {
      const num = Number(value);
      if (!Number.isNaN(num)) return num;
      return value;
    }
    case 'Int': {
      const num = parseInt(value, 10);
      if (!Number.isNaN(num)) return num;
      return value;
    }
    case 'Boolean': {
      if (value === 'true') return true;
      if (value === 'false') return false;
      return value;
    }
    default: {
      return value;
    }
  }
};

exports.serialize = (field, value) => {
  if (!exports.isPlainObject(value)) return value;
  const model = field.getModelRef();
  if (!model) return value;
  const key = model.idField();
  return value[key];
};

exports.unravelObject = (obj = {}) => {
  return exports.keyPaths(obj).reduce((prev, path) => {
    const splitPath = path.split('.');
    return _.set(prev, path, _.get(obj, path, splitPath.reduce((val, p, i) => {
      if (val !== undefined) return val;
      const tuple = [splitPath.slice(0, i + 1).join('.'), splitPath.slice(i + 1).join('.')];
      return _.get(obj, tuple);
    }, undefined)));
  }, {});
};

exports.keyPaths = (obj = {}, keys = [], path) => {
  return Object.entries(obj).reduce((prev, [key, value]) => {
    const keyPath = path ? `${path}.${key}` : key;
    if (exports.isPlainObject(value)) return exports.keyPaths(value, prev, keyPath);
    return prev.concat(keyPath);
  }, keys);
};

// exports.keyPaths = (obj, keys = [], path) => {
//   return Object.entries(obj).reduce((prev, [key, value]) => {
//     const keyPath = path ? `${path}.${key}` : key;
//     prev.push(keyPath);
//     if (exports.isPlainObject(value)) return exports.keyPaths(value, prev, keyPath);
//     return prev;
//   }, keys);
// };

exports.queryPaths = (model, obj) => {
  return exports.keyPaths(obj).filter(path => path.indexOf('edges.cursor') === -1).map((path) => {
    return path.replace(/edges|node/gi, '').replace(/^\.+|\.+$/g, '');
  }).filter(a => a);
};

exports.promiseChain = (promises) => {
  return promises.reduce((chain, promise) => {
    return chain.then(chainResults => promise().then(promiseResult => [...chainResults, promiseResult]));
  }, Promise.resolve([]));
};

exports.promiseRetry = (fn, ms, retries = 5, cond = e => e) => {
  return fn().catch((e) => {
    if (!retries || !cond(e)) throw e;
    return exports.timeout(ms).then(() => exports.promiseRetry(fn, ms, --retries, cond));
  });
};

exports.proxyDeep = (obj, handler, proxyMap = new WeakMap(), path = '') => {
  obj = obj || {};
  if (proxyMap.has(obj)) return proxyMap.get(obj);

  const proxy = new Proxy(Object.entries(obj).reduce((prev, [key, value]) => {
    if (Array.isArray(value)) return Object.assign(prev, { [key]: value.map(v => (exports.isPlainObject(v) ? exports.proxyDeep(v, handler, proxyMap, path) : v)) });
    if (exports.isPlainObject(value)) return Object.assign(prev, { [key]: exports.proxyDeep(value, handler, proxyMap, path) });
    return Object.assign(prev, { [key]: value });
  }, {}), handler);

  const finalProxy = Object.defineProperty(proxy, 'toObject', {
    get() {
      return (getMap = new WeakMap()) => {
        if (getMap.has(this)) return getMap.get(this);

        const plainObject = Object.entries(this).reduce((prev, [key, value]) => {
          if (Array.isArray(value)) return Object.assign(prev, { [key]: value.map(v => (v.toObject ? v.toObject(getMap) : v)) });
          return Object.assign(prev, { [key]: value.toObject ? value.toObject(getMap) : value });
        }, {});

        getMap.set(this, plainObject);

        return plainObject;
      };
    },
  });

  proxyMap.set(obj, finalProxy);

  return finalProxy;
};
