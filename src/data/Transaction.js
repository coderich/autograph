const _ = require('lodash');
const TransactionQueryBuilder = require('./TransactionQueryBuilder');

module.exports = class Transaction {
  constructor(loader) {
    this.loader = loader;
    this.results = [];
    this.ops = new Map();
    this.len = 0;
    this.done = false;
  }

  match(modelName) {
    const model = this.loader.toModel(modelName);
    const driver = model.getDriver();
    const op = new TransactionQueryBuilder(model, this.loader, this);
    if (!this.ops.has(driver)) this.ops.set(driver, []);
    this.ops.get(driver).push(op);
    this.len++;
    return op;
  }

  exec() {
    if (this.promise) return this.promise;

    this.promise = Promise.all(Array.from(this.ops.entries()).map(([driver, ops]) => driver.transaction(ops))).then((results) => {
      this.results = results;
      return _.flatten(results);
    });

    return this.promise;
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
    if (this.done) return Promise.resolve();
    this.done = true;
    this.loader.clearAll();
    return Promise.all(this.results.map(result => result.$commit()));
  }

  rollback() {
    if (this.done) return Promise.resolve();
    this.done = true;
    return Promise.all(this.results.map(result => result.$rollback()));
  }

  length() {
    return this.len;
  }
};
