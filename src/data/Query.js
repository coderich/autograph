const _ = require('lodash');
const { keyPaths } = require('../service/app.service');

module.exports = class Query {
  constructor(model, query = {}) {
    const { fields, where = {}, sortBy = {}, pagination = {}, limit } = query;

    // Fields
    const modelFields = model.getScalarFields();
    const selectFields = fields || modelFields.reduce((prev, field) => Object.assign(prev, { [field.getName()]: {} }), {});
    const finalSelectFields = { ...where, ...sortBy, ...selectFields };

    // Sorting
    sortBy.id = 'ASC';
    const sortFields = keyPaths(sortBy).reduce((prev, path) => {
      if (path.indexOf('count') === 0 || path.indexOf('.count') === 0) return Object.assign(prev, { [path]: _.get(sortBy, path) });
      const $path = path.split('.').map(s => `$${s}`).join('.');
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

  getModel() {
    return this.model;
  }

  toObject() {
    return this.query;
  }
};
