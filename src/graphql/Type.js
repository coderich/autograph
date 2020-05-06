const { get } = require('lodash');
const { isListType, isNonNullType, getNamedType } = require('graphql');
const { uvl, isScalarDataType } = require('../service/app.service');
const Node = require('./Node');

module.exports = class Type {
  constructor(schema, ast) {
    this.schema = schema;
    this.ast = ast;
    this.directives = get(ast, 'astNode.directives', []).map(directive => new Node(directive));
    this.toString = () => `${this.getName()}`;
  }

  getAST() {
    return this.ast;
  }

  getName() {
    return this.ast.name;
  }

  getAlias(defaultValue) {
    return uvl(this.getDirectiveArg('model', 'alias'), this.getDirectiveArg('field', 'alias'), defaultValue, this.getName());
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

  getOnDelete() {
    return this.getDirectiveArg('field', 'onDelete');
  }

  getDriverName() {
    return this.getDirectiveArg('model', 'driver', 'default');
  }

  getNamespace() {
    return this.getDirectiveArg('model', 'namespace', this.getName());
  }

  getIndexes() {
    return this.getDirectives('index').map(d => d.getArgs());
  }

  getVirtualRef() {
    return this.getDirectiveArg('field', 'materializeBy');
  }

  getModelRef() {
    return this.schema.getModel(this.getDataRef());
  }

  getVirtualField() {
    const model = this.getModelRef();
    return model ? model.getField(this.getVirtualRef()) : null;
  }

  getDirective(name) {
    return this.directives.find(directive => directive.getName() === name);
  }

  getDirectives(...names) {
    return this.directives.filter(directive => names.indexOf(directive.getName()) > -1);
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

  getScope() {
    return this.getDirectiveArg('field', 'scope', this.getDirectiveArg('model', 'scope', 'protected'));
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

  isPrivate() {
    return Boolean(this.getScope() === 'private');
  }

  isImmutable() {
    const enforce = this.getDirectiveArg('field', 'enforce', '');
    return Boolean(JSON.stringify(enforce).indexOf('immutable') > -1);
  }
};
