const _ = require('lodash');
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
  }

  get(query, id, required) {
    const { loader } = this;
    const model = query.getModel();

    return createSystemEvent('Query', { method: 'get', model, loader, query }, async () => {
      const doc = await model.get(id);
      if (!doc && required) throw new NotFoundError(`${model} Not Found`);
      if (doc == null) return null;
      return model.hydrate(loader, doc, { fields: query.getSelectFields() });
    });
  }

  query(query) {
    const { loader } = this;
    const model = query.getModel();
    const [limit, fields, countFields, sortFields, pagination] = [query.getLimit(), query.getSelectFields(), query.getCountFields(), query.getSortFields(), query.getPagination()];

    return createSystemEvent('Query', { method: 'query', model, loader, query }, async () => {
      const results = await loader.match(model).select(fields).where(query.getWhere()).many({ find: true });
      const filteredData = filterDataByCounts(loader, model, results, countFields);
      const sortedResults = sortData(filteredData, sortFields);
      const limitedResults = sortedResults.slice(0, limit > 0 ? limit : undefined);
      return paginateResults(limitedResults, pagination);
    });
  }

  find(query) {
    const { loader } = this;
    const model = query.getModel();
    const [where, limit, selectFields, countFields, sortFields] = [query.getWhere(), query.getLimit(), query.getSelectFields(), query.getCountFields(), query.getSortFields()];
    ensureModelArrayTypes(loader, model, where);
    normalizeModelWhere(loader, model, where);

    return createSystemEvent('Query', { method: 'find', model, loader, query }, async () => {
      const resolvedWhere = await resolveModelWhereClause(loader, model, where);
      const results = await model.find(resolvedWhere);
      const hydratedResults = await model.hydrate(loader, results, { fields: selectFields });
      const filteredData = filterDataByCounts(loader, model, hydratedResults, countFields);
      const sortedResults = sortData(filteredData, sortFields);
      const limitedResults = sortedResults.slice(0, limit > 0 ? limit : undefined);
      return paginateResults(limitedResults, query.getPagination());
    });
  }

  count(query) {
    const { loader } = this;
    const model = query.getModel();
    const [where, countFields, countPaths] = [query.getWhere(), query.getCountFields(), query.getCountPaths()];
    ensureModelArrayTypes(loader, model, where);
    normalizeModelWhere(loader, model, where);

    return createSystemEvent('Query', { method: 'count', model, loader, query }, async () => {
      const resolvedWhere = await resolveModelWhereClause(loader, model, where);

      if (countPaths.length) {
        const results = await loader.match(model).where(resolvedWhere).select(countFields).many();
        const filteredData = filterDataByCounts(loader, model, results, countFields);
        return filteredData.length;
      }

      return model.count(resolvedWhere);
    });
  }

  async create(query, data = {}) {
    const { loader } = this;
    const model = query.getModel();
    ensureModelArrayTypes(loader, model, data);
    normalizeModelData(loader, model, data);
    await validateModelData(loader, model, data, {}, 'create');

    return createSystemEvent('Mutation', { method: 'create', model, loader, data }, async () => {
      const doc = await model.create(data);
      return model.hydrate(loader, doc, { fields: query.getSelectFields() });
    });
  }

  async update(query, id, data = {}) {
    const { loader } = this;
    const model = query.getModel();
    const doc = await loader.match(model).id(id).one({ required: true });
    ensureModelArrayTypes(loader, model, data);
    normalizeModelData(loader, model, data);
    await validateModelData(loader, model, data, doc, 'update');

    return createSystemEvent('Mutation', { method: 'update', model, loader, id, data }, async () => {
      const merged = normalizeModelData(loader, model, mergeDeep(doc, data));
      const result = await model.update(id, data, merged);
      return model.hydrate(loader, result, { fields: query.getSelectFields() });
    });
  }

  async push(query, id, key, values) {
    const { loader } = this;
    const model = query.getModel();
    const field = model.getField(key);
    if (!field || !field.isArray()) return Promise.reject(new BadRequestError(`Cannot push to field '${key}'`));
    const doc = await loader.match(model).id(id).one({ required: true });
    const data = { [key]: _.get(doc, key, []).concat(values) };
    normalizeModelData(loader, model, data);
    await validateModelData(loader, model, data, doc, 'update');

    return createSystemEvent('Mutation', { method: 'push', model, loader, id, data }, async () => {
      const merged = normalizeModelData(loader, model, mergeDeep(doc, data));
      const result = await model.update(id, data, merged);
      return model.hydrate(loader, result, { fields: query.getSelectFields() });
    });
  }

  async pull(query, id, key, values) {
    const { loader } = this;
    const model = query.getModel();
    const field = model.getField(key);
    if (!field || !field.isArray()) return Promise.reject(new BadRequestError(`Cannot pull to field '${key}'`));
    const doc = await loader.match(model).id(id).one({ required: true });
    const data = { [key]: _.get(doc, key, []) };
    _.remove(data[key], el => values.find(v => hashObject(v) === hashObject(el)));
    normalizeModelData(loader, model, data);
    await validateModelData(loader, model, data, doc, 'update');

    return createSystemEvent('Mutation', { method: 'pull', model, loader, id, data }, async () => {
      const merged = normalizeModelData(loader, model, mergeDeep(doc, data));
      const result = await model.update(id, data, merged);
      return model.hydrate(loader, result, { fields: query.getSelectFields() });
    });
  }

  async delete(query, id) {
    const { loader } = this;
    const model = query.getModel();
    const doc = await loader.match(model).id(id).one({ required: true });

    return resolveReferentialIntegrity(loader, model, id).then(() => {
      return createSystemEvent('Mutation', { method: 'delete', model, loader, id }, async () => {
        const result = await model.delete(id, doc);
        return model.hydrate(loader, result, { fields: query.getSelectFields() });
      });
    });
  }
};
