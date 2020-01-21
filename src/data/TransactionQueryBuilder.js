const QueryBuilder = require('./QueryBuilder');

module.exports = class TransactionQueryBuilder extends QueryBuilder {
  makeTheCall(query, cmd, args) {
    return new Promise((resolve) => {
      this.theCall = { query, cmd, args, resolve };
    });
  }

  exec(options) {
    if (!this.theCall) return undefined;
    const { query, cmd, args, resolve } = this.theCall;
    query.options = Object.assign({}, query.options, options);

    return super.makeTheCall(query, cmd, args).then((results) => {
      resolve(results);
      return results;
    });
  }
};
