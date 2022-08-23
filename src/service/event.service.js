const EventEmitter = require('../core/EventEmitter');
const { ucFirst } = require('./app.service');

// Event emitters
const eventEmitter = new EventEmitter().setMaxListeners(100);
const systemEvent = new EventEmitter().setMaxListeners(100).on('system', async (event, next) => {
  const { type, data } = event;
  next(await eventEmitter.emit(type, data)); // Return result from user-defined middleware
});

const makeEvent = (mixed) => {
  const { query } = mixed;
  const event = query.toObject();
  event.query = query;
  return event;
};

//
exports.createSystemEvent = (name, mixed = {}, thunk = () => {}) => {
  let event = mixed;
  const type = ucFirst(name);

  if (name !== 'Setup' && name !== 'Response') event = makeEvent(mixed);

  return systemEvent.emit('system', { type: `pre${type}`, data: event }).then(async (result) => {
    if (result !== undefined) return result; // Allowing middleware to dictate result
    if (event.crud !== 'read' && name !== 'Setup' && name !== 'Response') await eventEmitter.emit('validate', event);
    return thunk();
  }).then((result) => {
    event.result = result;
    if (event.crud === 'create') event.doc = event.query.toObject().doc;
    return systemEvent.emit('system', { type: `post${type}`, data: event }).then((postResult = result) => postResult);
  }).then((result) => {
    if (name === 'Response') return result;
    event.result = result;
    return exports.createSystemEvent('Response', event, (finalResult = result) => finalResult);
  });
};

exports.eventEmitter = eventEmitter;
