const QueryBuilder = require('./QueryBuilder');

module.exports = class QueryBuilderTransaction extends QueryBuilder {
  constructor(resolver, model, transaction) {
    super(resolver, model);
    this.query.transaction(transaction);
  }

  execute(cmd, args) {
    return new Promise((resolve, reject) => {
      this.theCall = { cmd, args, resolve, reject };
    });
  }

  exec(options) {
    if (!this.theCall) return undefined;

    const { cmd, args, resolve } = this.theCall;
    this.query.options(options);

    return super.execute(cmd, args).then((result) => {
      resolve(result);
      return result;
    });
  }
};
