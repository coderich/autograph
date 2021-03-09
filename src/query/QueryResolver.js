const { isEmpty } = require('lodash');
const Boom = require('../core/Boom');
const QueryService = require('./QueryService');
const QueryResult = require('./QueryResult');
const { mapPromise, ucFirst, unravelObject, mergeDeep, removeUndefinedDeep } = require('../service/app.service');

module.exports = class QueryResolver {
  constructor(query) {
    this.query = query;
    this.resolver = query.resolver();
  }

  findOne(query) {
    const { model, flags } = query.toObject();

    return this.resolver.resolve(query).then((doc) => {
      if (flags.required && doc == null) throw Boom.notFound(`${model} Not Found`);
      return doc;
    });
  }

  findMany(query) {
    const { model, flags } = query.toObject();

    return this.resolver.resolve(query).then((docs) => {
      if (flags.required && isEmpty(docs)) throw Boom.notFound(`${model} Not Found`);
      return docs;
    });
  }

  count(query) {
    return this.resolver.resolve(query);
  }

  async createOne(query) {
    const { model, input } = query.toObject();
    await model.validateData({ ...input }, {}, 'create');
    return this.resolver.resolve(query).then(id => Object.assign(input, { id }));
  }

  createMany(query) {
    const { model, args, transaction } = query.toObject();
    const txn = this.resolver.transaction(transaction);
    args.forEach(arg => txn.match(model).save(arg));
    return txn.run();
  }

  updateOne(query) {
    const { model, input, flags } = query.toObject();
    const clone = query.clone().method('findOne').flags(Object.assign({}, flags, { required: true }));

    return this.resolver.resolve(clone).then(async (doc) => {
      if (doc == null) throw Boom.notFound(`${model} Not Found`);
      await model.validateData(input, model.deserialize(doc), 'update');
      const $doc = model.serialize(mergeDeep(doc, removeUndefinedDeep(input)));
      return this.resolver.resolve(query.doc(doc).$doc($doc)).then(() => $doc);
    });
  }

  updateMany(query) {
    const { model, args, transaction } = query.toObject();
    const lookup = query.clone().method('findMany');

    return this.resolver.resolve(lookup).then((docs) => {
      const txn = this.resolver.transaction(transaction);
      docs.forEach(doc => txn.match(model).id(doc._id).save(...args));
      return txn.run();
    });
  }

  delete(query) {
    const { model, flags } = query.toObject();
    const clone = query.clone().method('findOne').flags(Object.assign({}, flags, { required: true }));

    return this.resolver.resolve(clone).then((doc) => {
      if (doc == null) throw Boom.notFound(`${model} Not Found`);
      return this.resolver.resolve(query).then(() => doc);
    });
  }

  pushOne(query) {
    const [key, ...values] = query.args();
    return this.splice(query.args([key, null, values]));
  }

  pushMany(query) {
    const { model, transaction } = query.toObject();
    const lookup = query.clone().method('findMany');
    const [key, ...values] = query.args();

    return this.resolver.resolve(lookup).then((docs) => {
      const txn = this.resolver.transaction(transaction);
      docs.forEach(doc => txn.match(model).id(doc._id).push(key, ...values));
      return txn.run();
    });
  }

  pullOne(query) {
    const [key, ...values] = query.args();
    return this.splice(query.args([key, values]));
  }

  pullMany(query) {
    const { model, transaction } = query.toObject();
    const lookup = query.clone().method('findMany');
    const [key, ...values] = query.args();

    return this.resolver.resolve(lookup).then((docs) => {
      const txn = this.resolver.transaction(transaction);
      docs.forEach(doc => txn.match(model).id(doc._id).pull(key, ...values));
      return txn.run();
    });
  }

  splice(query) {
    const { model, flags, args } = query.toObject();
    const [key, from, to] = args;
    const clone = query.clone().method('findOne').flags(Object.assign({}, flags, { required: true }));

    return this.resolver.resolve(clone).then(async (doc) => {
      if (doc == null) throw Boom.notFound(`${model} Not Found`);
      const data = await QueryService.spliceEmbeddedArray(query, doc, key, from, to);
      await model.validateData(data, doc, 'update');
      const $doc = mergeDeep(doc, removeUndefinedDeep(data));
      return this.resolver.resolve(query.method('updateOne').doc(doc).$doc($doc)).then(() => $doc);
    });
  }

  first(query) {
    return this.findMany(query.method('findMany'));
  }

  last(query) {
    return this.findMany(query.method('findMany'));
  }

  async resolve() {
    const clone = this.query.clone();
    const { model, crud, method, select, match, input, sort, flags, isNative } = this.query.toObject();
    const { required, debug } = flags;
    const fields = model.getSelectFields();
    const fieldNameToKeyMap = fields.reduce((prev, field) => Object.assign(prev, { [field.getName()]: field.getKey() }), {});

    // Select fields
    const $select = unravelObject(select ? Object.keys(select).map(n => fieldNameToKeyMap[n]) : fields.map(f => f.getKey()));
    clone.select($select);

    // Where clause
    if (!isNative) {
      const where = await model.resolveBoundValues(unravelObject(match));
      let $where = await QueryService.resolveQueryWhereClause(this.query.match(where));
      $where = model.normalize($where);
      $where = removeUndefinedDeep($where);
      clone.match($where);
    }

    // Input data
    if (crud === 'create' || crud === 'update') {
      const $input = await mapPromise(input, (obj) => {
        return new Promise(async (resolve) => {
          let result = unravelObject(obj);
          if (crud === 'create') result = await model.appendDefaultValues(result);
          result = await model[`append${ucFirst(crud)}Fields`](result);
          result = model.normalize(result);
          result = model.serialize(result); // This seems to be needed to accept Objects and convert them to ids; however this also makes .save(<empty>) throw an error and I think you should be able to save empty
          result = removeUndefinedDeep(result);
          resolve(result);
        });
      });

      clone.input($input);
    }

    if (sort) {
      clone.sort(Object.entries(sort).reduce((prev, [key, value]) => {
        return Object.assign(prev, { [key]: value === 'asc' ? 1 : -1 });
      }, {}));
    }

    if (debug) console.log(clone.toDriver());

    return this[method](clone).then((data) => {
      if (required && (data == null || isEmpty(data))) throw Boom.notFound(`${model} Not Found`);
      if (data == null) return null;
      const result = typeof data === 'object' ? new QueryResult(this.query, data) : data;
      if (debug) console.log('got result', method, result);
      return result;
    });
  }
};
