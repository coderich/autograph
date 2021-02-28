/* eslint-disable no-underscore-dangle */

const Stream = require('stream');

module.exports = class TransformFunction extends Stream.Transform {
  constructor(fn) {
    super({ objectMode: true });
    this.fn = fn;
  }

  _transform(chunk, encoding, cb) {
    cb(null, this.fn(chunk));
  }
};
