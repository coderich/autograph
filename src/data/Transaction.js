const _ = require('lodash');
const TransactionQueryBuilder = require('./TransactionQueryBuilder');

module.exports = class Transaction {
  constructor(loader) {
    this.loader = loader;
    this.results = [];
    this.ops = new Map();
  }

  match(modelName) {
    const model = this.loader.toModel(modelName);
    const driver = model.getDriver();
    const op = new TransactionQueryBuilder(model, this.loader);
    if (!this.ops.has(driver)) this.ops.set(driver, []);
    this.ops.get(driver).push(op);
    return op;
  }

  exec() {
    return Promise.all(Array.from(this.ops.entries()).map(([driver, ops]) => driver.transaction(ops))).then((results) => {
      this.results = results;
      return _.flatten(results);
    });
  }

  auto() {
    return this.exec().then(async (results) => {
      await this.commit();
      return results;
    }).catch(async (e) => {
      await this.rollback();
      throw e;
    });
  }

  commit() {
    this.loader.clearAll();
    return Promise.all(this.results.map(result => result.$commit()));
  }

  rollback() {
    return Promise.all(this.results.map(result => result.$rollback()));
  }
};
