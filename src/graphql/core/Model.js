const { Kind, visit } = require('graphql');
const Field = require('./Field');
const Node = require('./Node');

module.exports = class Model extends Node {
  constructor(ast) {
    super(ast);
    this.fields = {};
    if (ast) this.appendAST(ast);
  }

  appendAST(ast) {
    visit(ast, {
      [Kind.FIELD_DEFINITION]: (node) => {
        const name = node.name.value;
        if (this.fields[name]) this.fields[name].appendAST(node);
        else this.fields[name] = new Field(node);
      },
    });

    return this;
  }
};
