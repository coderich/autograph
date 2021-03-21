const { unravelObject } = require('../service/app.service');

module.exports = class Query {
  constructor(props = {}) {
    this.props = {};
    this.timers = {};
    this.merge(props);
    this.props.match = this.props.match || {};
    this.props.options = this.props.options || {};
  }

  id(id) {
    if (this.props.where || this.props.native || this.props.sort || this.props.skip || this.props.limit || this.props.before || this.props.after || this.props.first || this.props.last) throw new Error('Cannot mix id() with where(), native(), sort(), skip(), limit(), before(), after(), first(), or last()');
    this.props.id = id;
    return this.match({ id });
  }

  where(where) {
    if (this.props.id || this.props.native) throw new Error('Cannot mix where() with id() or native()');
    this.props.where = unravelObject(where);
    return this.match(where);
  }

  native(native) {
    if (this.props.id || this.props.where) throw new Error('Cannot mix native() with id() or where()');
    this.props.native = native;
    return this.match(native);
  }

  match(match) {
    this.props.match = unravelObject(match);
    return this;
  }

  select(select) {
    this.props.select = unravelObject(select);
    return this;
  }

  $select(select) {
    this.props.$select = select;
    return this;
  }

  fields(fields) {
    this.props.select = fields;
    return this;
  }

  sort(sort) {
    if (this.props.id) throw new Error('Cannot mix sort() with id()');
    this.props.sort = unravelObject(sort);
    return this;
  }

  $sort(sort) {
    this.props.$sort = sort;
    return this;
  }

  sortBy(sort) {
    return this.sort(sort);
  }

  skip(skip) {
    if (this.props.id) throw new Error('Cannot mix skip() with id()');
    this.props.skip = skip;
    return this;
  }

  limit(limit) {
    if (this.props.id) throw new Error('Cannot mix limit() with id()');
    this.props.limit = limit;
    return this;
  }

  before(before) {
    if (this.props.id) throw new Error('Cannot mix before() with id()');
    this.props.before = JSON.parse(Buffer.from(before, 'base64').toString('ascii'));
    return this;
  }

  after(after) {
    if (this.props.id) throw new Error('Cannot mix after() with id()');
    this.props.after = JSON.parse(Buffer.from(after, 'base64').toString('ascii'));;
    return this;
  }

  first(first) {
    if (this.props.id || this.props.last) throw new Error('Cannot mix first() with id() or last()');
    this.props.first = first;
    return this;
  }

  last(last) {
    if (this.props.id || this.props.first) throw new Error('Cannot mix last() with id() or first()');
    this.props.last = last;
    return this;
  }

  options(options) {
    this.props.options = options;
    return this;
  }

  meta(meta) {
    this.props.meta = meta;
    return this;
  }

  flags(flags) {
    this.props.flags = flags;
    return this;
  }

  merge(query) {
    Object.entries(query).forEach(([key, value]) => {
      try {
        this[key](value);
      } catch (e) {
        console.log(key, e.message);
      }
    });
    // Object.assign(this.props, query);
    // if (select) this.props.select = select;
    // if (where) Object.assign(this.props.match, where);
    return this;
  }

  resolver(resolver) {
    this.props.resolver = resolver;
    return this;
  }

  model(model) {
    this.props.model = model;
    return this;
  }

  transaction(transaction) {
    this.props.transaction = transaction;
    return this;
  }

  cmd(cmd) {
    this.props.cmd = cmd;
    return this;
  }

  method(method) {
    this.props.method = method;

    switch (method) {
      case 'createOne': case 'createMany': {
        this.props.crud = 'create';
        break;
      }
      case 'updateOne': case 'updateMany': {
        this.props.crud = 'update';
        break;
      }
      case 'deleteOne': case 'deleteMay': case 'removeOne': case 'removeMany': {
        this.props.crud = 'delete';
        break;
      }
      default: {
        this.props.crud = 'read';
        break;
      }
    }

    return this;
  }

  crud(crud) {
    this.props.crud = crud;
    return this;
  }

  input(input = {}) { // Allows .save(/* empty */);
    this.props.input = input;
    return this;
  }

  $input(input) {
    this.props.$input = input;
    return this;
  }

  doc(doc) {
    this.props.doc = doc;
    return this;
  }

  merged(merged) {
    this.props.merged = merged;
    return this;
  }

  $doc($doc) {
    this.props.$doc = $doc;
    return this;
  }

  args(args) {
    this.props.args = args;
    return this;
  }

  clone() {
    return new Query({ ...this.props });
  }

  toDriver() {
    return {
      isNative: Boolean(this.props.native),
      model: this.props.model.getKey(),
      schema: Query.getSchema(this.props.model),
      method: this.props.method,
      select: this.props.$select,
      where: this.props.match,
      sort: this.props.$sort,
      skip: this.props.skip,
      limit: this.props.limit,
      before: this.props.before,
      after: this.props.after,
      first: this.props.first,
      last: this.props.last,
      options: this.props.options,
      input: this.props.$input,
      flags: this.props.flags,
      $doc: this.props.$doc,
      doc: this.props.doc,
    };
  }

  toObject() {
    return {
      ...this.props,
      isNative: Boolean(this.props.native),
    };
  }

  getCacheKey() {
    return {
      model: `${this.props.model}`,
      method: this.props.method,
      where: this.props.match,
      sort: this.props.sort,
      skip: this.props.skip,
      limit: this.props.limit,
      before: this.props.before,
      after: this.props.after,
      first: this.props.first,
      last: this.props.last,
      options: this.props.options,
    };
  }

  static getSchema(model, name = false) {
    return model.getSelectFields().reduce((prev, field) => {
      const key = name ? field.getName() : field.getKey();
      // const modelRef = field.getModelRef();
      // const isEmbedded = field.isEmbedded();

      return Object.assign(prev, {
        [key]: {
          field,
          alias: name ? field.getKey() : field.getName(),
          type: field.getDataType(),
          isArray: field.isArray(),
          // schema: isEmbedded ? Query.getSchema(modelRef, name) : null,
        },
      });
    }, {});
  }
};
