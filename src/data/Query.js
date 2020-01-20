const _ = require('lodash');
const { keyPaths, mergeDeep } = require('../service/app.service');

module.exports = class Query {
  constructor(model, query = {}) {
    const { fields, where = {}, sortBy = {}, limit, pagination = {}, options = {} } = query;

    // Fields
    const modelFields = model.getScalarFields();
    const selectFields = fields || modelFields.reduce((prev, field) => Object.assign(prev, { [field.getName()]: {} }), {});
    const finalSelectFields = mergeDeep(where, sortBy, selectFields);

    // Sorting
    const sortFields = keyPaths(sortBy).reduce((prev, path) => {
      const $path = path.split('.').map(s => (s.indexOf('count') === 0 || s.indexOf('.count') === 0 ? s : `$${s}`)).join('.');
      return Object.assign(prev, { [$path]: _.get(sortBy, path) });
    }, {});

    // Counting
    const countPaths = keyPaths(where).filter(p => p.indexOf('count') === 0 || p.indexOf('.count') > 0);
    const countFields = countPaths.reduce((prev, path) => Object.assign(prev, { [path]: _.get(where, path) }), {});
    countPaths.forEach(p => _.unset(where, p));

    //
    this.query = query;
    this.model = model;
    this.selectFields = finalSelectFields;
    this.countFields = countFields;
    this.countPaths = countPaths;
    this.sortFields = sortFields;
    this.where = where;
    this.sortBy = sortBy;
    this.pagination = pagination;
    this.limit = limit;
    this.options = options;
  }

  getId() {
    return this.query.id;
  }

  getSelectFields() {
    return this.selectFields;
  }

  getCountFields() {
    return this.countFields;
  }

  getCountPaths() {
    return this.countPaths;
  }

  getSortFields() {
    return this.sortFields;
  }

  getWhere() {
    return this.where;
  }

  getSortBy() {
    return this.sortBy;
  }

  getPagination() {
    return this.pagination;
  }

  getLimit() {
    return this.limit;
  }

  getOptions() {
    return this.options;
  }

  getModel() {
    return this.model;
  }

  getQuery() {
    return this.query;
  }

  toObject() {
    return {
      ...this.query,
      pagination: this.pagination,
      selectFields: this.selectFields,
      countFields: this.countFields,
      countPaths: this.countPaths,
      sortFields: this.sortFields,
    };
  }
};
