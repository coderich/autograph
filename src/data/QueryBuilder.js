const _ = require('lodash');

module.exports = class QueryBuilder {
  constructor(exec, model) {
    const query = {};

    // Composable query
    this.id = (id) => { query.id = `${id}`; return this; };
    this.data = (data) => { query.data = data; return this; };
    this.select = (fields) => { query.fields = fields; return this; };
    this.where = (where) => { query.where = where; return this; };
    this.sortBy = (sortBy) => { query.sortBy = sortBy; return this; };
    this.limit = (limit) => { query.limit = limit; return this; };
    this.first = (first) => { query.first = first; return this; };
    this.after = (after) => { query.after = after; return this; };
    this.last = (last) => { query.last = last; return this; };
    this.before = (before) => { query.before = before; return this; };

    // want to keep?
    this.query = (q) => { Object.assign(query, _.cloneDeep(q)); return this; };

    // Terminal commands
    this.one = (...args) => QueryBuilder.makeTheCall(exec, model, query, 'one', args);
    this.many = (...args) => QueryBuilder.makeTheCall(exec, model, query, 'many', args);
    this.count = (...args) => QueryBuilder.makeTheCall(exec, model, query, 'count', args);
    this.min = (...args) => QueryBuilder.makeTheCall(exec, model, query, 'min', args);
    this.max = (...args) => QueryBuilder.makeTheCall(exec, model, query, 'max', args);
    this.avg = (...args) => QueryBuilder.makeTheCall(exec, model, query, 'avg', args);
    this.save = (...args) => QueryBuilder.makeTheCall(exec, model, query, 'save', args);
    this.remove = (...args) => QueryBuilder.makeTheCall(exec, model, query, 'remove', args);
  }

  static makeTheCall(exec, model, query, cmd, args) {
    const { id, data, where } = query;

    switch (cmd) {
      case 'one': {
        if (id) {
          const { required } = _.get(args, '0', {});
          return exec({ method: 'get', model, query, args: [id, required] });
        }
        const { find } = _.get(args, '0', {});
        const method = find ? 'find' : 'query';
        return exec({ method, model, query, args: [] }).then(results => results[0]);
      }
      case 'many': {
        const { find } = _.get(args, '0', {});
        const method = find ? 'find' : 'query';
        return exec({ method, model, query, args: [] });
      }
      case 'min': case 'max': case 'avg': {
        return 0;
      }
      case 'count': {
        return exec({ method: 'count', model, query, args: [] });
      }
      case 'save': {
        if (id) return exec({ method: 'update', model, query, args: [id, data] });
        if (where) throw new Error('Multi update not yet supported');
        return exec({ method: 'create', model, query, args: [data] });
      }
      case 'remove': {
        if (id) return exec({ method: 'delete', model, query, args: [id] });
        if (where) throw new Error('Multi delete not yet supported');
        throw new Error('Multi delete not yet supported');
      }
      default: throw new Error(`Unknown command: ${cmd}`);
    }
  }
};
