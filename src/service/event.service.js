const QueryService = require('../query/QueryService');
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

const makeMiddleware = () => {
  return (mixed) => {
    const { query } = mixed;
    const { model, native, sort, match, batch } = query.toObject();

    return new Promise(async (resolve) => {
      if (!native) {
        const whereShape = model.getShape('create', 'where');
        const $where = batch ? match : await QueryService.resolveWhereClause(query);
        const $$where = model.shapeObject(whereShape, $where, query);
        query.match($$where);
      }

      if (sort) {
        query.$sort(QueryService.resolveSortBy(query));
      }

      resolve();
    });
  };
};

//
exports.createSystemEvent = (name, mixed = {}, thunk = () => {}) => {
  let event = mixed;
  let middleware = () => Promise.resolve();
  const type = ucFirst(name);

  if (name !== 'Setup' && name !== 'Response') {
    event = makeEvent(mixed);
    middleware = makeMiddleware();
  }

  return systemEvent.emit('system', { type: `pre${type}`, data: event }).then(async (result) => {
    if (result !== undefined) return result; // Allowing middleware to dictate result
    return middleware(mixed).then(thunk);
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
