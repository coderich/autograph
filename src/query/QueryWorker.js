const { get, remove } = require('lodash');
const Boom = require('../core/Boom');
const { map, ensureArray, mergeDeep, hashObject, stripObjectNulls, keyPathLeafs, isPlainObject } = require('../service/app.service');
const { createSystemEvent } = require('../service/event.service');
const {
  validateModelData,
  resolveModelWhereClause,
  resolveReferentialIntegrity,
  sortData,
  filterDataByCounts,
  paginateResults,
} = require('../service/data.service');

const appendCreateFields = async (model, input, embed = false) => {
  const idKey = model.idKey();

  // NOT SURE WHY THIS DOES'T WORK
  // await Promise.all(ensureArray(map(input, async (v) => {
  //   if (embed && idKey && !v[idKey]) v[idKey] = model.idValue();
  //   v.createdAt = new Date();
  //   v.updatedAt = new Date();
  //   if (!embed) v = await model.resolveDefaultValues(stripObjectNulls(v));
  // })));

  // BUT THIS DOES...
  if (embed && idKey && !input[idKey]) input[idKey] = model.idValue();
  input.createdAt = new Date();
  input.updatedAt = new Date();
  if (!embed) input = await model.resolveDefaultValues(stripObjectNulls(input));

  // Generate embedded default values
  await Promise.all(model.getEmbeddedFields().map((field) => {
    if (!input[field]) return Promise.resolve();
    return Promise.all(ensureArray(map(input[field], v => appendCreateFields(field.getModelRef(), v, true))));
  }));

  return input;
};

const appendUpdateFields = async (model, input) => {
  input.updatedAt = new Date();
  input = model.removeBoundKeys(input);
  return input;
};

module.exports = class QueryWorker {
  constructor(resolver) {
    this.resolver = resolver;

    // Convenience methods
    this.push = (query, key, values) => this.splice(query, key, null, values);
    this.pull = (query, key, values) => this.splice(query, key, values);
  }

  query(query) {
    return this.find(query);
  }

  async get(query, required) {
    const { resolver } = this;
    const [model, id, options] = [query.getModel(), query.getId(), query.getOptions()];

    // Construct where clause
    const where = { [model.idKey()]: model.idValue(id) };
    const $where = await model.resolveBoundValues(where);
    const $$where = model.transform($where);
    const resolvedWhere = await resolveModelWhereClause(resolver, model, $$where);

    return createSystemEvent('Query', { method: 'get', model, resolver, query }, async () => {
      const doc = await model.get(resolvedWhere, options).hydrate(resolver, query);
      if (!doc && required) throw Boom.notFound(`${model} Not Found`);
      if (doc == null) return null;
      return doc;
    });
  }

  find(query) {
    const { resolver } = this;
    const [model, where, limit, countFields, sortFields, options] = [query.getModel(), query.getWhere(), query.getLimit(), query.getCountFields(), query.getSortFields(), query.getOptions()];

    let hydratedResults;
    return createSystemEvent('Query', { method: 'find', model, resolver, query }, async () => {
      if (query.isNative()) {
        hydratedResults = await model.native('find', query.getNative(), options).hydrate(resolver, query);
      } else {
        const $where = await model.resolveBoundValues(where);
        const $$where = model.transform($where);
        const resolvedWhere = await resolveModelWhereClause(resolver, model, $$where);
        hydratedResults = await model.find(resolvedWhere, options).hydrate(resolver, query);
      }
      const filteredData = filterDataByCounts(resolver, model, hydratedResults, countFields);
      const sortedResults = sortData(filteredData, sortFields);
      const limitedResults = sortedResults.slice(0, limit > 0 ? limit : undefined);
      return paginateResults(limitedResults, query.getPagination());
    });
  }

  count(query) {
    const { resolver } = this;
    const [model, where, countFields, countPaths, options] = [query.getModel(), query.getWhere(), query.getCountFields(), query.getCountPaths(), query.getOptions()];

    return createSystemEvent('Query', { method: 'count', model, resolver, query }, async () => {
      if (query.isNative()) return model.native('count', query.getNative(), options);

      const $where = await model.resolveBoundValues(where);
      const $$where = model.transform($where);
      const resolvedWhere = await resolveModelWhereClause(resolver, model, $$where);

      if (countPaths.length) {
        const results = await resolver.match(model).where(resolvedWhere).select(countFields).options(options).many();
        const filteredData = filterDataByCounts(resolver, model, results, countFields);
        return filteredData.length;
      }

      return model.count(resolvedWhere, options);
    });
  }

  async create(query, input) {
    input = input || {};
    const { resolver } = this;
    const [model, options] = [query.getModel(), query.getOptions()];

    // Set default values for create
    input = await appendCreateFields(model, input);

    return createSystemEvent('Mutation', { method: 'create', model, resolver, query, input }, async () => {
      await validateModelData(model, input, {}, 'create');
      return model.create(input, options).hydrate(resolver, query);
    });
  }

  async update(query, input) {
    input = input || {};
    const { resolver } = this;
    const [id, model, options] = [query.getId(), query.getModel(), query.getOptions()];
    const doc = await resolver.match(model).id(id).options(options).one({ required: true });

    // Set default values for update
    input = await appendUpdateFields(model, input);
    const merged = mergeDeep(doc, input);

    return createSystemEvent('Mutation', { method: 'update', model, resolver, query, input, doc, merged }, async () => {
      await validateModelData(model, input, doc, 'update');
      return model.update(id, input, mergeDeep(doc, input), options).hydrate(resolver, query);
    });
  }

  async splice(query, key, from, to) {
    const { resolver } = this;
    const [id, model, options] = [query.getId(), query.getModel(), query.getOptions()];
    const field = model.getField(key);
    if (!field || !field.isArray()) return Promise.reject(Boom.badRequest(`Cannot splice field '${key}'`));
    const doc = await resolver.match(model).id(id).options(options).one({ required: true });
    const $from = model.transform({ [key]: from })[key];
    let $to = model.transform({ [key]: to })[key];

    const compare = (a, b) => {
      if (isPlainObject(a)) {
        return keyPathLeafs(a).every((leaf) => {
          const $a = get(a, leaf, { a: 'a' });
          const $b = get(b, leaf, { b: 'b' });
          if (Array.isArray($a)) return $a.some(aa => ensureArray($b).some(bb => compare(aa, bb)));
          return hashObject($a) === hashObject($b);
        });
      }

      return hashObject(a) === hashObject(b);
    };

    let data;

    if (from && to) {
      // Edit
      data = { [key]: get(doc, key, []) };
      if ($from.length > 1 && $to.length === 1) $to = Array.from($from).fill($to[0]);
      data[key] = data[key].map((el) => {
        return $from.reduce((prev, val, i) => {
          if (compare(val, el)) {
            return isPlainObject(prev) ? mergeDeep(prev, $to[i]) : $to[i];
          }
          return prev;
        }, el);
      });
    } else if (from) {
      // Pull
      data = { [key]: get(doc, key, []) };
      remove(data[key], el => $from.find(val => compare(val, el)));
    } else if (to) {
      // Push
      if (field.isEmbedded()) {
        const modelRef = field.getModelRef();
        const results = await Promise.all(ensureArray(map($to, v => appendCreateFields(modelRef, v, true))));
        $to = Array.isArray($to) ? results : results[0];
      }
      data = { [key]: get(doc, key, []).concat($to) };
    }

    const merged = mergeDeep(doc, data);

    return createSystemEvent('Mutation', { method: 'splice', model, resolver, query, input: data, doc, merged }, async () => {
      await validateModelData(model, data, doc, 'update');
      return model.update(id, data, mergeDeep(doc, data), options).hydrate(resolver, query);
    });
  }

  async delete(query, txn) {
    const { resolver } = this;
    const [id, model, options] = [query.getId(), query.getModel(), query.getOptions()];
    const doc = await resolver.match(model).id(id).options(options).one({ required: true });

    return createSystemEvent('Mutation', { method: 'delete', model, resolver, query, doc }, () => {
      return resolveReferentialIntegrity(resolver, model, query, txn).then(async () => {
        return model.delete(id, doc, options).hydrate(resolver, query);
      });
    });
  }
};
