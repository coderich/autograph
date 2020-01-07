const _ = require('lodash');
const { ObjectID } = require('mongodb');
const { NotFoundError, BadRequestError } = require('../service/error.service');
const { uniq, globToRegexp, isScalarValue, isPlainObject, promiseChain, isIdValue, keyPaths } = require('../service/app.service');

exports.ensureModel = (loader, model, id) => {
  return loader.get(model, id).exec().then((doc) => {
    if (!doc) throw new NotFoundError(`${model} Not Found`);
    return doc;
  });
};

exports.validateModelData = (loader, model, data, oldData, op) => {
  const promises = [];
  const modelName = model.getName();
  const fields = model.getFields();

  fields.forEach((field) => {
    const key = field.getName();
    const rules = field.getRules() || [];
    const ref = field.getModelRef();
    const isTypeArray = field.isArray();
    const value = data[key];
    const path = `${modelName}.${key}`;
    const isValueArray = Array.isArray(value);

    // User-Defined Validation Rules
    if (value == null || isScalarValue(value) || value instanceof ObjectID) {
      rules.forEach(rule => rule(value, oldData, op, path));
    }

    // The data may not be defined for this key
    if (!Object.prototype.hasOwnProperty.call(data, key)) return;

    // Data type check
    if (isValueArray !== isTypeArray) throw new BadRequestError(`${path} invalid array`);

    // Recursive/Promises lookup
    if (isValueArray) {
      if (ref) {
        if (field.isEmbedded()) {
          promises.push(...value.map(v => exports.validateModelData(loader, ref, v, oldData, op)));
        } else {
          promises.push(...value.map(v => exports.ensureModel(loader, ref, v)));
          value.forEach(v => rules.forEach(rule => rule(v, oldData, op, path)));
        }
      } else {
        value.forEach(v => rules.forEach(rule => rule(v, oldData, op, path)));
      }
    } else if (ref) {
      if (field.isEmbedded()) {
        promises.push(exports.validateModelData(loader, ref, value, oldData, op));
      } else {
        promises.push(exports.ensureModel(loader, ref, value));
      }
    }
  });

  return Promise.all(promises);
};

exports.ensureModelArrayTypes = (loader, model, data) => {
  return Object.entries(data).reduce((prev, [key, value]) => {
    const field = model.getField(key);
    if (value == null || field == null) return prev;

    // Ensure array if type array
    if (field.isArray() && !Array.isArray(value)) prev[key] = [value];

    return prev;
  }, data);
};

exports.applyFieldValueTransform = (field, value) => {
  const type = field.getSimpleType();
  const transforms = field.getTransforms() || [];

  switch (type) {
    case 'String': {
      value = `${value}`;
      break;
    }
    case 'Number': case 'Float': {
      const num = Number(value);
      if (!Number.isNaN(num)) value = num;
      break;
    }
    case 'Boolean': {
      if (value === 'true') value = true;
      if (value === 'false') value = false;
      break;
    }
    default: {
      break;
    }
  }

  // Transforming
  transforms.forEach(t => (value = t(value)));

  return value;
};

exports.normalizeModelWhere = (loader, model, data) => {
  return Object.entries(data).reduce((prev, [key, value]) => {
    const field = model.getField(key);
    if (value == null || field == null) return prev;

    const ref = field.getModelRef();

    if (ref) {
      if (isPlainObject(value)) {
        prev[key] = exports.normalizeModelWhere(loader, ref, value);
      } else if (Array.isArray(value)) {
        prev[key] = value.map((val) => {
          if (isPlainObject(val)) return exports.normalizeModelWhere(loader, ref, val);
          if (isIdValue(val)) return loader.idValue(ref, val);
          return val;
        });
      } else {
        prev[key] = loader.idValue(ref, value);
      }
    } else if (Array.isArray(value)) {
      prev[key] = value.map(val => exports.applyFieldValueTransform(field, val));
    } else {
      prev[key] = exports.applyFieldValueTransform(field, value);
    }

    return prev;
  }, data);
};

exports.normalizeModelData = (loader, model, data) => {
  return Object.entries(data).reduce((prev, [key, value]) => {
    const field = model.getField(key);
    if (value == null || field == null) return prev;

    const ref = field.getModelRef();
    const type = field.getDataType();

    if (isPlainObject(value) && ref) {
      prev[key] = exports.normalizeModelData(loader, ref, value);
    } else if (Array.isArray(value)) {
      if (ref) {
        if (field.isEmbedded() || field.isVirtual()) {
          prev[key] = value.map(v => exports.normalizeModelData(loader, ref, v));
        } else if (type.isSet) {
          prev[key] = uniq(value).map(v => loader.idValue(ref, v));
        } else {
          prev[key] = value.map(v => loader.idValue(ref, v));
        }
      } else {
        prev[key] = value.map(v => exports.applyFieldValueTransform(field, v));
        if (type.isSet) prev[key] = uniq(prev[key]);
      }
    } else if (ref) {
      prev[key] = loader.idValue(ref, value);
    } else {
      prev[key] = exports.applyFieldValueTransform(field, value);
    }

    return prev;
  }, data);
};

exports.resolveModelWhereClause = (loader, model, where = {}, fieldAlias = '', lookups2D = [], index = 0) => {
  const mName = model.getName();
  const fields = model.getFields();

  //
  lookups2D[index] = lookups2D[index] || {
    parentFieldAlias: fieldAlias,
    parentModelName: mName,
    parentFields: fields,
    parentDataRefs: new Set(model.getDataRefFields().map(f => f.getDataRef())),
    lookups: [],
  };

  // Depth first traversal to create 2d array of lookups
  lookups2D[index].lookups.push({
    modelName: mName,
    query: Object.entries(where).reduce((prev, [key, value]) => {
      const field = model.getField(key);

      if (field) {
        const ref = field.getModelRef();

        if (ref) {
          if (isPlainObject(value)) {
            exports.resolveModelWhereClause(loader, ref, value, field.getAlias(key), lookups2D, index + 1);
            return prev;
          }
          if (Array.isArray(value)) {
            const scalars = [];
            const norm = value.map((v) => {
              if (isPlainObject(v)) return v;
              if (field.isVirtual() && isIdValue(v)) return { [loader.idField(ref)]: v };
              scalars.push(v);
              return null;
            }).filter(v => v);
            norm.forEach(val => exports.resolveModelWhereClause(loader, ref, val, field.getAlias(key), lookups2D, index + 1));
            if (scalars.length) prev[key] = scalars;
            return prev;
          }

          if (field.isVirtual()) {
            exports.resolveModelWhereClause(loader, ref, { [loader.idField(ref)]: value }, field.getAlias(key), lookups2D, index + 1);
            return prev;
          }
        }
      }

      return Object.assign(prev, { [key]: value });
    }, {}),
  });

  if (index === 0) {
    if (lookups2D.length === 1) {
      const [{ query }] = lookups2D[0].lookups;
      return query;
    }

    return promiseChain(lookups2D.reverse().map(({ lookups }, index2D) => {
      return () => Promise.all(lookups.map(async ({ modelName, query }) => {
        const parentLookup = lookups2D[index2D + 1] || { parentDataRefs: new Set() };
        const { parentModelName, parentFields, parentDataRefs } = parentLookup;
        const { parentModelName: currentModelName, parentFields: currentFields, parentFieldAlias: currentFieldAlias } = lookups2D[index2D];

        return loader.find(modelName).where(query).exec().then((results) => {
          if (parentDataRefs.has(modelName)) {
            parentLookup.lookups.forEach((lookup) => {
              // Anything with type `modelName` should be added to query
              parentFields.forEach((field) => {
                const ref = field.getDataRef();

                if (ref === modelName) {
                  if (field.isVirtual()) {
                    const cField = currentFields.find(f => f.getName() === field.getVirtualRef());
                    const cAlias = cField.getAlias(field.getVirtualRef());

                    Object.assign(lookup.query, {
                      [loader.idField(parentModelName)]: results.map((result) => {
                        const cValue = result[cAlias];
                        return loader.idValue(parentModelName, cValue);
                      }),
                    });
                  } else {
                    Object.assign(lookup.query, {
                      [currentFieldAlias]: results.map(result => loader.idValue(currentModelName, result.id)),
                    });
                  }
                }
              });
            });
          }

          return results;
        });
      }));
    })).then(() => {
      const [{ query }] = lookups2D[lookups2D.length - 1].lookups;
      return query;
    });
  }

  // Must be a nested call; nothing to do
  return undefined;
};

exports.resolveReferentialIntegrity = async (loader, model, id) => {
  // const onDeletes = parser.getModelOnDeletes(model);
  const doc = await loader.get(model, id).exec();
  return doc;
};

exports.sortData = (data, sortBy) => {
  const paths = keyPaths(sortBy);

  const info = paths.reduce((prev, path, i) => {
    const nextPath = paths[i + 1] || '';
    const prevPath = paths[i - 1] || '';

    if (nextPath.indexOf(`${path}.`) === 0) return prev;
    if (prevPath.indexOf(path) === 0) return prev; // Work to do here (nested path)

    const order = _.get(sortBy, path, 'asc').toLowerCase();
    prev.iteratees.push(path);
    prev.orders.push(order);
    return prev;
  }, {
    iteratees: [],
    orders: [],
  });

  return _.orderBy(data, info.iteratees, info.orders);
};

exports.filterDataByCounts = (loader, model, data, countPaths) => {
  return data.filter(doc => Object.entries(countPaths).every(([path, value]) => String(_.get(doc, path, '')).match(globToRegexp(value))));
};

exports.paginateResults = (results = [], pagination = {}) => {
  const { before, after, first = Infinity, last = 0 } = pagination;
  if (first < 0 || last < 0) throw new Error('Invalid first|last pagination');

  const totalCount = results.length;
  const cursors = results.map(result => result.$$cursor);
  const afterIndex = cursors.findIndex(cursor => cursor >= after); // Want edges after this index
  let beforeIndex = cursors.reverse().findIndex(cursor => cursor <= before);
  if (beforeIndex === -1) beforeIndex = Infinity; // Want edges before this index
  const edges = results.slice(afterIndex + 1, beforeIndex - 1);
  const hasPreviousPage = Boolean(last ? (edges.length > last) : (after && afterIndex));
  const hasNextPage = Boolean(first !== Infinity ? (edges.length > first) : (before && beforeIndex < results.length));
  const slice = edges.slice(0, first).slice(-last);

  return Object.defineProperty(slice, '$$pageInfo', {
    value: {
      startCursor: _.get(slice, '0.$$cursor', ''),
      endCursor: _.get(slice, `${slice.length - 1}.$$cursor`, ''),
      hasPreviousPage,
      hasNextPage,
      totalCount,
    },
  });
};
