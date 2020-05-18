const Node = require('./Node');
const { getTypeInfo } = require('../../service/graphql.service');

const scalars = ['ID', 'String', 'Float', 'Int', 'Boolean'];

module.exports = class Type {
  constructor(ast) {
    this.node = new Node(ast.type);
    this.node.getName = () => getTypeInfo(ast).name;
    this.node.isArray = () => Boolean(getTypeInfo(ast).isArray);
    this.node.isRequired = () => Boolean(getTypeInfo(ast).isRequired);
    this.node.isScalar = () => scalars.indexOf(this.node.getName()) > -1;
    return this.node;
  }

  // getName() {
  //   return getTypeInfo(this.ast).name;
  // }

  // isArray() {
  //   return Boolean(getTypeInfo(this.ast).isArray);
  // }

  // isRequired() {
  //   return Boolean(getTypeInfo(this.ast).isRequired);
  // }

  // isScalar() {
  //   return scalars.indexOf(this.getName()) > -1;
  // }
};
