const _ = require('lodash');
const TransactionQueryBuilder = require('./TransactionQueryBuilder');

module.exports = class Transaction {
  constructor(loader) {
    this.loader = loader;
    this.results = [];
    this.ops = new Map();
    this.len = 0;
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
    const entries = Array.from(this.ops.entries());
    this.ops.clear();
    this.len = 0;

    return Promise.all(entries.map(([driver, ops]) => driver.transaction(ops))).then((results) => {
      this.results = results;
      return _.flatten(results);
    });
  }

  auto() {
    return this.exec().then((results) => {
      return this.commit().then(() => results);
    }).catch((e) => {
      return this.rollback().then(() => Promise.reject(e));
    });
  }

  commit() {
    this.loader.clearAll();
    return Promise.all(this.results.map(result => result.$commit()));
  }

  rollback() {
    return Promise.all(this.results.map(result => result.$rollback()));
  }

  length() {
    return this.len;
  }
};
