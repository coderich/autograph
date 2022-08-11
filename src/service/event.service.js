const QueryService = require('../query/QueryService');
const EventEmitter = require('../core/EventEmitter');
const { ucFirst } = require('./app.service');

// Event emitters
const eventEmitter = new EventEmitter().setMaxListeners(100);
const systemEvent = new EventEmitter().setMaxListeners(100).on('system', async (event, next) => {
  const { type, data } = event;
  next(await eventEmitter.emit(type, data)); // Return result from user-defined middleware
});

//
exports.createSystemEvent = (name, mixed = {}, thunk = () => {}) => {
  let event = mixed;
  let middleware = () => Promise.resolve();
  const type = ucFirst(name);

  if (name !== 'Setup' && name !== 'Response') {
    const { query } = mixed;
    event = query.toObject();
    event.query = query;

    middleware = () => new Promise(async (resolve) => {
      if (!event.native) {
        const shape = event.model.getShape('create', 'where');
        const $where = await QueryService.resolveWhereClause(query);
        const $$where = event.model.shapeObject(shape, $where, query);
        query.match($$where);
      }

      if (event.sort) {
        query.$sort(QueryService.resolveSortBy(query));
      }

      resolve();
    });
  }

  return systemEvent.emit('system', { type: `pre${type}`, data: event }).then((result) => {
    if (result !== undefined) return result; // Allowing middleware to dictate result
    return middleware().then(thunk);
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
