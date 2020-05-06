const AbstractDefinition = require('./AbstractDefinition');
const Type = require('./Type');

module.exports = class Field extends AbstractDefinition {
  constructor(ast) {
    super(ast);
    this.type = new Type(this.ast.type);
    this.isArray = this.type.isArray.bind(this.type);
    this.isScalar = this.type.isScalar.bind(this.type);
  }

  getType() {
    return this.type.getName();
  }

  getArguments() {
    return this.ast.arguments.map(a => new AbstractDefinition(a));
  }
};
