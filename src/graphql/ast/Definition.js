const Node = require('./Node');
const Directive = require('./Directive');

module.exports = class Definition extends Node {
  getDirectives() {
    const { directives = [] } = this.ast;
    return directives.map(d => new Directive(d));
  }
};
