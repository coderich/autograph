const { get, remove } = require('lodash');
const { map, isPlainObject, objectContaining, mergeDeep, ensureArray, keyPaths } = require('../service/app.service');

exports.finalizeResults = (rs, query) => {
  return map(exports.paginateResults(rs, query), (doc) => {
    return Object.defineProperties(doc, {
      $$save: {
        value: () => null,
      },
    });
  });
};

/**
 * This is cursor-style pagination only
 * You add 2 extra records to the result in order to determine previous/next
 */
exports.paginateResults = (rs, query) => {
  const { first, after, last, before, sort } = query.toObject();
  const isPaginating = Boolean(first || last || after || before);

  // Return right away if not paginating
  if (!isPaginating) return rs;

  let hasNextPage = false;
  let hasPreviousPage = false;
  const limiter = first || last;
  const sortPaths = keyPaths(sort);

  // Add $$cursor data
  map(rs, (doc) => {
    const sortValues = sortPaths.reduce((prv, path) => Object.assign(prv, { [path]: get(doc, path) }), {});
    Object.defineProperty(doc, '$$cursor', { get() { return Buffer.from(JSON.stringify(sortValues)).toString('base64'); } });
  });

  // First try to take off the "bookends" ($gte | $lte)
  if (rs.length && rs[0].$$cursor === after) {
    rs.shift();
    hasPreviousPage = true;
  }

  if (rs.length && rs[rs.length - 1].$$cursor === before) {
    rs.pop();
    hasNextPage = true;
  }

  // Next, remove any overage
  const overage = rs.length - (limiter - 2);

  if (overage > 0) {
    if (first) {
      rs.splice(-overage);
      hasNextPage = true;
    } else if (last) {
      rs.splice(0, overage);
      hasPreviousPage = true;
    } else {
      rs.splice(-overage);
      hasNextPage = true;
    }
  }

  // Add $$pageInfo
  return Object.defineProperties(rs, {
    $$pageInfo: {
      get() {
        return {
          startCursor: get(rs, '0.$$cursor', ''),
          endCursor: get(rs, `${rs.length - 1}.$$cursor`, ''),
          hasPreviousPage,
          hasNextPage,
        };
      },
      enumerable: false,
    },
  });
};

exports.spliceEmbeddedArray = (array, from, to) => {
  const op = from && to ? 'edit' : (from ? 'pull' : 'push'); // eslint-disable-line no-nested-ternary

  // Convenience so the user does not have to explicity type out the same value over and over to replace
  if (from && from.length > 1 && to && to.length === 1) to = Array.from(from).fill(to[0]);

  switch (op) {
    case 'edit': {
      array.forEach((el, j) => {
        ensureArray(from).forEach((val, k) => {
          if (objectContaining(el, val)) array[j] = isPlainObject(el) ? mergeDeep(el, ensureArray(to)[k]) : ensureArray(to)[k];
        });
      });
      break;
    }
    // case 'edit': {
    //   ensureArray(from).forEach((f, i) => {
    //     const t = ensureArray(to)[i];
    //     const indexes = array.map((el, j) => (el === f ? j : -1)).filter(index => index !== -1);
    //     indexes.forEach(index => (array[index] = t));
    //   });
    //   break;
    // }
    case 'push': {
      array.push(...to);
      break;
    }
    case 'pull': {
      remove(array, el => from.find(val => objectContaining(el, val)));
      break;
    }
    default: {
      break;
    }
  }

  return array;
};
