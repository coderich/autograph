const EventEmitter = require('events');
const { promiseChain } = require('../service/app.service');

module.exports = class extends EventEmitter {
  async emit(event, data) {
    return promiseChain(this.rawListeners(event).map((wrapper) => {
      return () => new Promise((resolve, reject) => {
        try {
          const next = () => resolve();
          const numArgs = (wrapper.listener || wrapper).length;

          wrapper(data, next);
          // if (wrapper instanceof Promise) {
          //   wrapper(data, next).catch(e => reject(e)); // I'm honestly not sure why I need this but does not work without
          // } else {
          //   wrapper(data, next);
          // }

          if (numArgs < 2) resolve();
        } catch (e) {
          reject(e);
        }
      });
    }));
  }
};
