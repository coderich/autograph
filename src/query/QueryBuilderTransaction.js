const QueryBuilder = require('./QueryBuilder');

module.exports = class QueryBuilderTransaction extends QueryBuilder {
  constructor(resolver, model, transaction) {
    super(resolver, model);
    this.query.transaction(transaction);
  }

  resolve(cmd, args) {
    return new Promise((resolve) => {
      this.theCall = { cmd, args, resolve };
    });
  }

  exec(options) {
    if (!this.theCall) return undefined;

    this.query.options(options);
    const { cmd, args, resolve } = this.theCall;

    return super.resolve(cmd, args).then((result) => {
      resolve(result);
      return result;
    });
  }
};
