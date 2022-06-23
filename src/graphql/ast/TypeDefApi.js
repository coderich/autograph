const { Kind, visit } = require('graphql');
const Model = require('./Model');
const Node = require('./Node');

const operations = ['Query', 'Mutation', 'Subscription'];
const modelKinds = [Kind.OBJECT_TYPE_DEFINITION, Kind.OBJECT_TYPE_EXTENSION, Kind.INTERFACE_TYPE_DEFINITION, Kind.INTERFACE_TYPE_EXTENSION];
const inputKinds = [Kind.INPUT_OBJECT_TYPE_DEFINITION, Kind.INPUT_OBJECT_TYPE_EXTENSION];
const scalarKinds = [Kind.SCALAR_TYPE_DEFINITION, Kind.SCALAR_TYPE_EXTENSION];
const enumKinds = [Kind.ENUM_TYPE_DEFINITION, Kind.ENUM_TYPE_EXTENSION];

module.exports = class TypeDefApi {
  constructor() {
    this.models = [];
    this.scalars = [];
    this.inputs = [];
    this.enums = [];
  }

  initialize(typeDefs) {
    this.models.length = 0;
    this.scalars.length = 0;
    this.inputs.length = 0;
    this.enums.length = 0;

    visit(typeDefs, {
      enter: (node) => {
        if (modelKinds.indexOf(node.kind) > -1 && operations.indexOf(node.name.value) === -1) {
          this.models.push(new Model(this, node));
        } else if (scalarKinds.indexOf(node.kind) > -1) {
          this.scalars.push(new Node(node));
        } else if (inputKinds.indexOf(node.kind) > -1) {
          this.inputs.push(new Node(node));
        } else if (enumKinds.indexOf(node.kind) > -1) {
          this.enums.push(new Node(node));
        }

        return false; // Stop traversing this node
      },
    });

    return this;
  }

  // Models
  getModel(name) {
    return this.models.find(m => m.getName() === name);
  }

  getModels() {
    return this.models;
  }

  getModelNames() {
    return this.getModels().map(model => model.getName());
  }

  getModelMap() {
    return this.getModels().reduce((prev, model) => Object.assign(prev, { [model.getName()]: model }), {});
  }

  getMarkedModels() {
    return Object.values(this.models).filter(model => model.isMarkedModel());
  }

  getEntityModels() {
    return Object.values(this.models).filter(model => model.isEntity());
  }

  // Definitions
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
};
