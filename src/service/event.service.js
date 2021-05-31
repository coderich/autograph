const QueryService = require('../query/QueryService');
const EventEmitter = require('../core/EventEmitter');
const { ensureArray, ucFirst } = require('./app.service');

// Event emitters
const eventEmitter = new EventEmitter().setMaxListeners(100);
const internalEmitter = new EventEmitter().setMaxListeners(100);
const systemEvent = new EventEmitter().setMaxListeners(100).on('system', async (event, next) => {
  const { type, data } = event;
  await internalEmitter.emit(type, data);
  next(await eventEmitter.emit(type, data)); // Return result from user-defined middleware
});

//
exports.createSystemEvent = (name, mixed = {}, thunk = () => {}) => {
  let event;
  let middleware;
  const type = ucFirst(name);

  if (name !== 'Setup') {
    const { method, query } = mixed;
    const { resolver, model, meta, doc, id, input, sort, merged, native, root, flags } = query.toObject();

    event = {
      context: resolver.getContext(),
      key: `${method}${model}`,
      resolver,
      method,
      model,
      meta,
      id,
      input,
      query,
      doc,
      merged,
      root,
    };

    middleware = () => new Promise(async (resolve) => {
      if (!native) {
        const $where = await QueryService.resolveWhereClause(query);
        query.match(model.serialize(query, $where, true));
      }

      if (sort) {
        query.$sort(QueryService.resolveSortBy(query));
      }

      resolve();
    });
  } else {
    middleware = () => Promise.resolve();
    event = mixed;
  }

  return systemEvent.emit('system', { type: `pre${type}`, data: event }).then((result) => {
    if (result !== undefined) return result; // Allowing middleware to dictate result
    return middleware().then(thunk);
  }).then((result) => {
    event.doc = result; // You do actually need this...
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
  const { model, input, method, doc = input, query } = event;

  return Promise.all(model.getEmbeddedFields().map((field) => {
    return new Promise((resolve, reject) => {
      if (Object.prototype.hasOwnProperty.call(input || {}, field.getName())) {
        let i = 0;
        const value = input[field.getName()];
        const values = ensureArray(value).filter(el => el != null);
        const newModel = field.getModelRef();

        if (values.length) {
          values.forEach((val) => {
            const clone = query.clone().model(newModel).input(val).doc(doc);
            exports.createSystemEvent('Mutation', { method, query: clone }, () => {
              if (++i >= values.length) resolve();
            }).catch(e => reject(e));
            // const newEvent = { parent: doc, key: `${method}${field}`, method, model: newModel, resolver, query: new Query(resolver, newModel, { meta }), input: val };
            // exports.createSystemEvent('Mutation', newEvent, () => {
            //   if (++i >= values.length) resolve();
            // }).catch(e => reject(e));
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
