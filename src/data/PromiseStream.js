module.exports = class PromiseStream {
  constructor(stream) {
    let proxyResolve, proxyReject;

    const promise = new Promise((resolve, reject) => {
      proxyResolve = resolve;
      proxyReject = reject;
    });

    return new Proxy(promise, {
      get(t, prop, rec) {
        const target = ['then', 'catch', 'finally'].indexOf(prop) > -1 ? promise : stream;
        const value = Reflect.get(target, prop, rec);
        if (prop === 'then') PromiseStream.streamToPromise(stream).then(data => proxyResolve(data)).catch(e => proxyReject(e));
        if (typeof value === 'function') return value.bind(target);
        return value;
      },
    });
  }

  static streamToPromise(stream) {
    return new Promise((resolve, reject) => {
      const ret = [];

      stream.on('data', (data) => {
        ret.push(data);
      }).on('end', () => {
        resolve(ret);
      }).on('error', (e) => {
        reject(e);
      });
    });
  }
};
