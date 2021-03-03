const Query = require('./Query');

/*
* QueryBuilder
*
* Facilitates the creation and execution of a Query. It provides a chainable API to build a query
* plus a list of terminal commands that will resolve the query.
*/
module.exports = class QueryBuilder {
  constructor(resolver, model, options = {}) {
    this.options = options;
    this.query = new Query({ model, resolver });

    // Chainable commands
    this.id = (...args) => { this.query.id(...args); return this; };
    this.where = (...args) => { this.query.where(...args); return this; };
    this.native = (...args) => { this.query.native(...args); return this; };
    this.select = (...args) => { this.query.select(...args); return this; };
    this.sortBy = (...args) => { this.query.sortBy(...args); return this; };
    this.limit = (...args) => { this.query.limit(...args); return this; };
    this.skip = (...args) => { this.query.skip(...args); return this; };
    this.before = (...args) => { this.query.before(...args); return this; };
    this.after = (...args) => { this.query.after(...args); return this; };
    this.meta = (...args) => { this.query.meta(...args); return this; };
    this.merge = (...args) => { this.query.merge(...args); return this; };

    // Terminal commands
    this.data = (...args) => this.resolve('data', args);
    this.save = (...args) => this.resolve('save', args);
    this.push = (...args) => this.resolve('push', args);
    this.pull = (...args) => this.resolve('pull', args);
    this.splice = (...args) => this.resolve('splice', args);
    this.remove = (...args) => this.resolve('remove', args);
    this.delete = (...args) => this.resolve('delete', args);
    this.count = (...args) => this.resolve('count', args);
    this.first = (...args) => { this.query.first(...args); return this.resolve('first', args); };
    this.last = (...args) => { this.query.last(...args); return this.resolve('last', args); };
  }

  resolve(cmd, args) {
    let method, crud, data = {}, flags = {};
    const targeted = Boolean(this.options.mode === 'target' || this.query.id() != null);

    switch (cmd) {
      case 'data': {
        crud = 'read';
        flags = args[0] || {};
        method = targeted ? 'findOne' : 'findMany';
        break;
      }
      case 'save': {
        data = args[0] || {};
        flags = args[1] || {};
        if (targeted) method = 'updateOne';
        if (!method && this.query.where()) method = 'updateMany';
        if (method) crud = 'update';
        if (!method && args.length > 1) method = 'createMany';
        if (!method) method = 'createOne';
        if (!crud) crud = 'create';
        break;
      }
      case 'push': case 'pull': case 'splice': {
        crud = cmd === 'push' ? 'create' : 'update';
        method = targeted ? `${cmd}One` : `${cmd}Many`;
        break;
      }
      case 'remove': case 'delete': {
        crud = 'delete';
        flags = args[0] || {};
        method = targeted ? 'removeOne' : 'removeMany';
        break;
      }
      case 'first': case 'last': {
        crud = 'read';
        flags = args[0] || {};
        method = 'findMany';
        break;
      }
      case 'count': {
        crud = 'read';
        flags = args[0] || {};
        method = 'count';
        break;
      }
      default: {
        throw new Error(`Unknown query command: ${cmd}`);
      }
    }

    return this.query.method(method).crud(crud).data(data).flags(flags).args(args).resolve();
  }
};
