const { flatten } = require('lodash');
const TreeMap = require('./TreeMap');
const QueryBuilderTransaction = require('../query/QueryBuilderTransaction');

module.exports = class DataTransaction {
  constructor(resolver, parentTxn) {
    const txnMap = (parentTxn || {}).txnMap || (() => {
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
          const rollbackData = flatten(rollbacks.map(tnx => tnx.data));
          const commitData = flatten(commits.map(tnx => tnx.data));

          Promise.all(rollbackData.map(rbd => rbd.$rollback())).then(() => {
            if (commits.length) resolver.clearAll();
            Promise.all(commitData.map(cd => cd.$commit())).then(d => map.resolve(d));
          }).catch(e => map.reject(e));
        }

        return map.promise;
      };

      return map;
    })();

    // Create txn
    const txn = ((data, driverMap, txMap) => {
      return {
        get match() {
          return (modelName) => {
            const model = resolver.toModelMarked(modelName);
            const driver = model.getDriver();
            if (!driverMap.has(driver)) driverMap.set(driver, []);
            const op = new QueryBuilderTransaction(resolver, model, this);
            driverMap.get(driver).push(op);
            return op;
          };
        },
        get exec() {
          return () => {
            return Promise.all(Array.from(driverMap.entries()).map(([driver, ops]) => {
              if (driver.getDirectives().transactions === false) {
                return Promise.all(ops.map(op => op.exec())).then((results) => {
                  results.$commit = () => resolver.clearAll();
                  results.$rollback = () => resolver.clearAll();
                  return results;
                });
              }

              return driver.transaction(ops);
            })).then((results) => {
              data = results;
              return flatten(results);
            });
          };
        },
        get run() {
          return () => {
            return this.exec().then((results) => {
              if (txMap.root(this) === this) return this.commit().then(() => results);
              this.commit();
              return results;
            }).catch((e) => {
              if (txMap.root(this) === this) return this.rollback().then(() => Promise.reject(e));
              this.rollback();
              throw e;
            });
          };
        },
        get commit() {
          return () => {
            if (this.marker !== 'rollback') this.marker = 'commit';
            return txMap.perform();
          };
        },
        get rollback() {
          return () => {
            this.marker = 'rollback';
            return txMap.perform();
          };
        },
        get data() {
          return data;
        },
        get txnMap() {
          return txMap;
        },
      };
    })([], new Map(), txnMap);

    // Save txn to map
    txnMap.add(parentTxn, txn);

    // Return to caller
    return txn;
  }

  // match(modelish) {
  //   const model = this.resolver.toModelMarked(modelish);
  //   const driver = model.getDriver();
  //   if (!this.driverMap.has(driver)) this.driverMap.set(driver, []);
  //   const op = new QueryBuilderTransaction(model, this.resolver, this);
  //   this.driverMap.get(driver).push(op);
  //   return op;
  // }

  // exec() {
  //   return Promise.all(Array.from(this.driverMap.entries()).map(([driver, ops]) => {
  //     if (driver.getDirectives().transactions === false) {
  //       return Promise.all(ops.map(op => op.exec())).then((results) => {
  //         results.$commit = () => this.resolver.clearAll();
  //         results.$rollback = () => this.resolver.clearAll();
  //         return results;
  //       });
  //     }

  //     return driver.transaction(ops);
  //   })).then((results) => {
  //     this.data = results;
  //     return flatten(results);
  //   });
  // }

  // run() {
  //   return this.exec().then((results) => {
  //     if (this.txMap.root(this) === this) return this.commit().then(() => results);
  //     this.commit();
  //     return results;
  //   }).catch((e) => {
  //     if (this.txMap.root(this) === this) return this.rollback().then(() => Promise.reject(e));
  //     this.rollback();
  //     throw e;
  //   });
  // }

  // commit() {
  //   if (this.marker !== 'rollback') this.marker = 'commit';
  //   return this.txMap.perform();
  // }

  // rollback() {
  //   this.marker = 'rollback';
  //   return this.txMap.perform();
  // }
};
