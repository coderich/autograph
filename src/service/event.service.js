const QueryService = require('../query/QueryService');
const EventEmitter = require('../core/EventEmitter');
const { ucFirst } = require('./app.service');

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
  let event = mixed;
  let middleware = () => Promise.resolve();
  const type = ucFirst(name);

  if (name !== 'Setup' && name !== 'Response') {
    const { query } = mixed;
    const { resolver, model, meta, doc, id, input, sort, merged, native, root, crud, key, method } = query.toObject();
    const context = resolver.getContext();

    event = {
      key,
      resolver,
      context,
      method,
      crud,
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
        const shape = model.getShape('create', 'where');
        const $where = await QueryService.resolveWhereClause(query);
        const $$where = model.shapeObject(shape, $where, query);
        query.match($$where);
      }

      if (sort) {
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
exports.internalEmitter = internalEmitter;


// /**
//  * Hook into the pre event only!
//  *
//  * Kick off system events for embedded fields
//  */
// const eventHandler = (event) => {
//   const { model, input, method, doc = input, query } = event;

//   return Promise.all(model.getEmbeddedFields().map((field) => {
//     return new Promise((resolve, reject) => {
//       if (Object.prototype.hasOwnProperty.call(input || {}, field.getName())) {
//         let i = 0;
//         const value = input[field.getName()];
//         const values = ensureArray(value).filter(el => el != null);
//         const newModel = field.getModelRef();

//         if (values.length) {
//           values.forEach((val) => {
//             const clone = query.clone().model(newModel).input(val).doc(doc);
//             exports.createSystemEvent('Mutation', { method, query: clone }, () => {
//               if (++i >= values.length) resolve();
//             }).catch(e => reject(e));
//             // const newEvent = { parent: doc, key: `${method}${field}`, method, model: newModel, resolver, query: new Query(resolver, newModel, { meta }), input: val };
//             // exports.createSystemEvent('Mutation', newEvent, () => {
//             //   if (++i >= values.length) resolve();
//             // }).catch(e => reject(e));
//           });
//         } else {
//           resolve();
//         }
//       } else {
//         resolve();
//       }
//     });
//   }));
// };

// internalEmitter.on('preMutation', async (event, next) => eventHandler(event).then(next)); // Only preMutation!
