module.exports = class QueryOperation {
  constructor(model, ...facets) {
    this.model = model;
    this.facets = new Set(facets);
  }

  add(...facets) {
    facets.forEach(this.facets.add, this.facets);
    return this;
  }

  serialize() {
    return {
      model: this.model,
      facets: Array.from(this.facets).map(facet => facet.serialize()),
    };
  }
};
