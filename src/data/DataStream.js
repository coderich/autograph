const Stream = require('stream');
const { shapeObject } = require('../service/app.service');

module.exports = class DataStream {
  constructor(model, stream, context) {
    const shape = model.getShape();
    return stream instanceof Stream ? DataStream.stream(shape, stream, context) : shapeObject(shape, stream, context);
  }

  static stream(shape, stream, context) {
    const results = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (data) => {
        results.push(shapeObject(shape, data, context));
      });

      stream.on('error', reject);

      stream.on('end', () => {
        resolve(results);
      });
    });
  }
};
