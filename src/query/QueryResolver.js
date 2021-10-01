const { get, isEmpty } = require('lodash');
const Boom = require('../core/Boom');
const QueryService = require('./QueryService');
const DataService = require('../data/DataService');
const { createSystemEvent } = require('../service/event.service');
const { mergeDeep } = require('../service/app.service');

module.exports = class QueryResolver {
  constructor(query) {
    this.query = query;
    this.resolver = query.toObject().resolver;
  }

  findOne(query) {
    return createSystemEvent('Query', { method: 'get', query }, () => {
      return this.resolver.resolve(query);
    });
  }

  findMany(query) {
    return createSystemEvent('Query', { method: 'find', query }, () => {
      return this.resolver.resolve(query);
    });
  }

  count(query) {
    return createSystemEvent('Query', { method: 'count', query }, () => {
      return this.resolver.resolve(query);
    });
  }

  createOne(query) {
    const { model, input, flags } = query.toObject();
    model.appendDefaultFields(query, input);

    return createSystemEvent('Mutation', { method: 'create', query }, () => {
      const $input = model.serialize(query, model.appendCreateFields(input));
      query.$input($input);
      return get(flags, 'novalidate') ? this.resolver.resolve(query) : model.validate(query, $input).then(() => this.resolver.resolve(query));
    });
  }

  createMany(query) {
    const { model, args, transaction } = query.toObject();
    const txn = this.resolver.transaction(transaction);
    args.forEach(arg => txn.match(model).save(arg));
    return txn.run();
  }

  updateOne(query) {
    const { model, match, flags } = query.toObject();

    return this.resolver.match(model).match(match).one({ required: true }).then((doc) => {
      const { input } = query.toObject();
      const merged = mergeDeep(doc, input);

      return createSystemEvent('Mutation', { method: 'update', query: query.doc(doc).merged(merged) }, async () => {
        const $input = model.serialize(query, model.appendUpdateFields(input), true);
        if (!get(flags, 'novalidate')) await model.validate(query, $input);
        const $doc = mergeDeep(model.serialize(query, doc, true), $input);
        return this.resolver.resolve(query.$doc($doc).$input($input));
      });
    });
  }

  updateMany(query) {
    const { model, args, match, transaction, flags } = query.toObject();

    return this.resolver.match(model).match(match).flags(flags).many().then((docs) => {
      const txn = this.resolver.transaction(transaction);
      docs.forEach(doc => txn.match(model).id(doc.id).save(...args));
      return txn.run();
    });
  }

  deleteOne(query) {
    const { model, id, flags } = query.toObject();

    return this.resolver.match(model).id(id).flags(flags).one({ required: true }).then((doc) => {
      return createSystemEvent('Mutation', { method: 'delete', query: query.doc(doc) }, () => {
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

  splice(query) {
    const { model, match, args, flags } = query.toObject();
    const [key, from, to] = args;

    return this.resolver.match(model).match(match).flags(flags).one({ required: true }).then(async (doc) => {
      const data = await DataService.spliceEmbeddedArray(query, doc, key, from, to);
      const merged = mergeDeep(doc, data);

      return createSystemEvent('Mutation', { method: 'splice', query: query.doc(doc).input(data).merged(merged) }, async () => {
        await model.validate(query, data);
        const $doc = mergeDeep(model.serialize(query, doc, true), model.serialize(query, data, true));
        return this.resolver.resolve(query.method('updateOne').doc(doc).$doc($doc));
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
      if (flags.required && (data == null || isEmpty(data))) throw Boom.notFound(`${model} Not Found`);
      if (data == null) return null; // Explicitly return null here
      return data;
    });
  }
};
