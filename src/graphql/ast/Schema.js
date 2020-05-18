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
    this.initialize();
  }

  initialize() {
    const definitions = this.ast.definitions.map(d => new Node(d));
    this.models = definitions.filter(d => d.isModel()).map(d => new Model(this, d.getAST()));
    this.inputs = definitions.filter(d => d.isInput()).map(d => new Model(this, d.getAST()));
    this.scalars = definitions.filter(d => d.isScalar());
    this.enums = definitions.filter(d => d.isEnum());
  }

  getSchema() {
    // Filter out private models/fields from our API
    // const definitions = this.ast.definitions.filter((d) => {
    //   const node = new Node(d);
    //   return !node.isModel() || !node.isPrivate();
    // })

    const definitions = this.ast.definitions.map((definition) => {
      definition.fields = (definition.fields || []).filter((f) => {
        const node = new Node(f);
        return !node.isPrivate();
      });

      return definition;
    });

    const ast = Object.assign({}, this.ast, { definitions });
    return Object.assign({}, this.schema, { typeDefs: ast });
  }

  getModel(name) {
    let model = this.getModels().find(m => m.getName() === name);
    if (!model) model = this.getModels().find(m => m.getAlias() === name);
    return model;
  }

  getModels() {
    return this.models;
  }

  getInput(name) {
    return this.getInputs().find(input => input.getName() === name);
  }

  getInputs() {
    return this.inputs;
  }

  getScalar(name) {
    return this.getScalars().find(scalar => scalar.getName() === name);
  }

  getScalars() {
    return this.scalars;
  }

  getEnum(name) {
    return this.getEnums().find(el => el.getName() === name);
  }

  getEnums() {
    return this.enums;
  }

  getEntityModels() {
    return this.getModels().filter(model => model.isEntity() && !model.isPrivate());
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
    this.schema.resolvers = Merge(schemas.reduce((prev, schema) => Merge(prev, schema.resolvers || {}), {}), this.schema.resolvers);
    this.initialize();
    return this;
  }

  makeExecutableSchema() {
    return makeExecutableSchema(this.getSchema());
  }
};
