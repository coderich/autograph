const { get, set, uniq, flattenDeep } = require('lodash');
const { keyPaths, ensureArray, isPlainObject } = require('../service/app.service');

/**
 * The where clause may contain attributes that are NOT in the model
 * This can happen because the where clause reaches into the schema via refs/virtual refs
 */
exports.resolveWhereClause = (query) => {
  const { resolver, model, match: where = {} } = query.toObject();
  const shape = model.getShape('create', 'where');

  const $where = Object.entries(where).reduce((prev, [from, value]) => {
    const el = shape.find(s => s.from === from);
    if (!el) return prev; // There's no knowing what this could be

    const { isVirtual, isEmbedded, modelRef, virtualRef } = el.field.toObject();

    if (isVirtual) {
      const ids = Promise.all(ensureArray(value).map(v => resolver.match(modelRef).where(isPlainObject(v) ? v : { id: v }).many().then(docs => docs.map(doc => doc[virtualRef])))).then(results => uniq(flattenDeep(results)));
      return Object.assign(prev, { id: ids });
    }

    if (modelRef && !isEmbedded) {
      const ids = Promise.all(ensureArray(value).map(v => (isPlainObject(v) ? resolver.match(modelRef).where(v).many().then(docs => docs.map(doc => doc.id)) : Promise.resolve(v)))).then(results => uniq(flattenDeep(results)));
      return Object.assign(prev, { [from]: ids });
    }

    return Object.assign(prev, { [from]: value });
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
  const shape = model.getShape('create', 'sortBy');
  const $sort = model.shapeObject(shape, sort, query);
  const deletions = [];

  // Because normalize casts the value (sometimes to an array) need special handling
  keyPaths($sort).forEach((path) => {
    const v = get($sort, path);
    const val = Array.isArray(v) ? v[0] : v;
    const [attr] = path.split('.');
    const field = model.getField(attr);
    const join = field.getJoinInfo();

    // If you need to sort by something that's in another FK document
    if (join) {
      deletions.push(attr); // Keep track of what to delete
      query.joins(Object.assign(join, { as: `_.${field}`, left: true }));
      path = `_.${path}`;
    }

    set($sort, path, val.toLowerCase() === 'asc' ? 1 : -1);
  });

  // Delete the sorts on the "base" collection because you're sorting by _.path.to.it (above)
  deletions.forEach(attr => delete $sort[attr]);

  return $sort;
};

exports.resolveReferentialIntegrity = (query) => {
  const { id, model, resolver, transaction } = query.toObject();
  const txn = resolver.transaction(transaction);

  return new Promise((resolve, reject) => {
    try {
      model.referentialIntegrity().forEach(({ model: ref, field, fieldRef, isArray, op }) => {
        const fieldStr = fieldRef ? `${field}.${fieldRef}` : `${field}`;
        const $where = { [fieldStr]: id };

        switch (op) {
          case 'cascade': {
            if (isArray) {
              txn.match(ref).where($where).pull(fieldStr, id);
            } else {
              txn.match(ref).where($where).remove();
            }
            break;
          }
          case 'nullify': {
            txn.match(ref).where($where).save({ [fieldStr]: null });
            break;
          }
          case 'restrict': {
            txn.match(ref).where($where).count().then(count => (count ? reject(new Error('Restricted')) : count));
            break;
          }
          case 'defer': {
            // Defer to the embedded object
            // Marks the field as an onDelete candidate otherwise it (and the embedded object) will get skipped
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
