module.exports = class QueryFacet {
  constructor(method, definition) {
    this.method = method;
    this.definition = definition;
  }

  setDefinition(definition) {
    this.definition = definition;
    return this;
  }

  getDefinition() {
    return this.getDefinition();
  }

  mergeDefinition(definition) {
    Object.assign(this.definition, definition);
    return this;
  }

  serialize() {
    const { query, input, doc, pipeline } = this.definition;

    return {
      method: this.method,
      [this.method]: {
        query: query.serialize(),
        doc,
        input,
        pipeline,
      },
    };
  }
};
