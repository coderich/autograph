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

  exec() {
    if (!this.theCall) return undefined;
    const { cmd, args, resolve } = this.theCall;

    return super.resolve(cmd, args).then((result) => {
      resolve(result);
      return result;
    });
  }
};
