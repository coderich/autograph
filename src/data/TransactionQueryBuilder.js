const QueryBuilder = require('./QueryBuilder');

module.exports = class TransactionQueryBuilder extends QueryBuilder {
  constructor(model, loader, transaction) {
    super(model, loader);
    this.transaction = transaction;
  }

  makeTheCall(query, cmd, args) {
    this.theCall = { query, cmd, args };
    // return new Promise((resolve, reject) => {
    //   this.theCall = { query, cmd, args, resolve, reject };
    // });
  }

  exec(options) {
    if (!this.theCall) return undefined;
    const { query, cmd, args } = this.theCall;
    query.options = Object.assign({}, query.options, options);
    return super.makeTheCall(query, cmd, args);

    // return super.makeTheCall(query, cmd, args, this.transaction).then((results) => {
    //   resolve(results);
    //   return results;
    // }).catch((e) => {
    //   reject(e);
    //   throw e;
    // });
  }
};
