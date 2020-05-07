const { Kind, parse, print } = require('graphql');
const { makeExecutableSchema } = require('graphql-tools');
const Node = require('./Node');
const Model = require('./Model');

const merge = (arr) => {
  return arr.reduce((prev, curr) => {
    const original = prev.find(el => el.kind === curr.kind && el.name.value === curr.name.value);

    if (original) {
      Object.entries(curr).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          original[key] = merge((original[key] || []).concat(value));
        } else {
          original[key] = value;
        }
      });

      return prev;
    }

    return prev.concat(curr);
  }, []);
};

const consolidate = (gql) => {
  // Step 1: Ensure AST!
  const ast = typeof gql === 'string' ? parse(gql) : gql;

  // Step 2: All extensions become definitions
  ast.definitions.forEach((definition) => {
    if (definition.kind === Kind.OBJECT_TYPE_EXTENSION) definition.kind = Kind.OBJECT_TYPE_DEFINITION;
  });

  // Step 3: Merge like objects
  ast.definitions = merge(ast.definitions);

  // Step 4: Return!
  return ast;
};

module.exports = class Schema extends Node {
  constructor(gql) {
    super(consolidate(gql));
    this.models = this.ast.definitions.filter(d => new Node(d).isModel()).map(d => new Model(this, d));
  }

  extend(...gqls) {
    const definitions = gqls.map(gql => consolidate(gql).definitions);
    this.ast.definitions = merge(this.ast.definitions.concat(...definitions));
    this.models = this.ast.definitions.filter(d => new Node(d).isModel()).map(d => new Model(this, d));
  }

  getModels() {
    return this.models;
  }

  getModel(name) {
    return this.getModels().find(model => model.getName() === name);
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
