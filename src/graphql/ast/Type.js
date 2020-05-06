const { Kind } = require('graphql');
const Node = require('./Node');

const scalars = ['ID', 'String', 'Float', 'Int', 'Boolean'];

module.exports = class Type extends Node {
  getName() {
    const { type = this.ast } = this.ast;
    return new Node(type).getName();
  }

  isArray() {
    return this.getKind() === Kind.LIST_TYPE;
  }

  isScalar() {
    return scalars.indexOf(this.getName()) > -1;
  }

  isRequired() {
    return this.getKind() === Kind.NON_NULL_TYPE;
  }
};
