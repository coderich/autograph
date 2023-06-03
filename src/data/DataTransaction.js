const { get } = require('lodash');
const TreeMap = require('./TreeMap');
const QueryBuilderTransaction = require('../query/QueryBuilderTransaction');

const makeMap = (resolver) => {
  let resolve, reject;
  const map = new TreeMap();
  map.promise = new Promise((good, bad) => { resolve = good; reject = bad; });
  map.resolve = resolve;
  map.reject = reject;

  map.ready = () => {
    const elements = map.elements();
    const notReady = elements.filter(el => !el.marker);
    if (notReady.length) return [undefined, undefined];
    let rollbackIndex = elements.findIndex(el => el.marker === 'rollback');
    if (rollbackIndex === -1) rollbackIndex = Infinity;
    return [elements.slice(0, rollbackIndex), elements.slice(rollbackIndex)];
  };

  map.perform = () => {
    const [commits, rollbacks] = map.ready();

    if (commits && rollbacks) {
      const rollbackData = rollbacks.map(tnx => tnx.data).flat();
      const commitData = commits.map(tnx => tnx.data).flat();

      Promise.all(rollbackData.map(rbd => rbd.$rollback())).then(() => {
        if (commits.length) resolver.clearAll();
        Promise.all(commitData.map(cd => cd.$commit())).then(d => map.resolve(d));
      }).catch(e => map.reject(e));
    }

    return map.promise;
  };

  return map;
};

module.exports = class DataTransaction {
  constructor(resolver, parentTxn) {
    this.data = [];
    this.resolver = resolver;
    this.driverMap = new Map();
    this.txnMap = get(parentTxn, 'txnMap') || makeMap(resolver);
    this.txnMap.add(parentTxn, this);
  }

  match(modelish) {
    const model = this.resolver.toModelMarked(modelish);
    const driver = model.getDriver();
    if (!this.driverMap.has(driver)) this.driverMap.set(driver, []);
    const op = new QueryBuilderTransaction(this.resolver, model, this);
    this.driverMap.get(driver).push(op);
    return op;
  }

  exec() {
    return Promise.all(Array.from(this.driverMap.entries()).map(([driver, ops]) => {
      if (driver.getDirectives().transactions === false) {
        return Promise.all(ops.map(op => op.exec())).then((results) => {
          results.$commit = () => this.resolver.clearAll();
          results.$rollback = () => this.resolver.clearAll();
          return results;
        });
      }

      return driver.transaction(ops);
    })).then((results) => {
      this.data = results;
      return results.flat();
    });
  }

  run() {
    return this.exec().then((results) => {
      if (this.txnMap.root(this) === this) return this.commit().then(() => results);
      this.commit();
      return results;
    }).catch((e) => {
      if (this.txnMap.root(this) === this) return this.rollback().then(() => Promise.reject(e));
      this.rollback();
      throw e;
    });
  }

  commit() {
    if (this.marker !== 'rollback') this.marker = 'commit';
    return this.txnMap.perform();
  }

  rollback() {
    this.marker = 'rollback';
    return this.txnMap.perform();
  }
};
