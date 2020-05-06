const Node = require('./Node');
const Field = require('./Field');

module.exports = class Model extends Node {
  constructor(schema, ast) {
    super(ast);
    this.schema = schema;
    this.fields = this.ast.fields.map(f => new Field(this, f));
  }

  getSchema() {
    return this.schema;
  }

  getFields() {
    return this.fields;
  }

  getField(name) {
    return this.getFields().find(field => field.getName() === name);
  }

  getFieldNames() {
    return this.getFields().map(field => field.getName());
  }

  getFieldMap() {
    return this.getFields().reduce((prev, field) => Object.assign(prev, { [field.getName()]: field }), {});
  }

  isEntity() {
    return Boolean(this.getDirective('model'));
  }
};
