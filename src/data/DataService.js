const { get, remove } = require('lodash');
const { isPlainObject, objectContaining, mergeDeep, ensureArray, keyPaths } = require('../service/app.service');

exports.paginateResultSet = (rs, query) => {
  const { first, after, last, before, sort } = query.toObject();
  const $rs = exports.toResultSet(rs, sort);

  let hasNextPage = false;
  let hasPreviousPage = false;

  const limiter = first || last;

  // First try to take off the "bookends" ($gte | $lte)
  if ($rs.length && $rs[0].$$cursor === after) {
    rs.shift();
    $rs.shift();
    hasPreviousPage = true;
  }

  if ($rs.length && $rs[$rs.length - 1].$$cursor === before) {
    rs.pop();
    $rs.pop();
    hasNextPage = true;
  }

  // Next, remove any overage
  const overage = $rs.length - (limiter - 2);

  if (overage > 0) {
    if (first) {
      rs.splice(-overage);
      $rs.splice(-overage);
      hasNextPage = true;
    } else if (last) {
      rs.splice(0, overage);
      $rs.splice(0, overage);
      hasPreviousPage = true;
    } else {
      rs.splice(-overage);
      $rs.splice(-overage);
      hasNextPage = true;
    }
  }

  return { rs, hasNextPage, hasPreviousPage };
};

exports.toResultSet = (results, sort) => {
  return results.map((doc) => {
    return {
      get $$cursor() {
        const sortPaths = keyPaths(sort);
        const sortValues = sortPaths.reduce((prv, path) => Object.assign(prv, { [path]: get(doc, path) }), {});
        const sortJSON = JSON.stringify(sortValues);
        return Buffer.from(sortJSON).toString('base64');
      },
    };
  });
};

/**
 * @param from <Array>
 * @param to <Array>
 */
// exports.spliceEmbeddedArray = (query, doc, key, from, to) => {
//   const { model } = query.toObject();
//   const field = model.getField(key);
//   const modelRef = field.getModelRef();
//   const op = from && to ? 'edit' : (from ? 'pull' : 'push'); // eslint-disable-line no-nested-ternary
//   const promises = [];

//   // Can only splice arrays
//   if (!field || !field.isArray()) return Promise.reject(Boom.badRequest(`Cannot splice field '${key}'`));

//   // We have to deserialize because this normalizes the data (casting etc)
//   let $to = model.deserialize(query, { [key]: to })[key] || to;
//   const $from = model.deserialize(query, { [key]: from })[key] || from;

//   // If it's embedded we need to append default/create fields for insertion
//   if ($to && field.isEmbedded()) $to = $to.map(el => modelRef.appendDefaultFields(query, modelRef.appendCreateFields(el, true)));

//   // Convenience so the user does not have to explicity type out the same value over and over to replace
//   if ($from && $from.length > 1 && $to && $to.length === 1) $to = Array.from($from).fill($to[0]);

//   // Traverse the document till we find the segment to modify (in place)
//   return key.split('.').reduce((prev, segment, i, arr) => {
//     if (prev == null) return prev;

//     return map(prev, (data) => {
//       if (i < (arr.length - 1)) return data[segment]; // We have not found the target segment yet
//       data[segment] = data[segment] || []; // Ensuring target segment is an array

//       switch (op) {
//         case 'edit': {
//           data[segment].forEach((el, j) => {
//             $from.forEach((val, k) => {
//               if (objectContaining(el, val)) data[segment][j] = isPlainObject(el) ? mergeDeep(el, $to[k]) : $to[k];
//             });
//           });
//           break;
//         }
//         case 'push': {
//           data[segment].push(...$to);
//           break;
//         }
//         case 'pull': {
//           remove(data[segment], el => $from.find(val => objectContaining(el, val)));
//           break;
//         }
//         default: {
//           break;
//         }
//       }

//       return Promise.all(promises);
//     });
//   }, doc);
// };

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
