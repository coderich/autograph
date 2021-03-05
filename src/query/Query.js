const { clone } = require('lodash');

module.exports = class Query {
  constructor(props) {
    this.props = props || {};
    this.props.match = this.props.match || {};
  }

  id(id) {
    if (id == null) return this.props.id;
    if (this.where() || this.native() || this.sortBy() || this.limit() || this.skip() || this.before() || this.after() || this.first() || this.last()) throw new Error('Cannot mix id() with where(), native(), sortBy(), limit(), skip(), before(), after(), first(), or last()');
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

  sortBy(sortBy) {
    if (sortBy == null) return this.props.sortBy;
    if (this.id()) throw new Error('Cannot mix sortBy() with id()');
    this.props.sortBy = sortBy;
    return this;
  }

  limit(limit) {
    if (limit == null) return this.props.limit;
    if (this.id()) throw new Error('Cannot mix limit() with id()');
    this.props.limit = limit;
    return this;
  }

  skip(skip) {
    if (skip == null) return this.props.skip;
    if (this.id()) throw new Error('Cannot mix skip() with id()');
    this.props.skip = skip;
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

  method(method) {
    if (method == null) return this.props.method;
    this.props.method = method;
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
    return new Query(clone(this.props));
  }

  toDriver() {
    return {
      model: this.model().getKey(),
      method: this.method(),
      // schema: fields.reduce((prev, field) => Object.assign(prev, { [field.getKey()]: field.getType() }), {}),
      select: this.select(),
      where: this.match(),
      input: this.input(),
      flags: this.flags(),
      $doc: this.$doc(),
      doc: this.doc(),
    };
  }

  toObject() {
    return this.props;
  }

  getCacheKey() {
    return {
      model: `${this.model()}`,
      method: this.method(),
      where: this.match(),
      limit: this.limit(),
      sortBy: this.sortBy(),
    };
  }
};
