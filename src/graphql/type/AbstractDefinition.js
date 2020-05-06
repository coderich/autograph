const AbstractSourceTree = require('./AbstractSourceTree');
const Directive = require('./Directive');

module.exports = class AbstractDefinition extends AbstractSourceTree {
  getDirectives() {
    const { directives = [] } = this.ast;
    return directives.map(d => new Directive(d));
  }
};
