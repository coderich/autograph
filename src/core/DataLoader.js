const _ = require('lodash');
const FBDataLoader = require('dataloader');
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
    this.txnMap = new WeakMap();
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
    const opsMap = new Map();
    const loader = this;
    let data = [];

    // Create txn
    const txn = {
      get match() {
        return (modelName) => {
          const model = loader.toModel(modelName);
          const driver = model.getDriver();
          const op = new TxnQueryBuilder(model, loader);
          if (!opsMap.has(driver)) opsMap.set(driver, []);
          opsMap.get(driver).push(op);
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
          return Promise.all(Array.from(opsMap.entries()).map(([driver, ops]) => driver.transaction(ops))).then((results) => {
            data = results;
            return _.flatten(results);
          });
        };
      },
      get commit() {
        return () => {
          loader.clearAll();
          return Promise.all(data.map(result => result.$commit()));
        };
      },
      get rollback() {
        return () => {
          return Promise.all(data.map(result => result.$rollback()));
        };
      },
    };

    // Save to manage them
    if (parentTxn) {
      if (!this.txnMap.has(parentTxn)) throw new Error();
      this.txnMap.set(parentTxn, this.txnMap.get(parentTxn).concat(txn));
    } else {
      this.txnMap.set(txn, []);
    }

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
