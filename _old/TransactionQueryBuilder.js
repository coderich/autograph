const QueryBuilder = require('./QueryBuilder');

module.exports = class TransactionQueryBuilder extends QueryBuilder {
  constructor(model, resolver, transaction) {
    super(model, resolver);
    this.transaction = transaction;
  }

  makeTheCall(query, cmd, args) {
    return new Promise((resolve) => {
      this.theCall = { query, cmd, args, resolve };
    });
  }

  exec(options) {
    if (!this.theCall) return undefined;

    const { cmd, args, resolve } = this.theCall;

    return super.makeTheCall(this.options(options).getQuery(), cmd, args, this.transaction).then((result) => {
      resolve(result);
      return result;
    });
  }
};
