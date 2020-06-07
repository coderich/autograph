const { get, unset } = require('lodash');
const { keyPaths } = require('../service/app.service');

module.exports = class Query {
  constructor(resolver, model, query = {}) {
    const { where = {}, sortBy = {}, limit, pagination = {}, options = {} } = query;

    // Sorting
    const sortFields = keyPaths(sortBy).reduce((prev, path) => {
      const $path = path.split('.').map(s => (s.indexOf('count') === 0 || s.indexOf('.count') === 0 ? s : `$${s}`)).join('.');
      return Object.assign(prev, { [$path]: get(sortBy, path) });
    }, {});

    // Counting
    const countPaths = keyPaths(where).filter(p => p.indexOf('count') === 0 || p.indexOf('.count') > 0);
    const countFields = countPaths.reduce((prev, path) => Object.assign(prev, { [path]: get(where, path) }), {});
    countPaths.forEach(p => unset(where, p));

    //
    this.resolver = resolver;
    this.query = query;
    this.model = model;
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

  getMeta() {
    return this.query.meta;
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

  getNative() {
    return this.query.native;
  }

  isNative() {
    return Boolean(this.query.native);
  }

  getCacheKey() {
    return {
      // ...this.query,
      id: this.query.id,
      where: this.query.where,
      limit: this.query.limit,
      native: this.query.native,
      sortBy: this.query.sortBy,
      countFields: this.countFields,
      pagination: this.query.pagination,
    };
  }
};
