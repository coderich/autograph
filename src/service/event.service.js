const Query = require('../query/Query');
const EventEmitter = require('../core/EventEmitter');
const { ensureArray, ucFirst } = require('./app.service');

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

  if (name !== 'Setup') {
    event.context = event.resolver.getContext();
    event.meta = event.query.getMeta();
    event.key = `${event.method}${event.model}`;
  }

  return systemEvent.emit('system', { type: `pre${type}`, data: event }).then(() => thunk()).then((result) => {
    event.doc = result;
    return systemEvent.emit('system', { type: `post${type}`, data: event }).then(() => result);
  });
};
exports.eventEmitter = eventEmitter;
exports.internalEmitter = internalEmitter;


/**
 * Hook into the pre event only!
 *
 * Kick off system events for embedded fields
 */
const eventHandler = (event) => {
  const { model, input, method, resolver, meta, doc = input } = event;

  return Promise.all(model.getEmbeddedFields().map((field) => {
    return new Promise((resolve, reject) => {
      if (Object.prototype.hasOwnProperty.call(input || {}, field.getName())) {
        let i = 0;
        const value = input[field.getName()];
        const values = ensureArray(value).filter(el => el != null);
        const newModel = field.getModelRef();

        if (values.length) {
          values.forEach((val) => {
            const newEvent = { parent: doc, key: `${method}${field}`, method, model: newModel, resolver, query: new Query(resolver, newModel, { meta }), input: val };
            exports.createSystemEvent('Mutation', newEvent, () => {
              if (++i >= values.length) resolve();
            }).catch(e => reject(e));
          });
        } else {
          resolve();
        }
      } else {
        resolve();
      }
    });
  }));
};

internalEmitter.on('preMutation', async (event, next) => eventHandler(event).then(next)); // Only preMutation!
