const Query = require('./Query');

module.exports = class QueryBuilder {
  constructor(resolver, model, options = {}) {
    this.options = options;
    this.query = new Query({ model, resolver });

    // Query Composable
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

    // Query Terminal
    this.data = (...args) => this.finalize('data', args);
    this.save = (...args) => this.finalize('save', args);
    this.push = (...args) => this.finalize('push', args);
    this.pull = (...args) => this.finalize('pull', args);
    this.splice = (...args) => this.finalize('splice', args);
    this.remove = (...args) => this.finalize('remove', args);
    this.delete = (...args) => this.finalize('delete', args);
    this.count = (...args) => this.finalize('count', args);
    this.first = (...args) => { this.query.first(...args); return this.finalize('first', args); };
    this.last = (...args) => { this.query.last(...args); return this.finalize('last', args); };
  }

  finalize(cmd, args) {
    let method;
    let crud;
    const targeted = Boolean(this.options.mode === 'target' || this.query.id() != null);

    switch (cmd) {
      case 'data': {
        crud = 'read';
        method = targeted ? 'findOne' : 'findMany';
        this.query.flags(args[0] || {});
        break;
      }
      case 'save': {
        if (targeted) method = 'updateOne';
        if (!method && this.query.where()) method = 'updateMany';
        if (method) crud = 'update';
        if (!method && args.length > 1) method = 'createMany';
        if (!method) method = 'createOne';
        if (!crud) crud = 'create';
        this.query.data(args[0] || {});
        this.query.flags(args[1] || {});
        break;
      }
      case 'push': case 'pull': case 'splice': {
        crud = cmd === 'push' ? 'create' : 'update';
        method = targeted ? `${cmd}One` : `${cmd}Many`;
        break;
      }
      case 'remove': case 'delete': {
        crud = 'delete';
        method = targeted ? 'removeOne' : 'removeMany';
        break;
      }
      case 'first': case 'last': {
        crud = 'read';
        method = 'findMany';
        break;
      }
      case 'count': {
        crud = 'read';
        method = 'count';
        break;
      }
      default: {
        throw new Error(`Unknown query command: ${cmd}`);
      }
    }

    return this.query.method(method).crud(crud).args(args).resolve();
  }
};
