const Query = require('./Query');
const QueryResolver = require('./QueryResolver');
const { unravelObject } = require('../service/app.service');

/*
* QueryBuilder
*
* Facilitates the creation and execution of a Query. It provides a chainable API to build a query
* plus a list of terminal commands to execute the query.
*/
module.exports = class QueryBuilder {
  constructor(resolver, model) {
    this.query = new Query({ model, resolver });

    // Chainable commands
    this.id = (id) => { this.query.id(id); return this; };
    this.select = (select) => { this.query.select(unravelObject(select)); return this; };
    // this.select = (select) => { this.query.select(Object.entries(toKeyObj(select)).reduce((prev, [key, value]) => Object.assign(prev, { [key.replace(/edges.node./g, '')]: !!value }), {})); return this; };
    this.where = (where) => { this.query.where(unravelObject(where)); return this; };
    this.match = (match) => { this.query.match(unravelObject(match)); return this; };
    this.native = (native) => { this.query.native(native); return this; };
    this.sort = (sort) => { this.query.sort(unravelObject(sort)); return this; };
    this.sortBy = (sortBy) => { this.query.sort(unravelObject(sortBy)); return this; };
    this.limit = (limit) => { this.query.limit(limit); return this; };
    this.skip = (skip) => { this.query.skip(skip); return this; };
    this.before = (cursor) => { this.query.before(cursor); return this; };
    this.after = (cursor) => { this.query.after(cursor); return this; };
    this.meta = (meta) => { this.query.meta(meta); return this; };
    this.flags = (flags) => { this.query.flags(flags); return this; };
    this.merge = (merge) => { this.query.merge(merge); return this; };
    this.transaction = (txn) => { this.query.transaction(txn); return this; };

    // Terminal commands
    this.one = (...args) => this.execute('one', args);
    this.many = (...args) => this.execute('many', args);
    this.save = (...args) => this.execute('save', args.map(arg => unravelObject(arg)));
    this.delete = (...args) => this.execute('delete', args);
    this.remove = (...args) => this.execute('remove', args);
    this.resolve = (...args) => this.execute('resolve', args);
    //
    this.count = (...args) => this.execute('count', args);
    this.push = (...args) => this.execute('push', args.map(arg => unravelObject(arg)));
    this.pull = (...args) => this.execute('pull', args.map(arg => unravelObject(arg)));
    this.splice = (...args) => this.execute('splice', args.map(arg => unravelObject(arg)));
    this.first = (...args) => { this.query.first(...args); return this.execute('first', args); };
    this.last = (...args) => { this.query.last(...args); return this.execute('last', args); };
    //
    // this.min = (...args) => this.makeTheCall(query, 'min', args);
    // this.max = (...args) => this.makeTheCall(query, 'max', args);
    // this.avg = (...args) => this.makeTheCall(query, 'avg', args);
    // this.sum = (...args) => this.makeTheCall(query, 'sum', args); // Would sum be different than count?
    // // Food for thought...
    // this.archive = (...args) => this.makeTheCall(query, 'archive', args); // Soft Delete
    // this.stream = (...args) => this.makeTheCall(query, 'stream', args); // Stream records 1 by 1
    // this.rollup = (...args) => this.makeTheCall(query, 'rollup', args); // Like sum, but for nested attributes (eg. Person.rollupAuthoredChaptersPages)
  }

  execute(cmd, args) {
    let method, crud, input = {};
    let { flags = {} } = this.query.toObject();
    const { id, where } = this.query.toObject();

    switch (cmd) {
      case 'one': case 'many': {
        crud = 'read';
        flags = args[0] || flags;
        method = cmd === 'one' ? 'findOne' : 'findMany';
        break;
      }
      case 'resolve': {
        crud = 'read';
        method = 'autoResolve';
        break;
      }
      case 'first': case 'last': {
        crud = 'read';
        flags = args[1] || flags;
        method = cmd;
        break;
      }
      case 'save': {
        crud = id || where ? 'update' : 'create';
        if (crud === 'update') { method = id ? 'updateOne' : 'updateMany'; [input] = args; }
        if (crud === 'create') { method = args.length < 2 ? 'createOne' : 'createMany'; input = args.length < 2 ? args[0] || {} : args; }
        break;
      }
      case 'push': case 'pull': case 'splice': {
        crud = 'update'; // Your logic wants this to be a simple "update". Sub documents systemEvents will emit either "create" or "udpate"
        method = id ? `${cmd}One` : `${cmd}Many`;
        break;
      }
      case 'remove': case 'delete': {
        crud = 'delete';
        flags = args[0] || flags;
        if (id) method = 'deleteOne';
        else if (where) method = 'deleteMany';
        else return Promise.reject(new Error('Remove requires an id() or where()'));
        break;
      }
      case 'count': {
        crud = 'read';
        flags = args[0] || flags;
        method = 'count';
        break;
      }
      default: {
        return Promise.reject(new Error(`Unknown query command: ${cmd}`));
      }
    }

    return new QueryResolver(this.query.method(method).cmd(cmd).crud(crud).input(input).flags(flags).args(args)).resolve();
  }
};
