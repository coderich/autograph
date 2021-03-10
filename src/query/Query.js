const { clone } = require('lodash');

let count = 0;

module.exports = class Query {
  constructor(props) {
    this.timers = {};
    this.queryId = `query${++count}`;
    this.props = props || {};
    this.props.match = this.props.match || {};
    this.props.options = this.props.options || {};
  }

  time(label = 'default') {
    this.timers[label] = { start: new Date().getTime() };
    return this;
  }

  timeEnd(label = 'default') {
    this.timers[label].end = new Date().getTime();
    return this;
  }

  timeReport() {
    const report = Object.entries(this.timers).reduce((prev, [key, value]) => {
      return Object.assign(prev, { [key]: value.end - value.start });
    }, {});

    const toDriver = this.toDriver();

    console.log(JSON.stringify({
      [this.queryId]: {
        details: {
          model: toDriver.model,
          method: toDriver.method,
          where: toDriver.where,
          input: toDriver.input,
          flags: toDriver.flags,
        },
        report,
      },
    }, null, 2));
  }

  id(id) {
    if (id == null) return this.props.id;
    if (this.where() || this.native() || this.sort() || this.skip() || this.limit() || this.before() || this.after() || this.first() || this.last()) throw new Error('Cannot mix id() with where(), native(), sort(), skip(), limit(), before(), after(), first(), or last()');
    this.props.id = id;
    return this.match({ id });
  }

  where(where) {
    if (where == null) return this.props.where;
    if (this.id() || this.native()) throw new Error('Cannot mix where() with id() or native()');
    this.props.where = where;
    return this.match(where);
  }

  native(native) {
    if (native == null) return this.props.native;
    if (this.id() || this.where()) throw new Error('Cannot mix native() with id() or where()');
    this.props.native = native;
    return this.match(native);
  }

  match(match) {
    if (match == null) return this.props.match;
    this.props.match = match;
    return this;
  }

  select(select) {
    if (select == null) return this.props.select;
    this.props.select = select;
    return this;
  }

  sort(sort) {
    if (sort == null) return this.props.sort;
    if (this.id()) throw new Error('Cannot mix sort() with id()');
    this.props.sort = sort;
    return this;
  }

  skip(skip) {
    if (skip == null) return this.props.skip;
    if (this.id()) throw new Error('Cannot mix skip() with id()');
    this.props.skip = skip;
    return this;
  }

  limit(limit) {
    if (limit == null) return this.props.limit;
    if (this.id()) throw new Error('Cannot mix limit() with id()');
    this.props.limit = limit;
    return this;
  }

  before(before) {
    if (before == null) return this.props.before;
    if (this.id()) throw new Error('Cannot mix before() with id()');
    this.props.before = before;
    return this;
  }

  after(after) {
    if (after == null) return this.props.after;
    if (this.id()) throw new Error('Cannot mix after() with id()');
    this.props.after = after;
    return this;
  }

  first(first) {
    if (first == null) return this.props.first;
    if (this.id() || this.last()) throw new Error('Cannot mix first() with id() or last()');
    this.props.first = first;
    return this;
  }

  last(last) {
    if (last == null) return this.props.last;
    if (this.id() || this.first()) throw new Error('Cannot mix last() with id() or first()');
    this.props.last = last;
    return this;
  }

  options(options) {
    if (options == null) return this.props.options;
    this.props.options = options;
    return this;
  }

  meta(meta) {
    if (meta == null) return this.props.meta;
    this.props.meta = meta;
    return this;
  }

  flags(flags) {
    if (flags == null) return this.props.flags;
    this.props.flags = flags;
    return this;
  }

  merge({ select, where }) {
    if (select) this.props.select = select;
    if (where) Object.assign(this.props.match, where);
    return this;
  }

  resolver(resolver) {
    if (resolver == null) return this.props.resolver;
    this.props.resolver = resolver;
    return this;
  }

  model(model) {
    if (model == null) return this.props.model;
    this.props.model = model;
    return this;
  }

  transaction(transaction) {
    if (transaction == null) return this.props.transaction;
    this.props.transaction = transaction;
    return this;
  }

  cmd(cmd) {
    if (cmd == null) return this.props.cmd;
    this.props.cmd = cmd;
    return this;
  }

  method(method) {
    if (method == null) return this.props.method;
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
    if (crud == null) return this.props.crud;
    this.props.crud = crud;
    return this;
  }

  input(input) {
    if (input == null) return this.props.input;
    this.props.input = input;
    return this;
  }

  doc(doc) {
    if (doc == null) return this.props.doc;
    this.props.doc = doc;
    return this;
  }

  $doc($doc) {
    if ($doc == null) return this.props.$doc;
    this.props.$doc = $doc;
    return this;
  }

  args(args) {
    if (args == null) return this.props.args;
    this.props.args = args;
    return this;
  }

  clone() {
    return new Query(clone({ ...this.props }));
  }

  toDriver() {
    return {
      isNative: Boolean(this.native()),
      model: this.model().getKey(),
      schema: this.model().getSelectFields().reduce((prev, field) => Object.assign(prev, { [field.getKey()]: field.getDataType() }), {}),
      method: this.method(),
      select: this.select(),
      where: this.match(),
      sort: this.sort(),
      skip: this.skip(),
      limit: this.limit(),
      before: this.before(),
      after: this.after(),
      first: this.first(),
      last: this.last(),
      options: this.options(),
      input: this.input(),
      flags: this.flags(),
      $doc: this.$doc(),
      doc: this.doc(),
    };
  }

  toObject() {
    return {
      ...this.props,
      isNative: Boolean(this.native()),
      schema: this.model().getSelectFields().reduce((prev, field) => Object.assign(prev, { [field.getKey()]: field.getDataType() }), {}),
    };
  }

  getCacheKey() {
    return {
      model: `${this.model()}`,
      method: this.method(),
      where: this.match(),
      sort: this.sort(),
      skip: this.skip(),
      limit: this.limit(),
      before: this.before(),
      after: this.after(),
      first: this.first(),
      last: this.last(),
      options: this.options(),
    };
  }
};
