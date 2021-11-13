const Query = require('./Query');
const QueryResolver = require('./QueryResolver');
const { unravelObject } = require('../service/app.service');

/*
* QueryBuilder
*
* Facilitates the creation and execution of a Query. It provides a chainable API to build a query
* plus a list of terminal commands to resolve the query.
*/
module.exports = class QueryBuilder {
  constructor(resolver, model) {
    this.query = new Query({ model, resolver });

    // Chainable commands
    this.id = (id) => { this.query.id(Object.hasOwnProperty.call(id, 'id') ? id.id : id); return this; };
    this.select = (select) => { this.query.select(select); return this; };
    this.where = (where) => { this.query.where(where); return this; };
    this.match = (match) => { this.query.match(match); return this; };
    this.native = (native) => { this.query.native(native); return this; };
    this.sort = (sort) => { this.query.sort(sort); return this; };
    this.sortBy = (sortBy) => { this.query.sort(sortBy); return this; };
    this.limit = (limit) => { this.query.limit(limit); return this; };
    this.skip = (skip) => { this.query.skip(skip); return this; };
    this.before = (cursor) => { this.query.before(cursor); return this; };
    this.after = (cursor) => { this.query.after(cursor); return this; };
    this.meta = (meta) => { this.query.meta(meta); return this; };
    this.flags = (flags) => { this.query.flags(flags); return this; };
    this.merge = (merge) => { this.query.merge(merge); return this; };
    this.transaction = (txn) => { this.query.transaction(txn); return this; };

    // Terminal commands
    this.one = (...args) => this.resolve('one', args);
    this.many = (...args) => this.resolve('many', args);
    this.save = (...args) => this.resolve('save', args.map(arg => unravelObject(arg)));
    this.delete = (...args) => this.resolve('delete', args);
    this.remove = (...args) => this.resolve('remove', args);
    //
    this.count = (...args) => this.resolve('count', args);
    this.push = (...args) => this.resolve('push', args.map(arg => unravelObject(arg)));
    this.pull = (...args) => this.resolve('pull', args.map(arg => unravelObject(arg)));
    this.splice = (...args) => this.resolve('splice', args.map(arg => unravelObject(arg)));
    this.first = (...args) => { this.query.first(...args); return this.resolve('first', args); };
    this.last = (...args) => { this.query.last(...args); return this.resolve('last', args); };
    //
    // this.min = (...args) => this.makeTheCall(query, 'min', args);
    // this.max = (...args) => this.makeTheCall(query, 'max', args);
    // this.avg = (...args) => this.makeTheCall(query, 'avg', args);
    // // Food for thought...
    // this.archive = (...args) => this.makeTheCall(query, 'archive', args); // Soft Delete
    // this.stream = (...args) => this.makeTheCall(query, 'stream', args); // Stream records 1 by 1
    // this.sum = (...args) => this.makeTheCall(query, 'sum', args); // Would sum be different than count?
    // this.rollup = (...args) => this.makeTheCall(query, 'rollup', args); // Like sum, but for nested attributes (eg. Person.rollupAuthoredChaptersPages)
  }

  resolve(cmd, args) {
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
        crud = 'update'; // Your logics wants this to be a simple "update". Sub documents systemEvents will emit either "create" or "udpate"
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

    return new QueryResolver(this.query.cmd(cmd).method(method).crud(crud).input(input).flags(flags).args(args)).resolve();
  }
};
