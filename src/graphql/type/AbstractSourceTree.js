module.exports = class AbstractSourceTree {
  constructor(ast) {
    this.ast = ast;
  }

  getAST() {
    return this.ast;
  }

  getKind() {
    return this.ast.kind;
  }

  getName() {
    const { name = {} } = this.ast;
    return name.value;
  }
};
