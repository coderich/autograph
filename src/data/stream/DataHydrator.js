const { get } = require('lodash');
const Stream = require('stream');
const ResultSet = require('./ResultSet');
const ResultSetItem = require('./ResultSetItemProxy');
const { promiseChain, mapPromise, toKeyObj } = require('../../service/app.service');

module.exports = class DataHydrator {
  constructor(query, data) {
    let { select = {} } = query.toObject();
    select = toKeyObj(select);
    return data instanceof Stream ? DataHydrator.stream(query, data, select) : DataHydrator.process(query, data, select);
  }

  static stream(query, stream, select) {
    const promises = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (data) => {
        promises.push(DataHydrator.hydrate(query, data, select));
      });

      stream.on('error', reject);

      stream.on('end', () => {
        Promise.all(promises).then(results => resolve(new ResultSet(query, results)));
      });
    });
  }

  static process(query, data, select) {
    return mapPromise(data, d => DataHydrator.hydrate(query, d, select)).then(results => new ResultSet(query, results));
  }

  static hydrate(query, data, select) {
    const loopArray = Array.from(new Array(Math.max(0, ...Object.keys(select).map(key => key.split('.').length))));

    return new Promise((resolve, reject) => {
      const item = new ResultSetItem(query, data);

      return Promise.all(Object.keys(select).map((path) => {
        const arrPath = path.split('.');

        return Promise.all(loopArray.map((el, depth) => {
          const arr = arrPath.slice(0, depth);
          const $arr = arr.map(ele => `$${ele}`);
          const key = arr[depth];

          // id has special handling
          if (!key || key === 'id') return Promise.resolve();

          // Resolve all other attributes
          get(item, arr.join('.'));
          return promiseChain($arr.map($prop => chain => (chain.pop() || item)[$prop]()));
        }));
      })).then(() => resolve(item)).catch(e => reject(e));
    });
  }
};
