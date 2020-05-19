const EventEmitter = require('events');
const { promiseChain } = require('../service/app.service');

module.exports = class extends EventEmitter {
  async emit(event, data) {
    return promiseChain(this.rawListeners(event).map((wrapper) => {
      return () => new Promise((resolve, reject) => {
        const next = () => resolve();
        const numArgs = (wrapper.listener || wrapper).length;
        Promise.resolve(wrapper(data, next)).catch(e => reject(e));
        if (numArgs < 2) next();
      });
    }));
  }
};
