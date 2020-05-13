const Merge = require('deepmerge');
const { makeExecutableSchema } = require('graphql-tools');
const { mergeASTSchema, mergeASTArray } = require('../../service/graphql.service');
const Node = require('./Node');
const Model = require('./Model');

module.exports = class Schema extends Node {
  constructor(schema) {
    // Ensure schema
    schema.resolvers = schema.resolvers || {};
    schema.schemaDirectives = schema.schemaDirectives || {};

    //
    super(schema.typeDefs);
    this.schema = schema;
    this.createMyModels();
  }

  createMyModels() {
    this.models = this.ast.definitions.filter(d => new Node(d).isModel()).map(d => new Model(this, d));
  }

  getSchema() {
    const definitions = this.ast.definitions.filter(d => !new Node(d).isPrivate());
    const ast = Object.assign({}, this.ast, { definitions });
    return Object.assign({}, this.schema, { typeDefs: ast });
  }

  getModel(name) {
    return this.getModels().find(model => model.getName() === name || model.getAlias() === name);
  }

  getModels() {
    return this.models;
  }

  getEntityModels() {
    return this.getModels().filter(model => model.isEntity() && model.getScope() !== 'none');
  }

  getReadableModels() {
    return this.getEntityModels().filter(model => model.isReadable());
  }

  getWritableModels() {
    return this.getEntityModels().filter(model => model.isWritable());
  }

  getModelNames() {
    return this.getModels().map(model => model.getName());
  }

  getModelMap() {
    return this.getModels().reduce((prev, model) => Object.assign(prev, { [model.getName()]: model }), {});
  }

  extend(...schemas) {
    const definitions = schemas.map(schema => mergeASTSchema(schema.typeDefs).definitions);
    this.ast.definitions = mergeASTArray(this.ast.definitions.concat(...definitions));
    this.schema.resolvers = schemas.reduce((prev, schema) => Merge(prev, schema.resolvers || {}), this.schema.resolvers);
    this.createMyModels();
    return this;
  }

  makeExecutableSchema() {
    return makeExecutableSchema(this.getSchema());
  }
};
