const _ = require('lodash');
const { mergeDeep, hashObject } = require('../service/app.service');
const { createSystemEvent } = require('../service/event.service');
const { NotFoundError, BadRequestError } = require('../service/error.service');
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

  get(query, required) {
    const { resolver } = this;
    const [id, model, options] = [query.getId(), query.getModel(), query.getOptions()];

    return createSystemEvent('Query', { key: `get${model}`, method: 'get', model, resolver, query }, async () => {
      const doc = await model.get(id, options).hydrate(resolver, query);
      if (!doc && required) throw new NotFoundError(`${model} Not Found`);
      if (doc == null) return null;
      return doc;
    });
  }

  query(query) {
    const { resolver } = this;
    const [model, where, limit, fields, countFields, sortFields, pagination, options] = [query.getModel(), query.getWhere(), query.getLimit(), query.getSelectFields(), query.getCountFields(), query.getSortFields(), query.getPagination(), query.getOptions()];

    return createSystemEvent('Query', { key: `query${model}`, method: 'query', model, resolver, query }, async () => {
      const results = await resolver.match(model).select(fields).where(where).options(options).many({ find: true });
      const filteredData = filterDataByCounts(resolver, model, results, countFields);
      const sortedResults = sortData(filteredData, sortFields);
      const limitedResults = sortedResults.slice(0, limit > 0 ? limit : undefined);
      return paginateResults(limitedResults, pagination);
    });
  }

  find(query) {
    const { resolver } = this;
    const [model, where, limit, countFields, sortFields, options] = [query.getModel(), query.getWhere(), query.getLimit(), query.getCountFields(), query.getSortFields(), query.getOptions()];
    const $where = model.transform(where);

    return createSystemEvent('Query', { key: `find${model}`, method: 'find', model, resolver, query }, async () => {
      const resolvedWhere = await resolveModelWhereClause(resolver, model, $where);
      const hydratedResults = await model.find(resolvedWhere, options).hydrate(resolver, query);
      const filteredData = filterDataByCounts(resolver, model, hydratedResults, countFields);
      const sortedResults = sortData(filteredData, sortFields);
      const limitedResults = sortedResults.slice(0, limit > 0 ? limit : undefined);
      return paginateResults(limitedResults, query.getPagination());
    });
  }

  count(query) {
    const { resolver } = this;
    const [model, where, countFields, countPaths, options] = [query.getModel(), query.getWhere(), query.getCountFields(), query.getCountPaths(), query.getOptions()];
    const $where = model.transform(where);

    return createSystemEvent('Query', { key: `count${model}`, method: 'count', model, resolver, query }, async () => {
      const resolvedWhere = await resolveModelWhereClause(resolver, model, $where);

      if (countPaths.length) {
        const results = await resolver.match(model).where(resolvedWhere).select(countFields).options(options).many();
        const filteredData = filterDataByCounts(resolver, model, results, countFields);
        return filteredData.length;
      }

      return model.count(resolvedWhere, options);
    });
  }

  async create(query, data = {}) {
    const { resolver } = this;
    const [model, options] = [query.getModel(), query.getOptions()];

    // Set default values for creation
    data.createdAt = Date.now();
    data.updatedAt = Date.now();
    model.setDefaultValues(data, resolver.getContext());

    await validateModelData(model, data, {}, 'create');

    return createSystemEvent('Mutation', { key: `create${model}`, method: 'create', model, resolver, query, data }, async () => {
      return model.create(model.serialize(data), options).hydrate(resolver, query);
    });
  }

  async update(query, data = {}) {
    data.updatedAt = Date.now();
    const { resolver } = this;
    const [id, model, options] = [query.getId(), query.getModel(), query.getOptions()];
    const doc = await resolver.match(model).id(id).options(options).one({ required: true });
    await validateModelData(model, data, doc, 'update');

    return createSystemEvent('Mutation', { key: `update${model}`, method: 'update', model, resolver, query, data, doc }, async () => {
      const merged = model.serialize(mergeDeep(doc, data));
      return model.update(id, data, merged, options).hydrate(resolver, query);
    });
  }

  async splice(query, key, from, to) {
    const { resolver } = this;
    const [id, model, options] = [query.getId(), query.getModel(), query.getOptions()];
    const field = model.getField(key);
    if (!field || !field.isArray()) return Promise.reject(new BadRequestError(`Cannot splice field '${key}'`));
    const doc = await resolver.match(model).id(id).options(options).one({ required: true });
    const $from = model.transform({ [key]: from })[key];
    const $to = model.transform({ [key]: to })[key];

    let data;

    if (from) { // 'from' is correct here because we're testing what was passed into slice() to determine behavior
      data = { [key]: _.get(doc, key, []) };
      _.remove(data[key], el => $from.find(v => hashObject(v) === hashObject(el)));
    } else {
      data = { [key]: _.get(doc, key, []).concat($to) };
    }

    await validateModelData(model, data, doc, 'update');

    return createSystemEvent('Mutation', { key: `splice${model}`, method: 'splice', model, resolver, query, data, doc }, async () => {
      const merged = model.serialize(mergeDeep(doc, data));
      return model.update(id, data, merged, options).hydrate(resolver, query);
    });
  }

  async delete(query, txn) {
    const { resolver } = this;
    const [id, model, options] = [query.getId(), query.getModel(), query.getOptions()];
    const doc = await resolver.match(model).id(id).options(options).one({ required: true });

    return createSystemEvent('Mutation', { key: `delete${model}`, method: 'delete', model, resolver, query, doc }, () => {
      return resolveReferentialIntegrity(resolver, model, query, txn).then(async () => {
        return model.delete(id, doc, options).hydrate(resolver, query);
      });
    });
  }
};
