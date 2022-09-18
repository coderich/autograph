const _ = require('lodash');
const PicoMatch = require('picomatch');
const FillRange = require('fill-range');
const DeepMerge = require('deepmerge');
const { ObjectId } = require('mongodb');
const ObjectHash = require('object-hash');

// const combineMerge = (target, source, options) => {
//   const destination = target.slice();

//   source.forEach((item, index) => {
//     if (typeof destination[index] === 'undefined') {
//       destination[index] = options.cloneUnlessOtherwiseSpecified(item, options);
//     } else if (options.isMergeableObject(item)) {
//       destination[index] = DeepMerge(target[index], item, options);
//     } else if (target.indexOf(item) === -1) {
//       destination.push(item);
//     }
//   });

//   return destination;
// };

const smartMerge = (target, source, options) => {
  return source;
  // const [el] = target;
  // if (!el || exports.isScalarValue(el)) return source;
  // return combineMerge(target, source, options);
};

exports.id = '3d896496-02a3-4ee5-8e42-2115eb215f7e';
exports.ucFirst = string => string.charAt(0).toUpperCase() + string.slice(1);
exports.lcFirst = string => string.charAt(0).toLowerCase() + string.slice(1);
exports.isNumber = value => typeof value === 'number' && Number.isFinite(value);
exports.isBasicObject = obj => obj != null && typeof obj === 'object' && !(ObjectId.isValid(obj)) && !(obj instanceof Date) && typeof (obj.then) !== 'function';
exports.isPlainObject = obj => exports.isBasicObject(obj) && !Array.isArray(obj);
exports.isScalarValue = value => typeof value !== 'object' && typeof value !== 'function';
exports.isScalarDataType = value => ['String', 'Float', 'Int', 'Boolean', 'DateTime'].indexOf(value) > -1;
exports.isIdValue = value => exports.isScalarValue(value) || value instanceof ObjectId;
exports.mergeDeep = (...args) => DeepMerge.all(args, { isMergeableObject: obj => (exports.isPlainObject(obj) || Array.isArray(obj)), arrayMerge: smartMerge });
exports.uniq = arr => [...new Set(arr.map(a => `${a}`))];
exports.timeout = ms => new Promise(res => setTimeout(res, ms));
exports.hashObject = obj => ObjectHash(obj, { respectType: false, respectFunctionNames: false, respectFunctionProperties: false, unorderedArrays: true, ignoreUnknown: true, replacer: r => (r instanceof ObjectId ? `${r}` : r) });
exports.globToRegex = (glob, options = {}) => PicoMatch.makeRe(glob, { ...options, expandRange: (a, b) => `(${FillRange(a, b, { toRegex: true })})` });
exports.globToRegexp = (glob, options = {}) => PicoMatch.toRegex(exports.globToRegex(glob, options));
exports.toGUID = (model, id) => Buffer.from(`${model},${`${id}`}`).toString('base64');
exports.fromGUID = guid => Buffer.from(`${guid}`, 'base64').toString('ascii').split(',');
exports.guidToId = (autograph, guid) => (autograph.legacyMode ? guid : exports.uvl(exports.fromGUID(guid)[1], guid));
exports.ensureArray = a => (Array.isArray(a) ? a : [a].filter(el => el !== undefined));
exports.uvl = (...values) => values.reduce((prev, value) => (prev === undefined ? value : prev), undefined);
exports.nvl = (...values) => values.reduce((prev, value) => (prev === null ? value : prev), null);
exports.stripObjectNulls = obj => Object.entries(obj).reduce((prev, [key, value]) => (value == null ? prev : Object.assign(prev, { [key]: value })), {});
exports.stripObjectUndefineds = obj => Object.entries(obj).reduce((prev, [key, value]) => (value === undefined ? prev : Object.assign(prev, { [key]: value })), {});
exports.pushIt = (arr, it) => arr[arr.push(it) - 1];
exports.toKeyObj = obj => exports.keyPaths(obj).reduce((prev, path) => Object.assign(prev, { [path]: _.get(obj, path) }), {});

exports.getGQLReturnType = (returnType) => {
  const typeMap = { array: /^\[.+\].?$/, connection: /.+Connection!?$/, number: /^(Int|Float)!?$/, scalar: /.*/ };
  return Object.entries(typeMap).find(([type, pattern]) => returnType.match(pattern))[0];
};

exports.removeUndefinedDeep = (obj) => {
  return exports.unravelObject(exports.keyPaths(obj).reduce((prev, path) => {
    const value = _.get(obj, path);
    if (value === undefined) return prev;
    return Object.assign(prev, { [path]: value });
  }, {}));
};

exports.renameObjectKey = (obj, oldKey, newKey) => {
  if (oldKey !== newKey) {
    Object.defineProperty(obj, newKey, Object.getOwnPropertyDescriptor(obj, oldKey));
    delete obj[oldKey];
  }
};

exports.deleteKeys = (obj, keys) => {
  if (Array.isArray(obj)) obj.map(item => exports.deleteKeys(item, keys));
  else if (obj === Object(obj)) { keys.forEach(key => delete obj[key]); Object.values(obj).forEach(v => exports.deleteKeys(v, keys)); }
  return obj;
};

exports.getDeep = (obj, path, defaultValue) => {
  const [prop, ...rest] = path.split('.');
  const normalize = data => (Array.isArray(data) ? _.flatten(data) : data);

  return exports.map(obj, (o) => {
    const value = o[prop];
    if (rest.length) return normalize(exports.map(value, v => exports.getDeep(v, rest.join('.'), defaultValue)));
    return value === undefined ? defaultValue : value;
  });
};

exports.map = (mixed, fn) => {
  if (mixed == null) return mixed;
  const isArray = Array.isArray(mixed);
  const arr = isArray ? mixed : [mixed];
  const results = isArray ? arr.map((...args) => fn(...args)) : arr.map(el => fn(el));
  return isArray ? results : results[0];
};

exports.mapPromise = (mixed, fn) => {
  const map = exports.map(mixed, fn);
  return Array.isArray(map) ? Promise.all(map) : Promise.resolve(map);
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
      const num = Number(value);
      if (!Number.isNaN(num)) return parseInt(value, 10);
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

exports.objectContaining = (a, b) => {
  if (a === b) return true;

  if (exports.isPlainObject(b)) {
    return exports.keyPathLeafs(b).every((leaf) => {
      const $a = _.get(a, leaf, { a: 'a' });
      const $b = _.get(b, leaf, { b: 'b' });
      if (Array.isArray($b)) return $b.some(bb => exports.ensureArray($a).some(aa => exports.objectContaining(aa, bb)));
      if (exports.isScalarValue($a) && exports.isScalarValue($b)) return PicoMatch.isMatch(`${$a}`, `${$b}`, { nocase: true });
      return exports.hashObject($a) === exports.hashObject($b);
    });
  }

  return exports.hashObject(a) === exports.hashObject(b);
};

/**
 * Transform an object with dot.notation keys into an expanded object.
 * eg. { 'user.name': 'richard' } => { user: { name: 'richard' } }
 */
exports.unravelObject = (obj) => {
  if (!exports.isPlainObject(obj)) return obj;

  return exports.keyPaths(obj).reduce((prev, path) => {
    const splitPath = path.split('.');

    return _.set(prev, path, _.get(obj, path, splitPath.reduce((val, p, i) => {
      if (val !== undefined) return val;
      const tuple = [splitPath.slice(0, i + 1).join('.'), splitPath.slice(i + 1).join('.')];
      return _.get(obj, tuple);
    }, undefined)));
  }, {});
};

exports.unrollGuid = (autograph, model, data) => {
  if (autograph.legacyMode) return data;
  model = autograph.resolver.toModel(model);
  const fields = model.getDataRefFields().map(field => field.getName());

  return exports.map(data, (doc) => {
    return Object.entries(doc).reduce((prev, [key, value]) => {
      return Object.assign(prev, { [key]: (fields.indexOf(key) > -1 ? exports.map(value, v => exports.guidToId(autograph, v)) : value) });
    }, {});
  });
};

exports.keyPaths = (obj = {}, keys = [], path) => {
  return Object.entries(obj).reduce((prev, [key, value]) => {
    const keyPath = path ? `${path}.${key}` : key;
    if (exports.isPlainObject(value) && Object.keys(value).length) return exports.keyPaths(value, prev, keyPath);
    return prev.concat(keyPath);
  }, keys);
};

exports.keyPathLeafs = (obj, keys, path) => {
  return exports.keyPaths(obj, keys, path).sort().reverse().filter((leaf, i, arr) => arr.findIndex(el => el.indexOf(leaf) === 0) === i);
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
    return chain.then(chainResults => promise([...chainResults]).then(promiseResult => [...chainResults, promiseResult]));
  }, Promise.resolve([]));
};

exports.promiseRetry = (fn, ms, retries = 5, cond = e => e) => {
  return fn().catch((e) => {
    if (!retries || !cond(e)) throw e;
    return exports.timeout(ms).then(() => exports.promiseRetry(fn, ms, --retries, cond));
  });
};

exports.proxyPromise = (promise) => {
  return new Proxy(promise, {
    get(target, prop, rec) {
      const value = Reflect.get(target, prop, rec);
      if (typeof value === 'function') return value.bind(target);
      return (...args) => promise.then(result => result[prop](...args));
    },
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
          return Object.assign(prev, { [key]: _.get(value, 'toObject') ? value.toObject(getMap) : value });
        }, {});

        getMap.set(this, plainObject);

        return plainObject;
      };
    },
  });

  proxyMap.set(obj, finalProxy);

  return finalProxy;
};

exports.resolveDataObject = (obj) => {
  return Promise.all(Object.keys(obj).map(async (key) => {
    const value = await obj[key];
    return { key, value };
  })).then((results) => {
    return results.reduce((prev, { key, value }) => {
      return Object.assign(prev, { [key]: value });
    }, {});
  });
};

exports.seek = (obj, paths, hint) => {
  // We first do a normal get
  const value = _.get(obj, paths);
  if (!hint || value !== undefined) return value;

  // Normalize paths & hint for traversal
  const $paths = Array.isArray(paths) ? paths : paths.split('.');
  const $hint = exports.unravelObject(hint);

  // Traverse paths and get as close to the value as possible
  const { currentValue, pathsToGo } = $paths.reduce((prev, path, i, arr) => {
    if (prev.currentValue === undefined) return prev;
    if (!Object.prototype.hasOwnProperty.call(prev.currentValue, path)) return prev;
    prev.currentValue = prev.currentValue[path];
    prev.pathsToGo = arr.slice(i + 1);
    return prev;
  }, { currentValue: obj, pathsToGo: $paths });

  // Only if we hit an array can we continue
  if (!Array.isArray(currentValue)) return undefined;

  // If we got to the last segment we need the hint in order to verify
  const lastPath = Boolean(pathsToGo.length === 1);
  const arr = lastPath ? currentValue.filter(v => exports.objectContaining(v, $hint)) : currentValue;

  // We keep going, recursive, till we find the first value
  return arr.reduce((prev, v) => prev || exports.seek(v, pathsToGo, $hint), undefined);
};

exports.deseek = (shape, obj, paths, hint) => {
  // Normalize paths
  const $paths = (Array.isArray(paths) ? paths : paths.split('.')).map((path) => {
    const item = shape.find(s => s.to === path); // Deserializing from unknown to expected
    return item ? item.from : path;
  });

  // Normalize hint
  const $hint = Object.entries(exports.toKeyObj(hint)).reduce((prev, [key, value]) => {
    const segments = key.split('.').map((path) => {
      const item = shape.find(s => s.to === path); // Deserializing from unknown to expected
      return item ? item.from : path;
    });

    return Object.assign(prev, { [segments.join('.')]: value });
  }, {});

  return exports.seek(obj, $paths, $hint);
};
