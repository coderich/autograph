class QueryBuilder {
  constructor(loader, method, model, ...args) {
    this.loader = loader;
    this.method = method;
    this.model = model;
    this.args = args;
  }

  query(query) {
    return Object.assign(this, query);
  }

  select(f) {
    this.f = f; return this;
  }

  where(w) {
    this.w = w; return this;
  }

  limit(l) {
    this.l = l; return this;
  }

  exec() {
    const { method, model, query, args } = this.toObject();
    return this.loader.load({ method, model, query, args });
  }

  toObject() {
    return {
      args: this.args,
      loader: this.loader,
      method: this.method,
      model: this.model,
      query: {
        fields: this.f,
        where: this.w,
        sortBy: this.s,
        pagination: this.p,
        limit: this.l,
      },
    };
  }
}

class FullQueryBuilder extends QueryBuilder {
  sort(s) {
    this.s = s; return this;
  }

  page(p) {
    this.p = p; return this;
  }
}

module.exports = { QueryBuilder, FullQueryBuilder };
