const Node = require('./Node');
const Type = require('./Type');

module.exports = class Field extends Node {
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
    return this.ast.arguments.map(a => new Node(a));
  }
};
