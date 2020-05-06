const { Kind } = require('graphql');
const AbstractSourceTree = require('./AbstractSourceTree');

const scalars = ['ID', 'String', 'Float', 'Int', 'Boolean'];

module.exports = class Type extends AbstractSourceTree {
  getName() {
    const { type = this.ast } = this.ast;
    return new AbstractSourceTree(type).getName();
  }

  isArray() {
    return this.getKind() === Kind.LIST_TYPE;
  }

  isScalar() {
    console.log(this.ast);
    return this.getKind() === Kind.SCALAR_TYPE_DEFINITION || scalars.indexOf(this.getName()) > -1;
  }

  isRequired() {
    return this.getKind() === Kind.NON_NULL_TYPE;
  }

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
