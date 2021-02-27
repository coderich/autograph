/* eslint-disable no-underscore-dangle */

const Stream = require('stream');

module.exports = class Transformer extends Stream.Transform {
  constructor(fn) {
    super({ objectMode: true });
    this.fn = fn;
  }

  _transform(chunk, encoding, done) {
    this.data = this.fn(chunk);
    done();
  }

  _flush(done) {
    this.push(this.data);
    done();
  }
};
