const { get, set, isEmpty } = require('lodash');
const Boom = require('../core/Boom');
const QueryService = require('./QueryService');
const DataService = require('../data/DataService');
const { createSystemEvent } = require('../service/event.service');
const { mergeDeep, hashObject, getGQLReturnType } = require('../service/app.service');

module.exports = class QueryResolver {
  constructor(query) {
    this.query = query;
    this.resolver = query.toObject().resolver;
    this.context = this.resolver.getContext();
  }

  autoResolve(query) {
    const { args } = query.toObject();
    const [,,, info] = args;

    switch (getGQLReturnType(`${info.returnType}`)) {
      case 'array': {
        return new QueryResolver(this.query.clone().method('findMany')).resolve();
      }
      case 'number': {
        return new QueryResolver(this.query.clone().method('count')).resolve();
      }
      case 'connection': {
        return Promise.resolve({
          count: () => new QueryResolver(this.query.clone().method('count')).resolve(),
          edges: () => new QueryResolver(this.query.clone().method('findMany')).resolve(),
          pageInfo: () => new QueryResolver(this.query.clone().method('findMany')).resolve(),
        });
      }
      case 'scalar': default: {
        return new QueryResolver(this.query.clone().method('findOne')).resolve();
      }
    }
  }

  findOne(query) {
    return createSystemEvent('Query', { query }, async () => {
      return this.resolver.resolve(query);
    });
  }

  findMany(query) {
    return createSystemEvent('Query', { query }, async () => {
      return this.resolver.resolve(query);
    });
  }

  count(query) {
    return createSystemEvent('Query', { query }, async () => {
      return this.resolver.resolve(query);
    });
  }

  createOne(query) {
    const { model, input } = query.toObject();
    const inputShape = model.getShape('create', 'input');
    const docShape = model.getShape('create', 'doc');
    const doc = model.shapeObject(inputShape, {}, query); // We use input shape here
    const merged = mergeDeep(doc, input);

    return createSystemEvent('Mutation', { query: query.doc(doc).merged(merged) }, async () => {
      const payload = model.shapeObject(inputShape, merged, query);
      await model.validateObject(inputShape, payload, query.payload(payload));
      return this.resolver.resolve(query.$input(model.shapeObject(docShape, payload, query)));
    });
  }

  createMany(query) {
    const { model, input, transaction } = query.toObject();
    const txn = this.resolver.transaction(transaction);
    input.forEach(arg => txn.match(model).save(arg));
    return txn.run();
  }

  async updateOne(query) {
    const { model, match, input, flags } = query.toObject();
    const inputShape = model.getShape('update', 'input');
    const docShape = model.getShape('update', 'doc');

    return this.resolver.match(model).match(match).one({ required: true }).then((doc) => {
      const merged = mergeDeep(doc, input);
      const docHash = hashObject(doc);
      const skipUnchanged = get(flags, 'skipUnchanged');

      // Prevent udpates when no data has changed
      if (skipUnchanged && docHash === hashObject(merged)) return doc;

      return createSystemEvent('Mutation', { query: query.doc(doc).merged(merged) }, async () => {
        // Prevent udpates when no data has changed (because merged can be mutated)
        if (skipUnchanged && docHash === hashObject(merged)) return doc;

        // Process
        const payload = model.shapeObject(inputShape, merged, query);
        await model.validateObject(inputShape, payload, query.payload(payload));
        const $doc = model.shapeObject(docShape, payload, query, undefined, undefined, true);
        return this.resolver.resolve(query.$doc($doc));
      });
    });
  }

  updateMany(query) {
    const { model, input, match, transaction, flags } = query.toObject();

    return this.resolver.match(model).match(match).many(flags).then((docs) => {
      const txn = this.resolver.transaction(transaction);
      docs.forEach(doc => txn.match(model).id(doc.id).save(input, flags));
      return txn.run();
    });
  }

  deleteOne(query) {
    const { model, id } = query.toObject();

    return this.resolver.match(model).id(id).one({ required: true }).then(async (doc) => {
      return createSystemEvent('Mutation', { query: query.doc(doc) }, () => {
        return QueryService.resolveReferentialIntegrity(query).then(() => {
          return this.resolver.resolve(query).then(() => doc);
        });
      });
    });
  }

  deleteMany(query) {
    const { model, match, transaction, flags } = query.toObject();

    return this.resolver.match(model).where(match).flags(flags).many().then((docs) => {
      const txn = this.resolver.transaction(transaction);
      docs.forEach(doc => txn.match(model).id(doc.id).delete());
      return txn.run();
    });
  }

  pushOne(query) {
    const { args } = query.toObject();
    const [key, ...values] = args;
    return this.splice(query.args([key, null, values]));
  }

  pushMany(query) {
    const { args } = query.toObject();
    const { model, match, transaction, flags } = query.toObject();
    const [key, ...values] = args;

    return this.resolver.match(model).match(match).flags(flags).many().then((docs) => {
      const txn = this.resolver.transaction(transaction);
      docs.forEach(doc => txn.match(model).id(doc.id).push(key, ...values));
      return txn.run();
    });
  }

  pullOne(query) {
    const { args } = query.toObject();
    const [key, ...values] = args;
    return this.splice(query.args([key, values]));
  }

  pullMany(query) {
    const { model, match, transaction, args, flags } = query.toObject();
    const [key, ...values] = args;

    return this.resolver.match(model).match(match).flags(flags).many().then((docs) => {
      const txn = this.resolver.transaction(transaction);
      docs.forEach(doc => txn.match(model).id(doc.id).pull(key, ...values));
      return txn.run();
    });
  }

  spliceOne(query) {
    const { args } = query.toObject();
    const [key, ...values] = args;
    return this.splice(query.args([key, ...values]));
  }

  spliceMany(query) {
    const { model, match, transaction, args, flags } = query.toObject();
    const [key, ...values] = args;

    return this.resolver.match(model).match(match).flags(flags).many().then((docs) => {
      const txn = this.resolver.transaction(transaction);
      docs.forEach(doc => txn.match(model).id(doc.id).splice(key, ...values));
      return txn.run();
    });
  }

  splice(query) {
    const { model, match, args } = query.toObject();
    const docShape = model.getShape('update', 'doc');
    const inputShape = model.getShape('update', 'input');
    const spliceShape = model.getShape('update', 'splice');
    const [key, from, to] = args;

    // Can only splice arrays
    const field = model.getField(key);
    const isArray = field.isArray();
    const path = `${model}.${field}`;
    if (!isArray) throw Boom.badRequest(`Cannot splice field '${path}'`, { path });

    return this.resolver.match(model).match(match).one({ required: true }).then(async (doc) => {
      const array = get(doc, key) || [];
      const $to = model.shapeObject(spliceShape, { [key]: to }, query)[key] || to;
      const $from = model.shapeObject(spliceShape, { [key]: from }, query)[key] || from;
      set(doc, key, DataService.spliceEmbeddedArray(array, $from, $to));

      return createSystemEvent('Mutation', { query: query.method('updateOne').doc(doc).merged(doc) }, async () => {
        const payload = model.shapeObject(inputShape, doc, query);
        await model.validateObject(inputShape, payload, query.payload(payload));
        return this.resolver.resolve(query.$doc(model.shapeObject(docShape, payload, query)));
      });
    });
  }

  first(query) {
    return this.findMany(query.method('findMany'));
  }

  last(query) {
    return this.findMany(query.method('findMany'));
  }

  async resolve() {
    const { model, method, flags } = this.query.toObject();

    return this[method](this.query).then((data) => {
      if (flags.required && isEmpty(data)) throw Boom.notFound(`${model} Not Found`);
      if (data == null) return null; // Explicitly return null here
      return data;
    });
  }
};
