const _ = require('lodash');
const TransactionQueryBuilder = require('./TransactionQueryBuilder');

module.exports = class Transaction {
  constructor(resolver) {
    this.resolver = resolver;
    this.results = [];
    this.ops = new Map();
  }

  addOp(op) {
    const { driver } = op;
    if (!this.ops.has(driver)) this.ops.set(driver, []);
    this.ops.get(driver).push(op);
  }

  match(modelName) {
    const model = this.resolver.toModel(modelName);
    const op = new TransactionQueryBuilder(model, this.resolver);
    this.addOp(op);
    return op;
  }

  exec(force) {
    if (force !== true) return this.resolver.exec(this);

    return Promise.all(this.entries().map(([driver, ops]) => driver.transaction(ops))).then((results) => {
      this.results = results;
      return _.flatten(results);
    });
  }

  run(force) {
    if (force !== true) return this.resolver.run(this);

    return this.exec().then((results) => {
      return this.commit().then(() => results);
    }).catch((e) => {
      return this.rollback().then(() => Promise.reject(e));
    });
  }

  // dryRun() {
  //   return Promise.all(this.entries().map(([driver, ops]) => driver.transaction(ops))).then((results) => {
  //     return Promise.all(results.map(result => result.$rollback())).then(() => {
  //       if (this.parentTxn) this.values().forEach(op => this.parentTxn.addOp(op));
  //       return _.flatten(results);
  //     });
  //   });
  // }

  commit() {
    this.resolver.clearAll();
    return Promise.all(this.results.map(result => result.$commit()));
  }

  rollback() {
    return Promise.all(this.results.map(result => result.$rollback()));
  }

  entries() {
    return Array.from(this.ops.entries());
  }

  values() {
    return _.flatten(Array.from(this.ops.values()));
  }

  clear() {
    return this.ops.clear();
  }
};
