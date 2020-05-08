const { print } = require('graphql');
const { makeExecutableSchema } = require('graphql-tools');
const { mergeASTSchema, mergeASTArray } = require('../../service/graphql.service');
const Node = require('./Node');
const Model = require('./Model');

module.exports = class Schema extends Node {
  constructor(schema) {
    super(schema.typeDefs);
    this.schema = schema;
    this.models = this.ast.definitions.filter(d => new Node(d).isModel()).map(d => new Model(this, d));
  }

  extend(...schemas) {
    const definitions = schemas.map(schema => mergeASTSchema(schema).definitions);
    this.ast.definitions = mergeASTArray(this.ast.definitions.concat(...definitions));
    this.models = this.ast.definitions.filter(d => new Node(d).isModel()).map(d => new Model(this, d));
  }

  getModel(name) {
    return this.getModels().find(model => model.getName() === name);
  }

  getModels() {
    return this.models;
  }

  getEntityModels() {
    return this.getModels().find(model => model.isEntity());
  }

  getModelNames() {
    return this.getModels().map(model => model.getName());
  }

  getModelMap() {
    return this.getModels().reduce((prev, model) => Object.assign(prev, { [model.getName()]: model }), {});
  }

  makeExecutableSchema() {
    return makeExecutableSchema({ typeDefs: print(this.ast) });
  }
};
