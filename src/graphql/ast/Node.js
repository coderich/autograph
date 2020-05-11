const { get } = require('lodash');
const { Kind } = require('graphql');
const { uvl } = require('../../service/app.service');
const { mergeAST } = require('../../service/graphql.service');

const operations = ['Query', 'Mutation', 'Subscription'];
const modelKinds = [Kind.OBJECT_TYPE_DEFINITION, Kind.OBJECT_TYPE_EXTENSION];

module.exports = class Node {
  constructor(astLike) {
    this.ast = mergeAST(astLike);
    this.arguments = (this.ast.arguments || []).map(el => new Node(el));
    this.directives = (this.ast.directives || []).map(el => new Node(el));
    this.toString = () => this.getName();
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

  getArguments() {
    return this.arguments;
  }

  getArgument(name) {
    return this.getArguments().find(arg => arg.getName() === name);
  }

  // Framework Methods
  getAlias(defaultValue) {
    return uvl(this.getDirectiveArg('model', 'alias'), this.getDirectiveArg('field', 'alias'), defaultValue, this.getName());
  }

  getDefaultValue(context = {}) {
    return uvl(this.getSegmentValue(context), this.getDirectiveArg('field', 'default'));
  }

  getSegmentValue(context = {}) {
    return get(context, `segment.${this.getSegment()}`);
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

  getSegment() {
    return this.getDirectiveArg('field', 'segment');
  }

  getIndexes() {
    return this.getDirectives('index').map(d => d.getArgs());
  }

  getVirtualRef() {
    return this.getDirectiveArg('field', 'materializeBy');
  }

  getScope() {
    return this.getDirectiveArg('field', 'scope', this.getDirectiveArg('model', 'scope', 'protected'));
  }

  getMeta() {
    return this.getDirectiveArg('model', 'meta');
  }

  isPrivate() {
    return Boolean(this.getScope() === 'private');
  }

  isEntity() {
    return Boolean(this.getDirective('model'));
  }

  isVirtual() {
    return Boolean(this.getDirectiveArg('field', 'materializeBy'));
  }

  isImmutable() {
    const enforce = this.getDirectiveArg('field', 'enforce', '');
    return Boolean(JSON.stringify(enforce).indexOf('immutable') > -1);
  }

  isModel() {
    return Boolean(modelKinds.some(k => this.getKind() === k) && operations.every(o => this.getName() !== o));
  }
};
