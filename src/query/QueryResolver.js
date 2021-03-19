const { isEmpty } = require('lodash');
const Boom = require('../core/Boom');
const QueryService = require('./QueryService');
const { createSystemEvent } = require('../service/event.service');
const { ucFirst, mergeDeep } = require('../service/app.service');

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
    return createSystemEvent('Mutation', { method: 'create', query }, () => {
      const { model, $input } = query.toObject();
      return model.validateData($input, {}, 'create').then(() => this.resolver.resolve(query));
    });
  }

  createMany(query) {
    const { model, args, transaction } = query.toObject();
    const txn = this.resolver.transaction(transaction);
    args.forEach(arg => txn.match(model).save(arg));
    return txn.run();
  }

  updateOne(query) {
    const { model, $input, match } = query.toObject();

    return this.resolver.match(model).native(match).one({ required: true }).then(async (doc) => {
      // return createSystemEvent('Mutation', { method: 'update', query, doc, merged }, async () => {
        await model.validateData($input, doc, 'update');
        const $doc = mergeDeep(model.serialize(doc), $input);
        return this.resolver.resolve(query.doc(doc).$doc($doc));
      // });
    });
  }

  updateMany(query) {
    const { model, args, match, transaction, flags } = query.toObject();

    return this.resolver.match(model).native(match).flags(flags).many().then((docs) => {
      const txn = this.resolver.transaction(transaction);
      docs.forEach(doc => txn.match(model).id(doc.id).save(...args));
      return txn.run();
    });
  }

  deleteOne(query) {
    const { model, id } = query.toObject();

    return this.resolver.match(model).id(id).one({ required: true }).then((doc) => {
      return createSystemEvent('Mutation', { method: 'delete', query: query.doc(doc) }, () => {
        return QueryService.resolveReferentialIntegrity(query).then(() => {
          return this.resolver.resolve(query).then(() => doc);
        });
      });
    });
  }

  deleteMany(query) {
    const { model, match, transaction } = query.toObject();

    return this.resolver.match(model).where(match).many().then((docs) => {
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
    const { model, match, transaction } = query.toObject();
    const [key, ...values] = args;

    return this.resolver.match(model).native(match).many().then((docs) => {
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
    const { model, match, transaction, args } = query.toObject();
    const [key, ...values] = args;

    return this.resolver.match(model).native(match).many().then((docs) => {
      const txn = this.resolver.transaction(transaction);
      docs.forEach(doc => txn.match(model).id(doc.id).pull(key, ...values));
      return txn.run();
    });
  }

  splice(query) {
    const { model, match, args } = query.toObject();
    const [key, from, to] = args;

    return this.resolver.match(model).native(match).one({ required: true }).then(async (doc) => {
      // return createSystemEvent('Mutation', { method: 'splice', model, resolver, query, input: data, doc, merged }, async () => {
        const data = await QueryService.spliceEmbeddedArray(query, doc, key, from, to);
        await model.validateData(data, doc, 'update');
        const $doc = mergeDeep(model.serialize(doc), model.serialize(data));
        return this.resolver.resolve(query.method('updateOne').doc(doc).$doc($doc));
      // });
    });
  }

  first(query) {
    return this.findMany(query.method('findMany'));
  }

  last(query) {
    return this.findMany(query.method('findMany'));
  }

  async resolve() {
    const { model, crud, method, input, sort, flags, isNative } = this.query.toObject();

    // // Select fields
    // const fields = model.getSelectFields();
    // const fieldNameToKeyMap = fields.reduce((prev, field) => Object.assign(prev, { [field.getName()]: field.getKey() }), {});
    // const $select = select ? Object.keys(select).map(n => fieldNameToKeyMap[n]) : fields.map(f => f.getKey());
    // clone.select($select);

    // Where clause
    if (!isNative) {
      const $where = await QueryService.resolveWhereClause(this.query);
      this.query.match(model.serialize($where));
    }

    // Input data
    if (crud === 'create' || crud === 'update') {
      this.query.$input(model.serialize(model[`append${ucFirst(crud)}Fields`](input)));
    }

    if (sort) {
      this.query.$sort(Object.entries(sort).reduce((prev, [key, value]) => {
        return Object.assign(prev, { [model.getFieldByName(key).getKey()]: value.toLowerCase() === 'asc' ? 1 : -1 });
      }, {}));
    }

    return this[method](this.query).then((data) => {
      if (flags.required && (data == null || isEmpty(data))) throw Boom.notFound(`${model} Not Found`);
      if (data == null) return null; // Explicitly return null here
      return data;
    });
  }
};
