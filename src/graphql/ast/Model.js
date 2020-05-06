const Node = require('./Node');
const Field = require('./Field');

module.exports = class Model extends Node {
  getFields() {
    return this.ast.fields.map(f => new Field(f));
  }
};
