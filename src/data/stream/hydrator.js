const Stream = require('stream');
const { workerData, parentPort } = require('worker_threads');
const ResultSet = require('./ResultSet');
const ResultSetItem = require('./ResultSetItem');
const { promiseChain, mapPromise, toKeyObj } = require('../../service/app.service');

function hydrate(query, data, select) {
  const item = new ResultSetItem(query, data);

  // Async (behind the scenes) hydration
  (async () => {
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
  })();

  return item;
}

function stream(query, $stream, select) {
  const results = [];

  return new Promise((resolve, reject) => {
    $stream.on('data', (data) => {
      results.push(hydrate(query, data, select));
    });

    $stream.on('error', reject);

    $stream.on('end', () => {
      resolve(new ResultSet(query, results));
    });
  });
}

function process(query, data, select) {
  return mapPromise(data, d => hydrate(query, d, select)).then(results => new ResultSet(query, results));
}

(async () => {
  const { query, data } = workerData;
  let { select = {} } = query.toObject();
  select = toKeyObj(select);
  const result = await data instanceof Stream ? stream(query, data, select) : process(query, data, select);
  parentPort.postMessage(result);
})();
