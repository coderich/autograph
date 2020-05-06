const AbstractDefinition = require('./AbstractDefinition');
const Field = require('./Field');

module.exports = class Model extends AbstractDefinition {
  getFields() {
    return this.ast.fields.map(f => new Field(f));
  }
};
