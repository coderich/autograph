const _ = require('lodash');
const { resolveModelWhereClause } = require('../service/data.service');
const { unravelObject } = require('../service/app.service');

module.exports = class QueryBuilder {
  constructor(model, resolver) {
    this.model = model;
    this.resolver = resolver;

    const query = {};

    // Composable query
    this.id = (id) => { query.id = `${id}`; return this; };
    this.select = (fields) => { query.fields = fields; return this; };
    this.where = (where) => { query.where = unravelObject(where); return this; };
    this.sortBy = (sortBy) => { query.sortBy = unravelObject(sortBy); return this; };
    this.limit = (limit) => { query.limit = limit; return this; };
    this.before = (before) => { query.before = before; return this; };
    this.after = (after) => { query.after = after; return this; };
    this.options = (options) => { query.options = Object.assign({}, query.options, options); return this; };
    this.meta = (meta) => { query.meta = Object.assign({}, query.meta, meta); return this; };

    // want to keep?
    this.query = (q) => { Object.assign(query, _.cloneDeep(q)); return this; };
    this.getQuery = () => query;

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
    this.sum = (...args) => this.makeTheCall(query, 'sum', args); // Would sum be different than count?
    this.rollup = (...args) => this.makeTheCall(query, 'rollup', args); // Like sum, but for nested attributes (eg. Person.rollupAuthoredChaptersPages)
  }

  async makeTheCall(query, cmd, args, parentTxn) {
    const { model, resolver } = this;
    const { id, where, before, after } = query;

    switch (cmd) {
      case 'one': {
        if (id) {
          const { required } = _.get(args, '0', {});
          return resolver.load({ method: 'get', model, query, args: [required] });
        }
        const { find } = _.get(args, '0', {});
        const method = find ? 'find' : 'query';
        return resolver.load({ method, model, query, args: [] }).then(results => results[0]);
      }
      case 'many': {
        const { find } = _.get(args, '0', {});
        const method = find ? 'find' : 'query';
        return resolver.load({ method, model, query, args: [] });
      }
      case 'first': case 'last': {
        const [num] = args;
        const pagination = { before, after, [cmd]: num };
        return resolver.load({ method: 'query', model, query: Object.assign(query, { pagination }), args: [] });
      }
      case 'min': case 'max': case 'avg': {
        return 0;
      }
      case 'count': {
        return resolver.load({ method: 'count', model, query, args: [] });
      }
      case 'push': case 'pull': {
        const [key, ...values] = args;

        // Single op
        if (id) return resolver.load({ method: cmd, model, query, args: [key, values] });

        // Multi op (transaction)
        if (where) {
          const txn = resolver.transaction(parentTxn);
          const resolvedWhere = await resolveModelWhereClause(resolver, model, where);
          const docs = await resolver.spot(model).where(resolvedWhere).many({ find: true });
          docs.forEach(doc => txn.spot(model).id(doc.id).query(query)[cmd](...args));
          return txn.run();
        }

        // Best to require explicit intent
        return Promise.reject(new Error(`${cmd} requires an id() or where()`));
      }
      case 'save': {
        const [data] = args;

        // Single update
        if (id) return resolver.load({ method: 'update', model, query, args: [data] });

        // Multi update (transaction)
        if (where) {
          const txn = resolver.transaction(parentTxn);
          const resolvedWhere = await resolveModelWhereClause(resolver, model, where);
          const docs = await resolver.spot(model).where(resolvedWhere).many();
          docs.forEach(doc => txn.spot(model).id(doc.id).query(query).save(...args));
          return txn.run();
        }

        // Multi save (transaction)
        if (args.length > 1) {
          const txn = resolver.transaction(parentTxn);
          args.forEach(arg => txn.spot(model).query(query).save(arg));
          return txn.run();
        }

        // Single save
        return resolver.load({ method: 'create', model, query, args: [data] });
      }
      case 'remove': {
        // Single document remove
        if (id) return resolver.load({ method: 'delete', model, query, args: [parentTxn] });

        // Multi remove (transaction)
        if (where) {
          const txn = resolver.transaction(parentTxn);
          const resolvedWhere = await resolveModelWhereClause(resolver, model, where);
          const docs = await resolver.spot(model).where(resolvedWhere).many({ find: true });
          docs.forEach(doc => txn.spot(model).id(doc.id).remove());
          return txn.run();
        }

        // Best to require explicit intent
        return Promise.reject(new Error('Remove requires an id() or where()'));
      }
      default: {
        return Promise.reject(new Error(`Unknown command: ${cmd}`));
      }
    }
  }
};
