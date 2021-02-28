/* eslint-disable no-underscore-dangle */

const Stream = require('stream');
const TransformFunction = require('./TransformFunction');

module.exports = class Pipeline extends Stream.Readable {
  constructor(stream, ...transforms) {
    // We deal with objects
    super({ objectMode: true });

    // Normalize stream
    this._isPromise = Boolean(stream instanceof Promise);
    this._stream = this.isPromise ? stream : stream;
    if (!(this._stream instanceof Stream.Readable)) throw new Error(`Expected Readable Stream, found ${stream}`);

    // Create pipeline to do all sorts of work/transformations to the data
    this._pipeline = [stream, ...Pipeline.normalizeTransforms(...transforms), new Stream.PassThrough({ objectMode: true })];

    // This promise is used if the user tries to treat this object like a promise
    this._promise = new Promise((resolve, reject) => {
      this._resolve = resolve;
      this._reject = reject;
    });
  }

  addTransform(t) {
    if (this.readableFlowing !== null) throw new Error('Transform must be added before data flow!');
    const [tf] = Pipeline.normalizeTransforms(t);
    this._pipeline.splice(-1, 0, tf);
  }

  _read() {
    Stream.pipeline(...this._pipeline).on('data', (data) => {
      this.push(data);
    }).on('end', () => {
      this.push(null);
    });
  }

  pause() {
    this._stream.pause();
    return super.pause();
  }

  resume() {
    this._stream.resume();
    return super.resume();
  }

  unshift(chunk) {
    this._stream.unshift(chunk);
    return super.unshift(chunk);
  }

  then(cb) {
    this.hydrate();
    return this._promise.then(cb);
  }

  catch(cb) {
    this.hydrate();
    return this._promise.catch(cb);
  }

  finally(cb) {
    this.hydrate();
    return this._promise.finally(cb);
  }

  hydrate() {
    if (this.readableFlowing === null) {
      const buffer = [];

      Stream.pipeline(...this._pipeline).on('data', (data) => {
        buffer.push(data);
      }).on('end', () => {
        this._resolve(this._isPromise ? buffer[0] : buffer);
      }).on('error', (e) => {
        this._reject(e);
      });
    }
  }

  static normalizeTransforms(...transforms) {
    return transforms.map((t) => {
      if (t instanceof Stream.Transform) return t;
      if (!(t instanceof Function)) throw new Error(`Expected Function, found ${t}`);
      return new TransformFunction(t);
    });
  }
};
