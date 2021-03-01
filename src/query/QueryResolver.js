module.exports = class QueryResolver {
  constructor(resolver, ...queries) {
    this.resolver = resolver;
    this.set = new Set(queries);
  }

  push(...queries) {
    queries.forEach(this.set.add, this.set);
    return this;
  }

  pull(...queries) {
    queries.forEach(this.set.delete, this.set);
    return this;
  }

  resolve() {
    this.set.forEach((query) => {
      return this.resolver.load(query);
    });
  }
};
