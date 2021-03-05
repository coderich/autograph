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

  create(query) {
    const { input } = query.toObject();
    return this.resolver.resolve(query).then(id => Object.assign(input, { id }));
  }

  update(query) {
    const { model, id, where, input } = query.toObject();

    // if (id) {
      return this.resolver.resolve(query.clone().method('get')).then((doc) => {
        if (doc == null) throw Boom.notFound(`${model} Not Found`);
        const $doc = model.serialize(mergeDeep(doc, removeUndefinedDeep(input)));
        return this.resolver.resolve(query.doc(doc).$doc($doc)).then(() => $doc);
      });
    // }
  }

  // delete(query) {

  // }

  async resolve() {
    const clone = this.query.clone();
    const { model, crud, method, flags } = this.query.toObject();
    const { required, debug } = flags;
    const fields = model.getSelectFields();
    const fieldNameToKeyMap = fields.reduce((prev, field) => Object.assign(prev, { [field.getName()]: field.getKey() }), {});
    // const normalize = data => Object.entries(data).reduce((prev, [name, value]) => Object.assign(prev, { [fieldNameToKeyMap[name]]: value }), {});

    // Select fields
    const $select = unravelObject(this.query.select() ? Object.keys(this.query.select()).map(n => fieldNameToKeyMap[n]) : fields.map(f => f.getKey()));
    clone.select($select);

    // Where clause
    const where = await model.resolveBoundValues(unravelObject(this.query.match()));
    let $where = await QueryService.resolveQueryWhereClause(this.query.match(where));
    $where = model.normalize($where);
    $where = removeUndefinedDeep($where);
    clone.match($where);

    // Input data
    let $input = {};
    if (crud === 'create' || crud === 'update') {
      $input = unravelObject(this.query.input());
      if (crud === 'create') $input = await model.appendDefaultValues($input);
      $input = await model[`append${ucFirst(crud)}Fields`]($input);
      $input = model.normalize($input);
      // $input = removeUndefinedDeep($input);
      clone.input($input);
    }

    return this[method](clone).then((data) => {
      if (required && (data == null || isEmpty(data))) throw Boom.notFound(`${model} Not Found`);
      if (debug) console.log('got result', data);
      if (data == null) return null;
      return typeof data === 'object' ? new QueryResult(this.query, data) : data;
    });
  }
};
