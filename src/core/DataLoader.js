const _ = require('lodash');
const FBDataLoader = require('dataloader');
const TreeMap = require('../data/TreeMap');
const QueryBuilder = require('../data/QueryBuilder');
const TxnQueryBuilder = require('../data/TransactionQueryBuilder');
const QueryWorker = require('../data/QueryWorker');
const Query = require('../data/Query');
const Model = require('../data/Model');
const { hashObject } = require('../service/app.service');

module.exports = class DataLoader {
  constructor(schema) {
    this.schema = schema;
    this.worker = new QueryWorker(this);
    this.loader = this.createLoader();
  }

  // Encapsulate Facebook DataLoader
  async load(key) {
    const { method, model, query: q, args } = key;
    const query = new Query(this.toModel(model), q);

    switch (method) {
      case 'create': case 'update': case 'delete': case 'push': case 'pull': {
        const results = await this.worker[method](query, ...args);
        this.loader.clearAll();
        return results;
      }
      default: {
        return this.loader.load({ method, model, query, args });
      }
    }
  }

  // Public Data API
  clear(key) {
    return this.loader.clear(key);
  }

  clearAll() {
    return this.loader.clearAll();
  }

  prime(key, value) {
    return this.loader.prime(key, value);
  }

  match(model) {
    return new QueryBuilder(this.toModel(model), this);
  }

  // Public Transaction API
  transaction(parentTxn) {
    const txnMap = parentTxn || new TreeMap();
    const loader = this;
    let resolve, reject;
    const promise = new Promise((good, bad) => { resolve = good; reject = bad; });

    const ready = () => {
      const elements = txnMap.elements();
      const notReady = elements.filter(el => !el.marker);
      if (notReady.length) return [undefined, undefined];
      const rollbackIndex = elements.findIndex(el => el.marker === 'rollback');
      return [elements.slice(0, rollbackIndex), elements.slice(rollbackIndex)];
    };

    const perform = () => {
      const [commits, rollbacks] = ready();

      if (commits && commits.length) {
        loader.clearAll();
        const data = _.flatten(commits.map(txn => txn.data));
        Promise.all(data.map(result => result.$commit())).then(resolve).catch(reject);
      }

      if (rollbacks && rollbacks.length) {
        const data = _.flatten(rollbacks.map(txn => txn.data));
        Promise.all(data.map(result => result.$rollback())).then(resolve).catch(reject);
      }

      return promise;
    };

    // Create txn
    const txn = ((data, driverMap) => {
      return {
        get match() {
          return (modelName) => {
            const model = loader.toModel(modelName);
            const driver = model.getDriver();
            const op = new TxnQueryBuilder(model, loader, txnMap);
            if (!driverMap.has(driver)) driverMap.set(driver, []);
            driverMap.get(driver).push(op);
            return op;
          };
        },
        get exec() {
          return () => {
            return Promise.all(Array.from(driverMap.entries()).map(([driver, ops]) => driver.transaction(ops))).then((results) => {
              data = results;
              return _.flatten(results);
            });
          };
        },
        get run() {
          return () => {
            return this.exec().then((results) => {
              return this.commit().then(() => results);
            }).catch((e) => {
              return this.rollback().then(() => Promise.reject(e));
            });
          };
        },
        get commit() {
          return () => {
            // txn.marker = 'commit';
            // return perform();
            loader.clearAll();
            return Promise.all(data.map(result => result.$commit()));
          };
        },
        get rollback() {
          return () => {
            // txn.marker = 'rollback';
            // return perform();
            return Promise.all(data.map(result => result.$rollback()));
          };
        },
        get data() {
          return data;
        },
      };
    })([], new Map());

    // Save txn to map
    txnMap.add(parentTxn, txn);

    // Return to caller
    return txn;
  }

  // Helpers
  toModel(model) {
    return model instanceof Model ? model : this.schema.getModel(model);
  }

  createLoader() {
    return new FBDataLoader(keys => Promise.all(keys.map(({ method, query, args }) => this.worker[method](query, ...args))), {
      cacheKeyFn: ({ method, model, query, args }) => hashObject({ method, model: `${model}`, query: query.toObject(), args }),
    });
  }
};
