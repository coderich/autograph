const { get } = require('lodash');
const { Kind } = require('graphql');
const { uvl } = require('../../service/app.service');

module.exports = class Node {
  constructor(ast) {
    this.ast = ast;
    this.directives = (ast.directives || []).map(el => new Node(el));
    this.arguments = (ast.arguments || []).map(el => new Node(el));
  }

  // Basic AST Methods
  getAST() {
    return this.ast;
  }

  getKind() {
    return this.ast.kind;
  }

  getName() {
    return get(this.ast, 'name.value');
  }

  getValue(ast = this.ast) {
    const { value = {} } = ast;

    if (!value) return undefined;

    switch (value.kind) {
      case Kind.NULL: return null;
      case Kind.LIST: return value.values.map(el => this.getValue({ value: el }));
      default: return value.value;
    }
  }

  getDescription() {
    return get(this.ast, 'description.value');
  }

  // Directive Methods
  getDirectives(...names) {
    return this.directives.filter(directive => names.indexOf(directive.getName()) > -1);
  }

  getDirective(name) {
    return this.directives.find(directive => directive.getName() === name);
  }

  getDirectiveArg(name, arg, defaultValue) {
    const directive = this.getDirective(name);
    if (!directive) return defaultValue;
    return uvl(directive.getArg(arg), defaultValue);
  }

  getDirectiveArgs(name, defaultValue) {
    const directive = this.getDirective(name);
    if (!directive) return defaultValue;
    return directive.getArgs();
  }

  // Argument Methods
  getArgs() {
    return this.arguments.reduce((prev, arg) => {
      return Object.assign(prev, { [arg.getName()]: arg.getValue() });
    }, {});
  }

  getArg(arg) {
    return this.getArgs()[arg];
  }

  // Framework Methods
  getScope() {
    return this.getDirectiveArg('field', 'scope', this.getDirectiveArg('model', 'scope', 'protected'));
  }

  isPrivate() {
    return Boolean(this.getScope() === 'private');
  }
};
