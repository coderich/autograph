const { Kind } = require('graphql');

module.exports = class Node {
  constructor(ast) {
    this.ast = ast;
  }

  getKind() {
    return this.ast.kind;
  }

  getName() {
    return this.ast.name.value;
  }

  getValue(ast = this.ast) {
    const { value = {} } = ast;

    switch (value.kind) {
      case Kind.NULL: return null;
      case Kind.LIST: return value.values.map(el => this.getValue({ value: el }));
      case Kind.OBJECT: {
        return value.fields.reduce((prev, field) => {
          const node = new Node(field);
          return Object.assign(prev, { [node.getName()]: node.getValue() });
        }, {});
      }
      default: {
        if (ast.values) return ast.values.map(v => v.name.value);
        return value.value;
      }
    }
  }
};
