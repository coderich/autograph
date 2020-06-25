const { get, remove } = require('lodash');
const Boom = require('../core/Boom');
const { map, mergeDeep, hashObject, stripObjectNulls } = require('../service/app.service');
const { createSystemEvent } = require('../service/event.service');
const {
  validateModelData,
  resolveModelWhereClause,
  resolveReferentialIntegrity,
  sortData,
  filterDataByCounts,
  paginateResults,
} = require('../service/data.service');

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

  get(query, required) {
    const { resolver } = this;
    const model = query.getModel();

    return createSystemEvent('Query', { method: 'get', model, resolver, query }, async () => {
      const doc = await model.get(query).hydrate(resolver, query);
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
        const $where = model.removeBoundKeys(where);
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

      const $where = model.removeBoundKeys(where);
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

    // Set default values for creation
    input.createdAt = new Date();
    input.updatedAt = new Date();
    input = await model.resolveDefaultValues(stripObjectNulls(input));

    // Generate embedded default values
    model.getEmbeddedFields().forEach((field) => {
      if (!input[field]) return;
      const idKey = field.getModelRef().idKey();

      map(input[field], (v) => {
        if (v == null) return;
        if (idKey && !v[idKey]) v[idKey] = model.idValue();
        v.createdAt = new Date();
        v.updatedAt = new Date();
      });
    });

    return createSystemEvent('Mutation', { method: 'create', model, resolver, query, input }, async () => {
      await validateModelData(model, input, {}, 'create');
      return model.create(input, options).hydrate(resolver, query);
    });
  }

  async update(query, input) {
    input = input || {};
    input.updatedAt = new Date();
    const { resolver } = this;
    const [id, model, options] = [query.getId(), query.getModel(), query.getOptions()];
    const doc = await resolver.match(model).id(id).options(options).one({ required: true });
    input = model.removeBoundKeys(input);
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
    const $to = model.transform({ [key]: to })[key];

    let data;

    if (from) { // 'from' is correct here because we're testing what was passed into slice() to determine behavior
      data = { [key]: get(doc, key, []) };
      remove(data[key], el => $from.find(v => hashObject(v) === hashObject(el)));
    } else {
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
