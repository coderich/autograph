const { Kind } = require('graphql');
const Node = require('./Node');
const Model = require('./Model');

const operations = ['Query', 'Mutation', 'Subscription'];
const modelKinds = [Kind.OBJECT_TYPE_DEFINITION, Kind.OBJECT_TYPE_EXTENSION];

const consolidate = (models) => {
  return models.reduce((prev, model) => {
    const existingModel = prev.find(m => m.getName() === model.getName());

    if (existingModel) {
      existingModel.extend(model.getAST());
      return prev;
    }

    return prev.concat(model);
  }, []);
};

module.exports = class Schema extends Node {
  constructor(ast) {
    super(ast);

    this.models = consolidate(ast.definitions.filter((d) => {
      const node = new Node(d);
      return modelKinds.some(k => node.getKind() === k) && operations.every(o => node.getName() !== o);
    }).map(d => new Model(this, d)));
  }

  extend(...asts) {
    this.models = consolidate(this.models.concat(...asts.reduce((p, ast) => p.concat(new Schema(ast).getModels()), [])));
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
};
