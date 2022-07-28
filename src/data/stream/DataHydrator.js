const Stream = require('stream');
const ResultSet = require('./ResultSet');
const ResultSetItem = require('./ResultSetItem');
const { promiseChain, mapPromise, toKeyObj } = require('../../service/app.service');

module.exports = class DataHydrator {
  constructor(query, data) {
    let { select = {} } = query.toObject();
    select = toKeyObj(select);
    return data instanceof Stream ? DataHydrator.stream(query, data, select) : DataHydrator.process(query, data, select);
  }

  static stream(query, stream, select) {
    const results = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (data) => {
        results.push(DataHydrator.hydrate(query, data, select));
      });

      stream.on('error', reject);

      stream.on('end', () => {
        resolve(new ResultSet(query, results));
      });
    });
  }

  static process(query, data, select) {
    return mapPromise(data, d => DataHydrator.hydrate(query, d, select)).then(results => new ResultSet(query, results));
  }

  static hydrate(query, data, select) {
    const item = new ResultSetItem(query, data);

    // Async (behind the scenes) hydration
    // Promise.resolve().then(() => {
    const loopArray = Array.from(new Array(Math.max(0, ...Object.keys(select).map(key => key.split('.').length))));

    Object.keys(select).forEach((path) => {
      const arrPath = path.split('.');

      loopArray.forEach((el, depth) => {
        const arr = arrPath.slice(0, depth);
        const $arr = arr.map(ele => `$${ele}`);
        const key = arr[depth];

        // id has special handling
        if (key && key !== 'id') {
          promiseChain($arr.map($prop => chain => (chain.pop() || item)[$prop]()));
        }
      });
    });
    // });

    return item;
  }
};
