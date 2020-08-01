const { flatten } = require('lodash');
const FBDataLoader = require('dataloader');
const TreeMap = require('../data/TreeMap');
const Model = require('../data/Model');
const QueryBuilder = require('../query/QueryBuilder');
const TxnQueryBuilder = require('../query/TransactionQueryBuilder');
const QueryWorker = require('../query/QueryWorker');
const Query = require('../query/Query');
const { hashCacheKey } = require('../service/app.service');
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

  getSchema() {
    return this.schema;
  }

  getContext() {
    return this.context;
  }

  // Encapsulate Facebook DataLoader
  load(key) {
    const { method, model, query: q, args } = key;
    const query = new Query(this, this.toModel(model), q);

    switch (method) {
      case 'create': case 'update': case 'delete': case 'push': case 'pull': case 'splice': {
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
    return new QueryBuilder(this.toModelEntity(model), this);
  }

  named(model) {
    return this.toModel(model).getNamedQueries();
  }

  raw(model) {
    return this.toModelEntity(model).raw();
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
    const txn = ((data, driverMap, txMap, id) => {
      return {
        get match() {
          return (modelName) => {
            const model = resolver.toModelMarked(modelName);
            const driver = model.getDriver();
            if (!driverMap.has(driver)) driverMap.set(driver, []);
            const op = new TxnQueryBuilder(model, resolver, this);
            driverMap.get(driver).push(op);
            return op;
          };
        },
        get exec() {
          return () => {
            return Promise.all(Array.from(driverMap.entries()).map(([driver, ops]) => {
              if (driver.getConfig().transactions === false) {
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

  toModelMarked(model) {
    const marked = this.toModel(model);
    if (!marked) throw new Error(`${model} is not defined in schema`);
    if (!marked.isMarkedModel()) throw new Error(`${model} is not a marked model`);
    marked.setResolver(this);
    return marked;
  }

  toModelEntity(model) {
    const entity = this.toModel(model);
    if (!entity) throw new Error(`${model} is not defined in schema`);
    if (!entity.isEntity()) throw new Error(`${model} is not an entity`);
    entity.setResolver(this);
    return entity;
  }

  createLoader() {
    return new FBDataLoader((keys) => {
      // const methods = [...new Set(keys.map(k => k.method))];

      // if (keys.length > 10 && methods.length === 1 && methods[0] === 'get') {
      //   let index = -1;
      //   let prevHash = '';
      //   const hashKey = ({ model, query, args }) => hashObject({ model: `${model}`, where: query.getWhere(), args });

      //   const batches = keys.reduce((prev, key) => {
      //     const hash = hashKey(key);

      //     if (hash === prevHash) {
      //       prev[index].push(key);
      //     } else {
      //       prev.push([key]);
      //       prevHash = hash;
      //       index++;
      //     }

      //     return prev;
      //   }, []);

      //   return Promise.all(batches.map((batch) => {
      //     const [{ query, model, args }] = batch;
      //     const ids = batch.map(key => key.query.getId());
      //     const where = Object.assign(query.getWhere(), { id: ids });

      //     return this.worker.find(new Query(this, model, { where }), ...args).then((results) => {
      //       return ids.map((id) => {
      //         return results.find(r => `${r.id}` === `${id}`);
      //       });
      //     });
      //   })).then((results) => {
      //     return flatten(results);
      //   });
      // }

      return Promise.all(keys.map(({ method, query, args }) => {
        return this.worker[method](query, ...args);
      }));
    }, {
      cacheKeyFn: key => hashCacheKey(key),
    });
  }
};
