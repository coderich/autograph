const _ = require('lodash');

module.exports = class QueryBuilder {
  constructor(model, loader) {
    const query = {};

    // Composable query
    this.id = (id) => { query.id = `${id}`; return this; };
    this.select = (fields) => { query.fields = fields; return this; };
    this.where = (where) => { query.where = where; return this; };
    this.sortBy = (sortBy) => { query.sortBy = sortBy; return this; };
    this.limit = (limit) => { query.limit = limit; return this; };
    this.before = (before) => { query.before = before; return this; };
    this.after = (after) => { query.after = after; return this; };

    // want to keep?
    this.query = (q) => { Object.assign(query, _.cloneDeep(q)); return this; };

    // Terminal commands
    this.one = (...args) => QueryBuilder.makeTheCall(loader, model, query, 'one', args);
    this.many = (...args) => QueryBuilder.makeTheCall(loader, model, query, 'many', args);
    this.first = (...args) => QueryBuilder.makeTheCall(loader, model, query, 'first', args);
    this.last = (...args) => QueryBuilder.makeTheCall(loader, model, query, 'last', args);
    this.count = (...args) => QueryBuilder.makeTheCall(loader, model, query, 'count', args);
    this.min = (...args) => QueryBuilder.makeTheCall(loader, model, query, 'min', args);
    this.max = (...args) => QueryBuilder.makeTheCall(loader, model, query, 'max', args);
    this.avg = (...args) => QueryBuilder.makeTheCall(loader, model, query, 'avg', args);
    this.save = (...args) => QueryBuilder.makeTheCall(loader, model, query, 'save', args);
    this.push = (...args) => QueryBuilder.makeTheCall(loader, model, query, 'push', args);
    this.pull = (...args) => QueryBuilder.makeTheCall(loader, model, query, 'pull', args);
    this.remove = (...args) => QueryBuilder.makeTheCall(loader, model, query, 'remove', args);

    // Food for thought...
    this.archive = (...args) => QueryBuilder.makeTheCall(loader, model, query, 'archive', args); // Soft Delete
    this.stream = (...args) => QueryBuilder.makeTheCall(loader, model, query, 'stream', args); // Stream records 1 by 1
    this.driver = (...args) => QueryBuilder.makeTheCall(loader, model, query, 'driver', args); // Access raw underlying driver
    this.native = (...args) => QueryBuilder.makeTheCall(loader, model, query, 'native', args); // Perhaps write a native query and hide the driver?
    this.meta = (...args) => QueryBuilder.makeTheCall(loader, model, query, 'meta', args); // Provider additional options to query
    this.sum = (...args) => QueryBuilder.makeTheCall(loader, model, query, 'sum', args); // Would sum be different than count?
    this.rollup = (...args) => QueryBuilder.makeTheCall(loader, model, query, 'rollup', args); // Like sum, but for nested attributes (eg. Person.rollupAuthoredChaptersPages)
  }

  static makeTheCall(loader, model, query, cmd, args) {
    const { id, where, before, after } = query;

    switch (cmd) {
      case 'one': {
        if (id) {
          const { required } = _.get(args, '0', {});
          return loader.load({ method: 'get', model, query, args: [id, required] });
        }
        const { find } = _.get(args, '0', {});
        const method = find ? 'find' : 'query';
        return loader.load({ method, model, query, args: [] }).then(results => results[0]);
      }
      case 'many': {
        const { find } = _.get(args, '0', {});
        const method = find ? 'find' : 'query';
        return loader.load({ method, model, query, args: [] });
      }
      case 'first': case 'last': {
        const num = _.get(args, '0');
        const pagination = { before, after, [cmd]: num };
        return loader.load({ method: 'query', model, query: Object.assign(query, { pagination }), args: [] });
      }
      case 'min': case 'max': case 'avg': {
        return 0;
      }
      case 'count': {
        return loader.load({ method: 'count', model, query, args: [] });
      }
      case 'push': case 'pull': {
        return Promise.reject(new Error('Not yet supported'));
      }
      case 'save': {
        const data = _.get(args, '0', {});
        if (id) return loader.load({ method: 'update', model, query, args: [id, data] });
        if (where) return Promise.reject(new Error('Multi update not yet supported'));
        return loader.load({ method: 'create', model, query, args: [data] });
      }
      case 'remove': {
        if (id) return loader.load({ method: 'delete', model, query, args: [id] });
        if (where) return Promise.reject(new Error('Multi delete not yet supported'));
        return Promise.reject(new Error('Multi delete not yet supported'));
      }
      default: return Promise.reject(new Error(`Unknown command: ${cmd}`));
    }
  }
};
