const { isEmpty } = require('lodash');
const Boom = require('../core/Boom');
const QueryService = require('./QueryService');
const QueryResult = require('./QueryResult');
const { ucFirst, unravelObject, mergeDeep, removeUndefinedDeep } = require('../service/app.service');

module.exports = class QueryResolver {
  constructor(query) {
    this.query = query;
    this.resolver = query.resolver();
  }

  get(query) {
    const { model, flags } = query.toObject();

    return this.resolver.resolve(query).then((doc) => {
      if (flags.required && doc == null) throw Boom.notFound(`${model} Not Found`);
      return doc;
    });
  }

  find(query) {
    const { model, flags } = query.toObject();

    return this.resolver.resolve(query).then((docs) => {
      if (flags.required && isEmpty(docs)) throw Boom.notFound(`${model} Not Found`);
      return docs;
    });
  }

  count(query) {
    return this.resolver.resolve(query);
  }

  async create(query) {
    const { model, input } = query.toObject();
    await model.validateData({ ...input }, {}, 'create');
    return this.resolver.resolve(query).then(id => Object.assign(input, { id }));
  }

  update(query) {
    const { model, id, input, flags } = query.toObject();
    if (!id) return this.updateMany(query);
    const clone = query.clone().method('get').flags(Object.assign({}, flags, { required: true }));

    return this.resolver.resolve(clone).then(async (doc) => {
      if (doc == null) throw Boom.notFound(`${model} Not Found`);
      await model.validateData(input, doc, 'update');
      const $doc = model.serialize(mergeDeep(doc, removeUndefinedDeep(input)));
      return this.resolver.resolve(query.doc(doc).$doc($doc)).then(() => $doc);
    });
  }

  updateMany(query) {
    const { model, input, transaction } = query.toObject();
    const lookup = query.clone().method('find');

    return this.resolver.resolve(lookup).then((docs) => {
      const txn = this.resolver.transaction(transaction);
      docs.forEach(doc => txn.match(model).id(doc._id).save(input));
      return txn.run();
    });
  }

  delete(query) {
    const { model, flags } = query.toObject();
    const clone = query.clone().method('get').flags(Object.assign({}, flags, { required: true }));

    return this.resolver.resolve(clone).then((doc) => {
      if (doc == null) throw Boom.notFound(`${model} Not Found`);
      return this.resolver.resolve(query).then(() => doc);
    });
  }

  push(query) {
    const [key, ...values] = query.args();
    return this.splice(query.args([key, null, values]));
  }

  pull(query) {
    const [key, ...values] = query.args();
    return this.splice(query.args([key, values]));
  }

  splice(query) {
    const { model, flags, args } = query.toObject();
    const [key, from, to] = args;
    const clone = query.clone().method('get').flags(Object.assign({}, flags, { required: true }));

    return this.resolver.resolve(clone).then(async (doc) => {
      if (doc == null) throw Boom.notFound(`${model} Not Found`);
      const data = await QueryService.spliceEmbeddedArray(query, doc, key, from, to);
      await model.validateData(data, doc, 'update');
      const $doc = mergeDeep(doc, removeUndefinedDeep(data));
      return this.resolver.resolve(query.method('update').doc(doc).$doc($doc)).then(() => $doc);
    });
  }

  first(query) {
    return this.find(query.method('find'));
  }

  last(query) {
    return this.find(query.method('find'));
  }

  async resolve() {
    const clone = this.query.clone();
    const { model, crud, method, select, match, input, sort, flags, isNative } = this.query.toObject();
    const { required, debug } = flags;
    const fields = model.getSelectFields();
    const fieldNameToKeyMap = fields.reduce((prev, field) => Object.assign(prev, { [field.getName()]: field.getKey() }), {});
    // const normalize = data => Object.entries(data).reduce((prev, [name, value]) => Object.assign(prev, { [fieldNameToKeyMap[name]]: value }), {});

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
      let $input = unravelObject(input);
      if (crud === 'create') $input = await model.appendDefaultValues($input);
      $input = await model[`append${ucFirst(crud)}Fields`]($input);
      $input = model.normalize($input);
      $input = model.serialize($input); // This seems to be needed to accept Objects and convert them to ids; however this also makes .save(<empty>) throw an error and I think you should be able to save empty
      $input = removeUndefinedDeep($input);
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
