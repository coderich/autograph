const _ = require('lodash');
const FBDataLoader = require('dataloader');
const TreeMap = require('../data/TreeMap');
const QueryBuilder = require('../data/QueryBuilder');
const TxnQueryBuilder = require('../data/TransactionQueryBuilder');
const QueryWorker = require('../data/QueryWorker');
const Query = require('../data/Query');
const Model = require('../data/Model');
const { hashObject } = require('../service/app.service');
const Rule = require('./Rule');

let count = 0;

module.exports = class Resolver {
  constructor(schema, context = {}) {
    this.schema = schema;
    this.context = context;
    this.worker = new QueryWorker(this);
    this.loader = this.createLoader();

    Rule.factory('ensureId', () => (field, v) => {
      return this.match(field.getType()).id(v).one().then((doc) => {
        if (doc) return false;
        return true;
      });
    });
  }

  getContext() {
    return this.context;
  }

  // Encapsulate Facebook DataLoader
  load(key) {
    const { method, model, query: q, args } = key;
    const query = new Query(this.toModel(model), q);

    switch (method) {
      case 'create': case 'update': case 'delete': case 'push': case 'pull': {
        return this.worker[method](query, ...args).then((results) => {
          this.loader.clearAll();
          return results;
        });
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
    const resolver = this;
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
          const rollbackData = _.flatten(rollbacks.map(tnx => tnx.data));
          const commitData = _.flatten(commits.map(tnx => tnx.data));

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
    const txn = ((data, driverMap, txMap, id) => {
      return {
        get match() {
          return (modelName) => {
            const model = resolver.toModel(modelName);
            const driver = model.getDriver();
            const op = new TxnQueryBuilder(model, resolver, this);
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
    })([], new Map(), txnMap, count++);

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
