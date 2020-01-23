const _ = require('lodash');
const FBDataLoader = require('dataloader');
const ParentChildMap = require('../data/ParentChildMap');
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
    this.txnMap = new ParentChildMap();
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
    const driverMap = new Map();
    const loader = this;
    let promise;
    let data = [];

    const ready = () => {
      const elements = this.txnMap.elements();
      const notReady = elements.filter(el => !el.marker);
      if (notReady.length) return false;
      const rollbackIndex = elements.findIndex(el => el.marker === 'rollback');
      return [elements.slice(0, rollbackIndex), elements.slice(rollbackIndex)];
    };

    const perform = (commits, rollbacks) => {
      console.log('commits', commits);
      console.log('rollbacks', rollbacks);
    };

    // Create txn
    const txn = {
      get match() {
        return (modelName) => {
          const model = loader.toModel(modelName);
          const driver = model.getDriver();
          const op = new TxnQueryBuilder(model, loader);
          if (!driverMap.has(driver)) driverMap.set(driver, []);
          driverMap.get(driver).push(op);
          return op;
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
      get exec() {
        return () => {
          return Promise.all(Array.from(driverMap.entries()).map(([driver, ops]) => driver.transaction(ops))).then((results) => {
            data = results;
            return _.flatten(results);
          });
        };
      },
      get commit() {
        return () => {
          txn.marker = 'commit';

          return new Promise((resolve, reject) => {
            // if (ready()) {
              loader.clearAll();
              Promise.all(data.map(result => result.$commit())).then(resolve).catch(reject);
            // }
          });
        };
      },
      get rollback() {
        return () => {
          txn.marker = 'rollback';

          return new Promise((resolve, reject) => {
            // if (ready()) {
              Promise.all(data.map(result => result.$rollback())).then(resolve).catch(reject);
            // }
          });
        };
      },
    };

    // Save txn to map
    this.txnMap.add(parentTxn, txn);

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
