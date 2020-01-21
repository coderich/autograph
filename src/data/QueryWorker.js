const _ = require('lodash');
// const Query = require('./Query');
const { mergeDeep, hashObject } = require('../service/app.service');
const { createSystemEvent } = require('../service/event.service');
const { NotFoundError, BadRequestError } = require('../service/error.service');
const {
  ensureModelArrayTypes,
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
  constructor(loader) {
    this.loader = loader;

    // Convenience methods
    this.push = (query, key, values) => this.splice(query, key, null, values);
    this.pull = (query, key, values) => this.splice(query, key, values);
  }

  get(query, required) {
    const { loader } = this;
    const [id, model, options] = [query.getId(), query.getModel(), query.getOptions()];

    return createSystemEvent('Query', { method: 'get', model, loader, query }, async () => {
      const doc = await model.get(id, options);
      if (!doc && required) throw new NotFoundError(`${model} Not Found`);
      if (doc == null) return null;
      return model.hydrate(loader, doc, { fields: query.getSelectFields() });
    });
  }

  query(query) {
    const { loader } = this;
    const [model, limit, fields, countFields, sortFields, pagination, options] = [query.getModel(), query.getLimit(), query.getSelectFields(), query.getCountFields(), query.getSortFields(), query.getPagination(), query.getOptions()];

    return createSystemEvent('Query', { method: 'query', model, loader, query }, async () => {
      const results = await loader.match(model).select(fields).where(query.getWhere()).options(options).many({ find: true });
      const filteredData = filterDataByCounts(loader, model, results, countFields);
      const sortedResults = sortData(filteredData, sortFields);
      const limitedResults = sortedResults.slice(0, limit > 0 ? limit : undefined);
      return paginateResults(limitedResults, pagination);
    });
  }

  find(query) {
    const { loader } = this;
    const [model, where, limit, selectFields, countFields, sortFields, options] = [query.getModel(), query.getWhere(), query.getLimit(), query.getSelectFields(), query.getCountFields(), query.getSortFields(), query.getOptions()];
    ensureModelArrayTypes(loader, model, where);
    normalizeModelWhere(loader, model, where);

    return createSystemEvent('Query', { method: 'find', model, loader, query }, async () => {
      const resolvedWhere = await resolveModelWhereClause(loader, model, where);
      const results = await model.find(resolvedWhere, options);
      const hydratedResults = await model.hydrate(loader, results, { fields: selectFields });
      const filteredData = filterDataByCounts(loader, model, hydratedResults, countFields);
      const sortedResults = sortData(filteredData, sortFields);
      const limitedResults = sortedResults.slice(0, limit > 0 ? limit : undefined);
      return paginateResults(limitedResults, query.getPagination());
    });
  }

  count(query) {
    const { loader } = this;
    const [model, where, countFields, countPaths, options] = [query.getModel(), query.getWhere(), query.getCountFields(), query.getCountPaths(), query.getOptions()];
    ensureModelArrayTypes(loader, model, where);
    normalizeModelWhere(loader, model, where);

    return createSystemEvent('Query', { method: 'count', model, loader, query }, async () => {
      const resolvedWhere = await resolveModelWhereClause(loader, model, where);

      if (countPaths.length) {
        const results = await loader.match(model).where(resolvedWhere).select(countFields).options(options).many();
        const filteredData = filterDataByCounts(loader, model, results, countFields);
        return filteredData.length;
      }

      return model.count(resolvedWhere, options);
    });
  }

  async create(query, data = {}) {
    const { loader } = this;
    const [model, options] = [query.getModel(), query.getOptions()];
    ensureModelArrayTypes(loader, model, data);
    normalizeModelData(loader, model, data);
    await validateModelData(loader, model, data, {}, 'create');

    return createSystemEvent('Mutation', { method: 'create', model, loader, data }, async () => {
      const doc = await model.create(data, options);
      return model.hydrate(loader, doc, { fields: query.getSelectFields() });
    });
  }

  async update(query, data = {}) {
    const { loader } = this;
    const [id, model, options] = [query.getId(), query.getModel(), query.getOptions()];
    const doc = await loader.match(model).id(id).options(options).one({ required: true });
    ensureModelArrayTypes(loader, model, data);
    normalizeModelData(loader, model, data);
    await validateModelData(loader, model, data, doc, 'update');

    return createSystemEvent('Mutation', { method: 'update', model, loader, query, data }, async () => {
      const merged = normalizeModelData(loader, model, mergeDeep(doc, data));
      const result = await model.update(id, data, merged, options);
      return model.hydrate(loader, result, { fields: query.getSelectFields() });
    });
  }

  async splice(query, key, from, to) {
    const { loader } = this;
    const [id, model, options] = [query.getId(), query.getModel(), query.getOptions()];
    const field = model.getField(key);
    if (!field || !field.isArray()) return Promise.reject(new BadRequestError(`Cannot splice field '${key}'`));
    const doc = await loader.match(model).id(id).options(options).one({ required: true });
    let data;

    if (from) {
      data = { [key]: _.get(doc, key, []) };
      _.remove(data[key], el => from.find(v => hashObject(v) === hashObject(el)));
    } else {
      data = { [key]: _.get(doc, key, []).concat(to) };
    }

    normalizeModelData(loader, model, data);
    await validateModelData(loader, model, data, doc, 'update');

    return createSystemEvent('Mutation', { method: 'splice', model, loader, id, data }, async () => {
      const merged = normalizeModelData(loader, model, mergeDeep(doc, data));
      const result = await model.update(id, data, merged, options);
      return model.hydrate(loader, result, { fields: query.getSelectFields() });
    });
  }

  async delete(query, txn) {
    const { loader } = this;
    const [id, model, options] = [query.getId(), query.getModel(), query.getOptions()];
    const doc = await loader.match(model).id(id).options(options).one({ required: true });

    return createSystemEvent('Mutation', { method: 'delete', model, loader, query }, () => {
      return resolveReferentialIntegrity(loader, model, query, txn).then(async () => {
        const result = await model.delete(id, doc, options);
        return model.hydrate(loader, result, { fields: query.getSelectFields() });
      });
    });
  }
};
