const EventEmitter = require('../core/EventEmitter');
const { ucFirst, promiseChain } = require('./app.service');

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


// Handle embedded fields
const eventHandler = (event) => {
  const { model, input, method, resolver } = event;

  return promiseChain(model.getEmbeddedFields().map((field) => {
    return () => new Promise((resolve, reject) => {
      if (Object.prototype.hasOwnProperty.call(input, field.getName())) {
        const newEvent = { key: `${method}${field}`, method, model: field.getModelRef(), resolver, query: {}, input: input[field.getName()] };
        exports.createSystemEvent('Mutation', newEvent, () => resolve()).catch(e => reject(e));
      } else {
        resolve();
      }
    });
  }));
};

internalEmitter.on('preMutation', async (event, next) => eventHandler(event).then(next));
internalEmitter.on('postMutation', async (event, next) => eventHandler(event).then(next));
