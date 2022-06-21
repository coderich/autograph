const FS = require('fs');
const Glob = require('glob');
const Merge = require('deepmerge');
const { Kind, print, parse, visit } = require('graphql');
const { makeExecutableSchema } = require('@graphql-tools/schema');
const { mergeASTArray } = require('../../service/graphql.service');
const frameworkExt = require('../extension/framework');
const typeExt = require('../extension/type');
const apiExt = require('../extension/api');
const Model = require('./Model');
const Node = require('./Node');

const operations = ['Query', 'Mutation', 'Subscription'];
const modelKinds = [Kind.OBJECT_TYPE_DEFINITION, Kind.OBJECT_TYPE_EXTENSION, Kind.INTERFACE_TYPE_DEFINITION, Kind.INTERFACE_TYPE_EXTENSION];
const inputKinds = [Kind.INPUT_OBJECT_TYPE_DEFINITION, Kind.INPUT_OBJECT_TYPE_EXTENSION];
const scalarKinds = [Kind.SCALAR_TYPE_DEFINITION, Kind.SCALAR_TYPE_EXTENSION];
const enumKinds = [Kind.ENUM_TYPE_DEFINITION, Kind.ENUM_TYPE_EXTENSION];

const deleteKeys = (obj, keys) => {
  if (Array.isArray(obj)) obj.map(item => deleteKeys(item, keys));
  else if (obj === Object(obj)) { keys.forEach(key => delete obj[key]); Object.values(obj).forEach(v => deleteKeys(v, keys)); }
  return obj;
};

module.exports = class Schema {
  constructor(schema, context) {
    this.models = [];
    this.scalars = [];
    this.inputs = [];
    this.enums = [];
    this.schema = { context: {}, typeDefs: [], resolvers: {}, schemaDirectives: {} };
    if (schema) this.mergeSchema(schema);
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

  /**
   * Synchronously merge a schema
   */
  mergeSchema(schema, flag) {
    // Normalize schema into the shape { typeDefs, resolvers, schemaDirectives }
    if (typeof schema === 'string') schema = { typeDefs: [schema] };
    else if (schema.typeDefs && !Array.isArray(schema.typeDefs)) schema.typeDefs = [schema.typeDefs];

    // For typeDefs we really want the AST Object Definition so that we can intelligently merge it
    const definitions = deleteKeys((schema.typeDefs || []).map((td) => {
      try {
        const ast = typeof td === 'object' ? td : parse(td);
        return ast.definitions;
      } catch (e) {
        return null;
      }
    }), ['loc']).filter(Boolean).flat();

    // Now we're ready to merge the schema
    const { resolvers, schemaDirectives } = schema;
    if (definitions.length) this.schema.typeDefs = mergeASTArray(this.schema.typeDefs.concat(definitions));
    if (resolvers) this.schema.resolvers = Merge(this.schema.resolvers, resolvers);
    if (schemaDirectives) this.schema.schemaDirectives = Merge(this.schema.schemaDirectives, schemaDirectives);

    // Chaining
    return this;
  }

  /**
   * Asynchronously load files from a given glob pattern and merge each schema
   */
  mergeSchemaFromFiles(globPattern, options) {
    return new Promise((resolve, reject) => {
      Glob(globPattern, options, (err, files) => {
        if (err) return reject(err);

        return Promise.all(files.map((file) => {
          return new Promise((res) => {
            if (file.endsWith('.js')) res(require(file)); // eslint-disable-line global-require,import/no-dynamic-require
            else res(FS.readFileSync(file, 'utf8'));
          }).then(schema => this.mergeSchema(schema));
        })).then(() => resolve(files)).catch(e => reject(e));
      });
    });
  }

  /**
   *
   */
  initialize() {
    this.models.length = 0;
    this.scalars.length = 0;
    this.inputs.length = 0;
    this.enums.length = 0;

    visit(this.schema.typeDefs, {
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

  finalize() {
    this.schema.typeDefs = visit(this.schema.typeDefs, {
      [Kind.FIELD_DEFINITION]: (node) => {
        const scope = new Node(node, 'field').getDirectiveArg('field', 'gqlScope', 'crud');
        if (scope === null || scope.indexOf('r') === -1) return null; // Delete node
        return false; // Stop traversing this node
      },
    });

    return this;
  }

  decorate() {
    this.initialize();
    this.mergeSchema(frameworkExt(this), true);
    this.mergeSchema(typeExt(this));
    this.initialize();
    this.mergeSchema(apiExt(this));
    this.finalize();
    return this;
  }

  makeExecutableSchema() {
    return makeExecutableSchema(this.schema);
  }

  getContext() {
    return this.context;
  }

  mergeContext(context) {
    this.context = Merge(this.context, context);
  }

  toObject() {
    return this.schema;
  }

  toString() {
    return print(this.typeDefs);
  }
};
