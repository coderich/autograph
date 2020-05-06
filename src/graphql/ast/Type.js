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

  // isVirtual() {
  //   return Boolean(this.getDirectiveArg('field', 'materializeBy'));
  // }

  // isImmutable() {
  //   const enforce = this.getDirectiveArg('field', 'enforce', '');
  //   return Boolean(JSON.stringify(enforce).indexOf('immutable') > -1);
  // }

  // getDataType() {
  //   const type = this.getType();
  //   if (!this.isArray()) return type;
  //   return [type];
  // }

  // getDataRef() {
  //   const ref = this.getType();
  //   return isScalarDataType(ref) ? null : ref;
  // }
};
