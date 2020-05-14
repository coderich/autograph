const EventEmitter = require('../core/EventEmitter');
const { ucFirst } = require('./app.service');

// Event emitters
const eventEmitter = new EventEmitter();

//
exports.createSystemEvent = (name, event = {}, thunk = () => {}) => {
  const type = ucFirst(name);

  return eventEmitter.emit(`pre${type}`, event).then(() => thunk()).then((result) => {
    event.result = result;
    eventEmitter.emit(`post${type}`, event);
    return result;
  });
};

exports.eventEmitter = eventEmitter;
