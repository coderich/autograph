const { get } = require('lodash');
const { Kind } = require('graphql');
const { nvl, uvl } = require('../../service/app.service');
const { mergeAST } = require('../../service/graphql.service');

const operations = ['Query', 'Mutation', 'Subscription'];
const modelKinds = [Kind.OBJECT_TYPE_DEFINITION, Kind.OBJECT_TYPE_EXTENSION];
const inputKinds = [Kind.INPUT_OBJECT_TYPE_DEFINITION, Kind.INPUT_OBJECT_TYPE_EXTENSION];
const scalarKinds = [Kind.SCALAR_TYPE_DEFINITION, Kind.SCALAR_TYPE_EXTENSION];
const enumKinds = [Kind.ENUM_TYPE_DEFINITION, Kind.ENUM_TYPE_EXTENSION];

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
      case Kind.OBJECT: {
        return value.fields.reduce((prev, field) => {
          const node = new Node(field);
          return Object.assign(prev, { [node.getName()]: node.getValue() });
        }, {});
      }
      default: {
        if (ast.values) return ast.values.map(v => v.name.value);
        return value.value;
      }
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
  getKey(defaultValue) {
    return uvl(this.getDirectiveArg('model', 'key'), this.getDirectiveArg('field', 'key'), defaultValue, this.getName());
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

  getVirtualRef() {
    return this.getDirectiveArg('field', 'materializeBy');
  }

  getAuthz() {
    return this.getDirectiveArg('field', 'authz', this.getDirectiveArg('model', 'authz', 'private'));
  }

  getMeta() {
    return this.getDirectiveArg('model', 'meta', 'AutoGraphMixed');
  }

  // Booleans
  isModel() {
    return Boolean(modelKinds.some(k => this.getKind() === k) && operations.every(o => this.getName() !== o));
  }

  isInput() {
    return Boolean(inputKinds.some(k => this.getKind() === k));
  }

  isScalar() {
    return Boolean(scalarKinds.some(k => this.getKind() === k));
  }

  isEnum() {
    return Boolean(enumKinds.some(k => this.getKind() === k));
  }

  isBasicType() {
    return this.isScalar() || this.isEnum();
  }

  /**
   * Is the field virtual; does it's value come from another model
   */
  isVirtual() {
    return Boolean(this.getDirectiveArg('field', 'materializeBy'));
  }

  /**
   * Does the model/field have a bound @value directive
   */
  hasBoundValue() {
    return Boolean(this.getDirective('value'));
  }

  /**
   * Is a model annotated with @model
   */
  isMarkedModel() {
    return Boolean(this.getDirective('model'));
  }

  /**
   * Is the model ready, willing, and able to communicate with external data
   */
  isEntity() {
    return Boolean(this.getDALScope() !== '' && !this.isEmbedded());
  }

  /**
   * Can this be persisted to the db
   */
  isPersistable() {
    return uvl(this.getDirectiveArg('field', 'persist'), this.getDirectiveArg('model', 'persist'), true);
  }

  /**
   * Can this be fully resolved
   */
  isResolvable() {
    if (this.isBasicType()) return true;

    switch (this.nodeType) {
      case 'model': return this.getDALScope().length > 0;
      case 'field': return this.getModelRef().isResolvable();
      default: return false;
    }
  }

  /**
   * Is this embedded in another document
   */
  isEmbedded() {
    switch (this.nodeType) {
      case 'model': return Boolean(this.getDirectiveArg('model', 'embed'));
      case 'field': {
        const model = this.getModelRef();
        return Boolean(model && !model.isEntity());
      }
      default: return false;
    }
  }

  /**
   * Can the field be changed after it's set
   */
  isImmutable() {
    const enforce = this.getDirectiveArg('field', 'enforce', '');
    return Boolean(JSON.stringify(enforce).indexOf('immutable') > -1);
  }

  /**
   * Define it's behavior at the Data Access Layer
   *
   * Model + Field:
   *  C: Can be created (Resolver should throw. NOT the same meaning as persisted)
   *  R: Can be read (if not must be stripped out)
   *  U: Can be updated (if not must be stripped out)
   *  D: Can be deleted (if not must be stripped out)
   */
  getDALScope() {
    switch (this.nodeType) {
      case 'model': {
        if (!this.isMarkedModel()) return '';
        return nvl(uvl(this.getDirectiveArg('model', 'dalScope'), 'crud'), '');
      }
      case 'field': return nvl(uvl(this.getDirectiveArg('field', 'dalScope'), 'crud'), '');
      default: return '';
    }
  }

  hasDALScope(el) {
    return Boolean(this.getDALScope().toLowerCase().indexOf(el.toLowerCase()) > -1);
  }

  /**
   * Define it's behavior in the GraphQL API
   *
   * Model:
   *  C: Generate createModel Mutation
   *  R: Generate get|find|count Queries
   *  U: Generate updateModel Mutation
   *  D: Generate deleteModel Mutation
   * Field:
   *  C: Include this field in InputCreate
   *  R: Include my value in the results (strip it out beforehand)
   *  U: Include this field in InputUpdate
   *  D: Allow the API to delete (null out)
   */
  getGQLScope() {
    switch (this.nodeType) {
      case 'model': {
        if (!this.isMarkedModel()) return '';
        return nvl(uvl(this.getDirectiveArg('model', 'gqlScope'), 'crud'), '');
      }
      case 'field': return nvl(uvl(this.getDirectiveArg('field', 'gqlScope'), 'crud'), '');
      default: return '';
    }
  }

  hasGQLScope(el) {
    if (this.nodeType === 'field') {
      const model = this.getModelRef();
      if (model && !model.hasFieldScope(el)) return false;
    }

    return Boolean(this.getGQLScope().toLowerCase().indexOf(el.toLowerCase()) > -1);
  }

  getFieldScope() {
    return nvl(uvl(this.getDirectiveArg('model', 'fieldScope'), 'crud'), '');
  }

  hasFieldScope(el) {
    return Boolean(this.getFieldScope().toLowerCase().indexOf(el.toLowerCase()) > -1);
  }

  // Create
  isCreatable() {
    return Boolean(this.getDALScope().toLowerCase().indexOf('c') > -1);
  }

  isGQLCreatable() {
    if (!this.isCreatable()) return false;

    switch (this.nodeType) {
      case 'model': return Boolean(this.getGQLScope().toLowerCase().indexOf('c') > -1);
      case 'field': return Boolean(this.getGQLScope().toLowerCase().indexOf('c') > -1);
      default: return false;
    }
  }

  // Read
  isReadable() {
    return Boolean(this.getDALScope().toLowerCase().indexOf('r') > -1);
  }

  isGQLReadable() {
    if (!this.isReadable()) return false;

    switch (this.nodeType) {
      case 'model': return Boolean(this.getGQLScope().toLowerCase().indexOf('r') > -1);
      case 'field': return Boolean(this.getGQLScope().toLowerCase().indexOf('r') > -1);
      default: return false;
    }
  }

  // Update
  isUpdatable() {
    return Boolean(this.getDALScope().toLowerCase().indexOf('u') > -1);
  }

  isGQLUpdatable() {
    if (!this.isUpdatable()) return false;

    switch (this.nodeType) {
      case 'model': return Boolean(this.getGQLScope().toLowerCase().indexOf('u') > -1);
      case 'field': return Boolean(this.getGQLScope().toLowerCase().indexOf('u') > -1);
      default: return false;
    }
  }

  // Delete
  isDeletable() {
    return Boolean(this.getDALScope().toLowerCase().indexOf('d') > -1);
  }

  isGQLDeletable() {
    if (!this.isDeletable()) return false;

    switch (this.nodeType) {
      case 'model': return Boolean(this.getGQLScope().toLowerCase().indexOf('d') > -1);
      case 'field': return Boolean(this.getGQLScope().toLowerCase().indexOf('d') > -1);
      default: return false;
    }
  }

  // Subscribe
  isSubscribable() {
    return Boolean(this.isCreatable() || this.isUpdatable() || this.isDeletable());
  }

  isGQLSubscribable() {
    if (!this.isSubscribable()) return false;
    return Boolean(this.isGQLCreatable() || this.isGQLUpdatable() || this.isGQLDeletable());
  }
};
