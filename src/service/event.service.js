const EventEmitter = require('../core/EventEmitter');
const { ucFirst } = require('./app.service');

// Event emitters
const eventEmitter = new EventEmitter();
const internalEmitter = new EventEmitter();
const systemEvent = new EventEmitter().on('system', async (event, next) => {
  const { type, data } = event;
  await internalEmitter.emit(type, data);
  await eventEmitter.emit(type, data);
  next();
});

//
exports.createSystemEvent = (name, event = {}, thunk = () => {}) => {
  const type = ucFirst(name);

  return systemEvent.emit('system', { type: `pre${type}`, data: event }).then(() => thunk()).then((result) => {
    event.result = result;
    systemEvent.emit('system', { type: `post${type}`, data: event });
    return result;
  });
};
exports.eventEmitter = eventEmitter;
exports.internalEmitter = internalEmitter;
