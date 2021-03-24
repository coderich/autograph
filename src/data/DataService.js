const { get, remove } = require('lodash');
const Boom = require('../core/Boom');
const { createSystemEvent } = require('../service/event.service');
const { isPlainObject, objectContaining, mergeDeep, hashObject } = require('../service/app.service');

exports.paginateResultSet = (rs, first, after, last, before) => {
  let hasNextPage = false;
  let hasPreviousPage = false;
  const limiter = first || last;

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

  return { hasNextPage, hasPreviousPage };
};

exports.spliceEmbeddedArray = async (query, doc, key, from, to) => {
  const { model } = query.toObject();
  const field = model.getField(key);
  if (!field || !field.isArray()) return Promise.reject(Boom.badRequest(`Cannot splice field '${key}'`));

  const modelRef = field.getModelRef();
  const $from = model.deserialize(query, { [key]: from })[key];
  let $to = model.deserialize(query, { [key]: to })[key];

  // Edit
  if (from && to) {
    const arr = get(doc, key) || [];
    if ($from.length > 1 && $to.length === 1) $to = Array.from($from).fill($to[0]);

    const edits = arr.map((el) => {
      return $from.reduce((prev, val, i) => {
        if (objectContaining(el, val)) return isPlainObject(prev) ? mergeDeep(prev, $to[i]) : $to[i];
        return prev;
      }, el);
    });

    if (field.isEmbedded()) {
      return Promise.all(edits.map((edit, i) => {
        if (hashObject(edit) !== hashObject(arr[i])) {
          return createSystemEvent('Mutation', { method: 'update', query: query.clone().model(modelRef).input(edit).doc(doc) }, () => {
            edit = modelRef.appendDefaultFields(query, modelRef.appendCreateFields(edit, true));
            return modelRef.validate(query, edit).then(() => edit);
          });
        }

        return Promise.resolve(edit);
      })).then((results) => {
        return { [key]: mergeDeep(edits, results) };
      });
    }

    return { [key]: edits };
  }

  // Pull
  if (from) {
    const data = { [key]: get(doc, key) || [] };
    remove(data[key], el => $from.find(val => objectContaining(el, val)));
    return data;
  }

  // Push
  if (to) {
    if (field.isEmbedded()) {
      return Promise.all($to.map((input) => {
        return createSystemEvent('Mutation', { method: 'create', query: query.clone().model(modelRef).input(input).doc(doc) }, () => {
          input = modelRef.appendDefaultFields(query, modelRef.appendCreateFields(input, true));
          return modelRef.validate(query, input).then(() => input);
        });
      })).then((results) => {
        return { [key]: (get(doc, key) || []).concat(...results) };
      });
    }

    return { [key]: (get(doc, key) || []).concat($to) };
  }

  // Should never get here
  return Promise.reject(new Error('Invalid spliceEmbeddedArray'));
};
