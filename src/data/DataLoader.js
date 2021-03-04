const FBDataLoader = require('dataloader');
const ResultSet = require('./ResultSet');
const { hashObject } = require('../service/app.service');

module.exports = class DataLoader extends FBDataLoader {
  constructor() {
    return new FBDataLoader((workers) => {
      // const methods = [...new Set(keys.map(k => k.method))];

      // if (keys.length > 10 && methods.length === 1 && methods[0] === 'get') {
      //   const hashKey = ({ model, query, args }) => hashObject({ model: `${model}`, where: query.getWhere(), args });

      //   const batches = keys.reduce((prev, key) => {
      //     const hash = hashKey(key);
      //     prev[hash] = prev[hash] || [];
      //     prev[hash].push(key);
      //     return prev;
      //   }, {});

      //   return Promise.all(Object.values(batches).map((batch, i) => {
      //     const [{ query, model, args }] = batch; // First is ok, they should all be the same
      //     const ids = batch.map(key => key.query.getId());
      //     const where = Object.assign(query.getWhere(), { id: ids });

      //     return this.worker.find(new Query(this, model, { where }), ...args).then((results) => {
      //       return ids.map((id) => {
      //         return { key: batch.find(b => `${b.query.getId()}` === `${id}`), value: results.find(r => `${r.id}` === `${id}`) };
      //       });
      //     });
      //   })).then((results) => {
      //     const data = flatten(results);

      //     return keys.map((key) => {
      //       return data.find(d => d.key === key).value;
      //     });
      //   });
      // }

      return Promise.all(workers.map((worker) => {
        return worker.getWork().then((work) => {
          return worker.model.getDriver().resolve(work).then((data) => {
            if (data == null) return null;
            return typeof data === 'object' ? new ResultSet(worker.query, data) : data;
          });
        });
      }));
    }, {
      cacheKeyFn: worker => hashObject(worker.getCacheKey()),
    });
  }
};
