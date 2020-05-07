const Type = require('./Type');

module.exports = class Field extends Type {
  constructor(schema, model, type) {
    super(schema, type);
    this.model = model;
  }

  getModel() {
    return this.model;
  }
};
