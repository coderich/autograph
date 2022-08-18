const { get, set, isEmpty } = require('lodash');
const Boom = require('../core/Boom');
const QueryService = require('./QueryService');
const DataService = require('../data/DataService');
const { createSystemEvent } = require('../service/event.service');
const { mergeDeep, getGQLReturnType } = require('../service/app.service');

module.exports = class QueryResolver {
  constructor(query) {
    this.query = query;
    this.resolver = query.toObject().resolver;
    this.context = this.resolver.getContext();
  }

  autoResolve(query) {
    const { args } = query.toObject();
    const [,,, info] = args;

    switch (getGQLReturnType(info.returnType)) {
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

  async findOne(query) {
    await QueryService.resolveQuery(query);

    return createSystemEvent('Query', { query }, () => {
      return this.resolver.resolve(query);
    });
  }

  async findMany(query) {
    await QueryService.resolveQuery(query);

    return createSystemEvent('Query', { query }, () => {
      return this.resolver.resolve(query);
    });
  }

  async count(query) {
    await QueryService.resolveQuery(query);

    return createSystemEvent('Query', { query }, () => {
      return this.resolver.resolve(query);
    });
  }

  async createOne(query) {
    const { model, input } = query.toObject();
    const shape = model.getShape('create');

    await QueryService.resolveQuery(query);

    return createSystemEvent('Mutation', { query }, async () => {
      const $input = model.shapeObject(shape, input, query);
      await model.validate(query, $input);
      const doc = await this.resolver.resolve(query.$input($input));
      query.doc(doc);
      return doc;
    });
  }

  createMany(query) {
    const { model, input, transaction } = query.toObject();
    const txn = this.resolver.transaction(transaction);
    input.forEach(arg => txn.match(model).save(arg));
    return txn.run();
  }

  async updateOne(query) {
    const { model, match, input } = query.toObject();

    return this.resolver.match(model).match(match).one({ required: true }).then(async (doc) => {
      const shape = model.getShape('update');
      const merged = model.shapeObject(shape, mergeDeep(doc, input), query);

      await QueryService.resolveQuery(query);

      return createSystemEvent('Mutation', { query: query.doc(doc).merged(merged) }, async () => {
        const $doc = model.shapeObject(shape, mergeDeep(doc, input), query);
        await model.validate(query, $doc);
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
    const { model, id, flags } = query.toObject();

    return this.resolver.match(model).id(id).flags(flags).one({ required: true }).then(async (doc) => {
      await QueryService.resolveQuery(query);

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
    const { model, match, args, flags = {} } = query.toObject();
    const [key, from, to] = args;

    // Can only splice arrays
    const field = model.getField(key);
    const isArray = field.isArray();
    if (!isArray) throw Boom.badRequest(`Cannot splice field '${model}.${field}'`);

    return this.resolver.match(model).match(match).flags(flags).one({ required: true }).then(async (doc) => {
      const array = get(doc, key) || [];
      const paramShape = model.getShape('create', 'spliceTo');
      const $to = model.shapeObject(paramShape, { [key]: to }, query)[key] || to;
      const $from = model.shapeObject(paramShape, { [key]: from }, query)[key] || from;
      set(doc, key, DataService.spliceEmbeddedArray(array, $from, $to));

      await QueryService.resolveQuery(query);

      return createSystemEvent('Mutation', { query: query.method('updateOne').doc(doc).merged(doc) }, async () => {
        const shape = model.getShape('update');
        const $doc = model.shapeObject(shape, doc, query);
        await model.validate(query, $doc);
        return this.resolver.resolve(query.$doc($doc));
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

    // const resolveQueryMethods = ['findOne', 'findMany', 'count', 'createOne', 'updateOne', 'deleteOne', 'splice'];
    // if (resolveQueryMethods.indexOf(method) > -1) await QueryService.resolveQuery(this.query);

    return this[method](this.query).then((data) => {
      if (flags.required && isEmpty(data)) throw Boom.notFound(`${model} Not Found`);
      if (data == null) return null; // Explicitly return null here
      return data;
    });
  }
};
