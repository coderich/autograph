const { isListType, isNonNullType, getNamedType } = require('graphql');
const { uvl, isScalarDataType } = require('../service/app.service');
const Directive = require('./Directive');

module.exports = class Type {
  constructor(ast) {
    this.ast = ast;
    this.directives = this.ast.astNode.directives.map(directive => new Directive(directive));
    this.toString = () => `${this.getName()}`;
  }

  getName() {
    return this.ast.name;
  }

  getType() {
    return `${getNamedType(this.ast.type)}`;
  }

  getDataType() {
    const type = this.getType();
    if (!this.isArray()) return type;
    return [type];
  }

  getDataRef() {
    const ref = this.getType();
    return isScalarDataType(ref) ? null : ref;
  }

  getAlias(defaultValue) {
    return uvl(this.getDirectiveArg('model', 'alias'), this.getDirectiveArg('field', 'alias'), defaultValue, this.getName());
  }

  getVirtualRef() {
    return this.getDirectiveArg('field', 'materializeBy');
  }

  // getModelRef() {
  //   return this.schema.getModels()[this.getDataRef()];
  // }

  // getVirtualModel() {
  //   return this.schema.getModels()[this.getType()];
  // }

  getVirtualField() {
    const vModel = this.getVirtualModel();
    if (vModel) return vModel.getField(this.getVirtualRef());
    return null;
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

  resolveField() {
    const vField = this.getVirtualField() || this;
    if (vField !== this) return vField.resolveField();
    return this;
  }

  isArray() {
    return isListType(this.ast.type);
  }

  isScalar() {
    return isScalarDataType(this.getType());
  }

  isRequired() {
    return isNonNullType(this.ast.type);
  }

  isEntity() {
    return Boolean(this.getDirective('model'));
  }

  isEmbedded() {
    const model = this.getModelRef();
    return Boolean(model && !model.isEntity());
  }

  isVirtual() {
    return Boolean(this.getDirectiveArg('field', 'materializeBy'));
  }
};
