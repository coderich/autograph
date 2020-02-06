const _ = require('lodash');
const { mergeDeep, hashObject } = require('../service/app.service');
const { createSystemEvent } = require('../service/event.service');
const { NotFoundError, BadRequestError } = require('../service/error.service');
const {
  validateModelData,
  normalizeModelData,
  normalizeModelWhere,
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

  get(query, required) {
    const { resolver } = this;
    const [id, model, options] = [query.getId(), query.getModel(), query.getOptions()];

    return createSystemEvent('Query', { method: 'get', model, resolver, query }, async () => {
      const doc = await model.get(id, options);
      if (!doc && required) throw new NotFoundError(`${model} Not Found`);
      if (doc == null) return null;
      return model.hydrate(resolver, doc, { fields: query.getSelectFields() });
    });
  }

  query(query) {
    const { resolver } = this;
    const [model, limit, fields, countFields, sortFields, pagination, options] = [query.getModel(), query.getLimit(), query.getSelectFields(), query.getCountFields(), query.getSortFields(), query.getPagination(), query.getOptions()];

    return createSystemEvent('Query', { method: 'query', model, resolver, query }, async () => {
      const results = await resolver.spot(model).select(fields).where(query.getWhere()).options(options).many({ find: true });
      const filteredData = filterDataByCounts(resolver, model, results, countFields);
      const sortedResults = sortData(filteredData, sortFields);
      const limitedResults = sortedResults.slice(0, limit > 0 ? limit : undefined);
      return paginateResults(limitedResults, pagination);
    });
  }

  find(query) {
    const { resolver } = this;
    const [model, where, limit, selectFields, countFields, sortFields, options] = [query.getModel(), query.getWhere(), query.getLimit(), query.getSelectFields(), query.getCountFields(), query.getSortFields(), query.getOptions()];
    normalizeModelWhere(resolver, model, where);

    return createSystemEvent('Query', { method: 'find', model, resolver, query }, async () => {
      const resolvedWhere = await resolveModelWhereClause(resolver, model, where);
      const results = await model.find(resolvedWhere, options);
      const hydratedResults = await model.hydrate(resolver, results, { fields: selectFields });
      const filteredData = filterDataByCounts(resolver, model, hydratedResults, countFields);
      const sortedResults = sortData(filteredData, sortFields);
      const limitedResults = sortedResults.slice(0, limit > 0 ? limit : undefined);
      return paginateResults(limitedResults, query.getPagination());
    });
  }

  count(query) {
    const { resolver } = this;
    const [model, where, countFields, countPaths, options] = [query.getModel(), query.getWhere(), query.getCountFields(), query.getCountPaths(), query.getOptions()];
    normalizeModelWhere(resolver, model, where);

    return createSystemEvent('Query', { method: 'count', model, resolver, query }, async () => {
      const resolvedWhere = await resolveModelWhereClause(resolver, model, where);

      if (countPaths.length) {
        const results = await resolver.spot(model).where(resolvedWhere).select(countFields).options(options).many();
        const filteredData = filterDataByCounts(resolver, model, results, countFields);
        return filteredData.length;
      }

      return model.count(resolvedWhere, options);
    });
  }

  async create(query, data = {}) {
    const { resolver } = this;
    const [model, options] = [query.getModel(), query.getOptions()];
    normalizeModelData(resolver, model, data);
    await validateModelData(resolver, model, data, {}, 'create');

    return createSystemEvent('Mutation', { method: 'create', model, resolver, query, data }, async () => {
      const doc = await model.create(data, options);
      return model.hydrate(resolver, doc, { fields: query.getSelectFields() });
    });
  }

  async update(query, data = {}) {
    const { resolver } = this;
    const [id, model, options] = [query.getId(), query.getModel(), query.getOptions()];
    const doc = await resolver.spot(model).id(id).options(options).one({ required: true });
    normalizeModelData(resolver, model, data);
    await validateModelData(resolver, model, data, doc, 'update');

    return createSystemEvent('Mutation', { method: 'update', model, resolver, query, data }, async () => {
      const merged = normalizeModelData(resolver, model, mergeDeep(doc, data));
      const result = await model.update(id, data, merged, options);
      return model.hydrate(resolver, result, { fields: query.getSelectFields() });
    });
  }

  async splice(query, key, from, to) {
    const { resolver } = this;
    const [id, model, options] = [query.getId(), query.getModel(), query.getOptions()];
    const field = model.getField(key);
    if (!field || !field.isArray()) return Promise.reject(new BadRequestError(`Cannot splice field '${key}'`));
    const doc = await resolver.spot(model).id(id).options(options).one({ required: true });
    from = normalizeModelData(resolver, model, { [key]: from })[key];
    to = normalizeModelData(resolver, model, { [key]: to })[key];

    let data;

    if (from) {
      data = { [key]: _.get(doc, key, []) };
      _.remove(data[key], el => from.find(v => hashObject(v) === hashObject(el)));
    } else {
      data = { [key]: _.get(doc, key, []).concat(to) };
    }

    normalizeModelData(resolver, model, data);
    await validateModelData(resolver, model, data, doc, 'update');

    return createSystemEvent('Mutation', { method: 'splice', model, resolver, query, data }, async () => {
      const merged = normalizeModelData(resolver, model, mergeDeep(doc, data));
      const result = await model.update(id, data, merged, options);
      return model.hydrate(resolver, result, { fields: query.getSelectFields() });
    });
  }

  async delete(query, txn) {
    const { resolver } = this;
    const [id, model, options] = [query.getId(), query.getModel(), query.getOptions()];
    const doc = await resolver.spot(model).id(id).options(options).one({ required: true });

    return createSystemEvent('Mutation', { method: 'delete', model, resolver, query }, () => {
      return resolveReferentialIntegrity(resolver, model, query, txn).then(async () => {
        const result = await model.delete(id, doc, options);
        return model.hydrate(resolver, result, { fields: query.getSelectFields() });
      });
    });
  }
};
