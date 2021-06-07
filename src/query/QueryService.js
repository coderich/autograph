const { get, set, uniq, flattenDeep } = require('lodash');
const { map, keyPaths, ensureArray, isPlainObject } = require('../service/app.service');

const resolveEmbeddedWhere = (ref, key, value) => {
  const resolved = ensureArray(map(value, (obj) => {
    return Object.entries(obj).reduce((p, [k, v]) => {
      const f = ref.getFieldByName(k);

      if (k === 'id') return Object.assign(p, { [k]: ref.idValue(v) });
      if (f.isScalar()) return Object.assign(p, { [k]: v });
      if (f.isEmbedded()) return Object.assign(p, { [k]: resolveEmbeddedWhere(f.getModelRef(), k, v) });
      return Object.assign(p, { [k]: v });
    }, {});
  }));

  return resolved.length > 1 ? resolved : resolved[0];
};

exports.resolveWhereClause = (query) => {
  const { resolver, model, match: where = {}, flags = {} } = query.toObject();

  // This is needed for where clause (but why!?!)
  if (where.id) where.id = map(where.id, v => model.idValue(v));

  // Construct
  const $where = Object.entries(where).reduce((prev, [key, value]) => {
    const field = model.getField(key);
    if (!field) return prev;
    const modelRef = field.getModelRef();

    if (field.isVirtual()) {
      const virtualRef = field.getVirtualRef();
      const ids = Promise.all(ensureArray(value).map(v => resolver.match(modelRef).where(isPlainObject(v) ? v : { id: v }).many(flags).then(docs => docs.map(doc => doc[virtualRef])))).then(results => uniq(flattenDeep(results)));
      return Object.assign(prev, { id: ids });
    }

    if (modelRef && !field.isEmbedded()) {
      const ids = Promise.all(ensureArray(value).map(v => (isPlainObject(v) ? resolver.match(modelRef).where(v).many(flags).then(docs => docs.map(doc => doc.id)) : Promise.resolve(v)))).then(results => uniq(flattenDeep(results)));
      return Object.assign(prev, { [key]: ids });
    }

    // You do not have a unit-test that tests this (BUT ITS NEEDED)
    if (field.isEmbedded()) {
      return Object.assign(prev, { [key]: resolveEmbeddedWhere(modelRef, key, value) });
    }

    return Object.assign(prev, { [key]: value });
  }, {});

  // Resolve
  return Promise.all(keyPaths($where).map(async (path) => {
    const $value = await get($where, path);
    return { path, $value };
  })).then((results) => {
    return results.reduce((prev, { path, $value }) => {
      if (Array.isArray($value) && $value.length === 1) [$value] = $value;
      return set(prev, path, $value);
    }, {});
  });
};

exports.resolveSortBy = (query) => {
  const { model, sort = {} } = query.toObject();
  const $sort = model.normalize(query, sort, 'serialize', true);

  // Because normalize casts the value (sometimes to an array) need special handling
  keyPaths($sort).forEach((path) => {
    const v = get($sort, path);
    const val = Array.isArray(v) ? v[0] : v;
    set($sort, path, val.toLowerCase() === 'asc' ? 1 : -1);
  });

  return $sort;
};

// exports.resolveSortBy = (query) => {
//   const { sort = {} } = query.toObject();

//   // Because normalize casts the value (sometimes to an array) need special handling
//   keyPaths(sort).forEach((path) => {
//     const v = get(sort, path);
//     const val = Array.isArray(v) ? v[0] : v;
//     set(sort, path, val.toLowerCase() === 'asc' ? 1 : -1);
//   });

//   return sort;
// };

exports.resolveReferentialIntegrity = (query) => {
  const { id, model, resolver, transaction, flags } = query.toObject();
  const txn = resolver.transaction(transaction);

  return new Promise((resolve, reject) => {
    try {
      model.referentialIntegrity().forEach(({ model: ref, field, fieldRef, isArray, op }) => {
        const fieldStr = fieldRef ? `${field}.${fieldRef}` : `${field}`;
        const $where = { [fieldStr]: id };

        switch (op) {
          case 'cascade': {
            if (isArray) {
              txn.match(ref).where($where).flags(flags).pull(fieldStr, id);
            } else {
              txn.match(ref).where($where).flags(flags).remove();
            }
            break;
          }
          case 'nullify': {
            txn.match(ref).where($where).flags(flags).save({ [fieldStr]: null });
            break;
          }
          case 'restrict': {
            txn.match(ref).where($where).flags(flags).count().then(count => (count ? reject(new Error('Restricted')) : count));
            break;
          }
          default: throw new Error(`Unknown onDelete operator: '${op}'`);
        }
      });

      // Execute the transaction
      txn.run().then(results => resolve(results)).catch(e => reject(e));
    } catch (e) {
      txn.rollback().then(() => reject(e)).catch(err => reject(err));
    }
  });
};
