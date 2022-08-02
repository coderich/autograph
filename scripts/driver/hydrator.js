const shape = require('./data/shape');
const { shapeObject } = require('./service');

exports.fromArray = async (cursor, args) => {
  console.time('hydrator:fromArray');
  let data = await cursor.toArray();
  if (args.length === 0) data = shapeObject(shape, data);
  console.timeEnd('hydrator:fromArray');
  return data;
};

exports.fromCursor = async (cursor, args) => {
  console.time('hydrator:fromCursor');
  const c = await cursor.map((doc) => {
    if (args.length === 0) doc = shapeObject(shape, doc);
    return doc;
  });
  const data = await c.toArray();
  console.timeEnd('hydrator:fromCursor');
  return data;
};

exports.fromStream = async (cursor, args) => {
  console.time('hydrator:fromStream');

  const results = [];
  const stream = cursor.stream();

  const data = await new Promise((resolve, reject) => {
    stream.on('data', (doc) => {
      if (args.length === 0) doc = shapeObject(shape, doc);
      results.push(doc);
    });

    stream.on('error', reject);

    stream.on('end', () => {
      resolve(results);
    });
  });

  console.timeEnd('hydrator:fromStream');
  return data;
};
