const Node = require('./Node');
const { getTypeInfo } = require('../../service/graphql.service');

const scalars = ['ID', 'String', 'Float', 'Int', 'Boolean'];

module.exports = class Type extends Node {
  getName() {
    return getTypeInfo(this.ast).name;
  }

  isArray() {
    return Boolean(getTypeInfo(this.ast).isArray);
  }

  isRequired(debug) {
    return Boolean(getTypeInfo(this.ast, {}, false).isRequired);
  }

  isArrayElementRequired() {
    return this.isArray() && Boolean(getTypeInfo(this.ast.type).isRequired);
  }

  isScalar() {
    return scalars.indexOf(this.getName()) > -1;
  }
};
