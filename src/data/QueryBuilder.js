const _ = require('lodash');
const { resolveModelWhereClause } = require('../service/data.service');

module.exports = class QueryBuilder {
  constructor(model, loader) {
    this.model = model;
    this.loader = loader;

    const query = {};

    // Composable query
    this.id = (id) => { query.id = `${id}`; return this; };
    this.select = (fields) => { query.fields = fields; return this; };
    this.where = (where) => { query.where = where; return this; };
    this.sortBy = (sortBy) => { query.sortBy = sortBy; return this; };
    this.limit = (limit) => { query.limit = limit; return this; };
    this.before = (before) => { query.before = before; return this; };
    this.after = (after) => { query.after = after; return this; };
    this.options = (options) => { query.options = Object.assign({}, query.options, options); return this; };

    // want to keep?
    this.query = (q) => { Object.assign(query, _.cloneDeep(q)); return this; };

    // Terminal commands
    this.one = (...args) => this.makeTheCall(query, 'one', args);
    this.many = (...args) => this.makeTheCall(query, 'many', args);
    this.first = (...args) => this.makeTheCall(query, 'first', args);
    this.last = (...args) => this.makeTheCall(query, 'last', args);
    this.count = (...args) => this.makeTheCall(query, 'count', args);
    this.min = (...args) => this.makeTheCall(query, 'min', args);
    this.max = (...args) => this.makeTheCall(query, 'max', args);
    this.avg = (...args) => this.makeTheCall(query, 'avg', args);
    this.save = (...args) => this.makeTheCall(query, 'save', args);
    this.push = (...args) => this.makeTheCall(query, 'push', args);
    this.pull = (...args) => this.makeTheCall(query, 'pull', args);
    // this.splice = (...args) => this.makeTheCall(query, 'splice', args);
    this.remove = (...args) => this.makeTheCall(query, 'remove', args);

    // Food for thought...
    this.archive = (...args) => this.makeTheCall(query, 'archive', args); // Soft Delete
    this.stream = (...args) => this.makeTheCall(query, 'stream', args); // Stream records 1 by 1
    this.driver = (...args) => this.makeTheCall(query, 'driver', args); // Access raw underlying driver
    this.native = (...args) => this.makeTheCall(query, 'native', args); // Perhaps write a native query and hide the driver?
    this.meta = (...args) => this.makeTheCall(query, 'meta', args); // Provider additional options to query (may be dupe of options above)
    this.sum = (...args) => this.makeTheCall(query, 'sum', args); // Would sum be different than count?
    this.rollup = (...args) => this.makeTheCall(query, 'rollup', args); // Like sum, but for nested attributes (eg. Person.rollupAuthoredChaptersPages)
  }

  async makeTheCall(query, cmd, args) {
    const { model, loader } = this;
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
        const [num] = args;
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
        const [key, ...values] = args;

        // Single op
        if (id) return loader.load({ method: cmd, model, query, args: [id, key, values] });

        // Multi op (transaction)
        if (where) {
          const txn = loader.transaction();
          const resolvedWhere = await resolveModelWhereClause(loader, model, where);
          const docs = await loader.match(model).where(resolvedWhere).many();
          docs.forEach(doc => txn.match(model).id(doc.id).query(query)[cmd](...args));
          return txn.auto();
        }

        // Best to require explicit intent
        return Promise.reject(new Error(`${cmd} requires an id() or where()`));
      }
      case 'save': {
        const [data] = args;

        // Update
        if (id || where) return loader.load({ method: 'update', model, query, args: [data] });

        // Multi save (transaction)
        if (args.length > 1) {
          const txn = loader.transaction();
          args.forEach(arg => txn.match(model).query(query).save(arg));
          return txn.auto();
        }

        // Single save
        return loader.load({ method: 'create', model, query, args: [data] });
      }
      case 'remove': {
        const [transaction = loader.transaction()] = args;

        // Single document remove
        if (id) return loader.load({ method: 'delete', model, query, args: [id, transaction] });

        // Multi remove (transaction)
        if (where) {
          const txn = loader.transaction();
          const resolvedWhere = await resolveModelWhereClause(loader, model, where);
          const docs = await loader.match(model).where(resolvedWhere).many();
          docs.forEach(doc => txn.match(model).id(doc.id).remove(txn));
          return txn.auto();
        }

        return Promise.reject(new Error('Remove requires an id() or where()'));
      }
      default: {
        return Promise.reject(new Error(`Unknown command: ${cmd}`));
      }
    }
  }
};
