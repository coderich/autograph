const QueryBuilder = require('./QueryBuilder');

module.exports = class TransactionQueryBuilder extends QueryBuilder {
  makeTheCall(query, cmd, args) {
    this.theCall = { query, cmd, args };
  }

  exec(options) {
    if (!this.theCall) return undefined;
    const { query, cmd, args } = this.theCall;
    query.options = Object.assign({}, query.options, options);
    return super.makeTheCall(query, cmd, args);
  }
};
