const Query = require('./Query');
const QueryResolver = require('./QueryResolver');

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
    this.id = (...args) => { this.query.id(...args); return this; };
    this.where = (...args) => { this.query.where(...args); return this; };
    this.native = (...args) => { this.query.native(...args); return this; };
    this.select = (...args) => { this.query.select(...args); return this; };
    this.sort = (...args) => { this.query.sort(...args); return this; };
    this.sortBy = (...args) => { this.query.sort(...args); return this; };
    this.skip = (...args) => { this.query.skip(...args); return this; };
    this.before = (cursor) => { this.query.before(JSON.parse(Buffer.from(cursor, 'base64').toString('ascii'))); return this; };
    this.after = (cursor) => { this.query.after(JSON.parse(Buffer.from(cursor, 'base64').toString('ascii'))); return this; };
    this.meta = (...args) => { this.query.meta(...args); return this; };
    this.flags = (...args) => { this.query.flags(...args); return this; };
    this.merge = (...args) => { this.query.merge(...args); return this; };

    // Terminal commands
    this.one = (...args) => this.resolve('one', args);
    this.many = (...args) => this.resolve('many', args);
    this.save = (...args) => this.resolve('save', args);
    this.delete = (...args) => this.resolve('delete', args);
    this.remove = (...args) => this.resolve('remove', args);
    //
    this.count = (...args) => this.resolve('count', args);
    this.push = (...args) => this.resolve('push', args);
    this.pull = (...args) => this.resolve('pull', args);
    this.splice = (...args) => this.resolve('splice', args);
    this.first = (...args) => { this.query.first(...args); return this.resolve('first', args); };
    this.last = (...args) => { this.query.last(...args); return this.resolve('last', args); };
  }

  resolve(cmd, args) {
    let method, crud, input = {};
    let { flags = {} } = this.query.toObject();
    const { id, where } = this.query.toObject();

    switch (cmd) {
      case 'one': case 'many': {
        crud = 'read';
        flags = args[0] || {};
        method = cmd === 'one' ? 'findOne' : 'findMany';
        break;
      }
      case 'first': case 'last': {
        crud = 'read';
        flags = args[1] || {};
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
        crud = cmd === 'push' ? 'create' : 'update';
        method = id ? `${cmd}One` : `${cmd}Many`;
        break;
      }
      case 'remove': case 'delete': {
        crud = 'delete';
        flags = args[0] || {};
        method = 'delete';
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

    return new QueryResolver(this.query.cmd(cmd).method(method).crud(crud).input(input).flags(flags).args(args)).resolve();
  }
};
