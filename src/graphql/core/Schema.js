const FS = require('fs');
const Glob = require('glob');
const Merge = require('deepmerge');
const { Kind, parse, visit, printSchema, buildSchema } = require('graphql');
const { makeExecutableSchema } = require('graphql-tools');
const Model = require('./Model');

const modelKinds = [Kind.OBJECT_TYPE_DEFINITION, Kind.OBJECT_TYPE_EXTENSION, Kind.INTERFACE_TYPE_DEFINITION, Kind.INTERFACE_TYPE_EXTENSION];

module.exports = class Schema {
  constructor(schema) {
    this.models = {};
    this.schema = { typeDefs: [], context: {}, resolvers: {}, schemaDirectives: {} };
    if (schema) this.appendSchema(schema);
  }

  appendSchema(schema) {
    // Normalize schema
    if (typeof schema === 'string') schema = { typeDefs: [schema] };
    else if (schema.typeDefs && !Array.isArray(schema.typeDefs)) schema.typeDefs = [schema.typeDefs];

    // Merge schema
    this.schema = Merge(this.schema, schema);

    // Visit AST to maintain model definitions
    if (schema.typeDefs) {
      visit(parse(schema.typeDefs.join('\n')), {
        enter: (node) => {
          if (modelKinds.indexOf(node.kind) > -1) {
            const name = node.name.value;
            if (this.models[name]) this.models[name].appendAST(node);
            else this.models[name] = new Model(node);
          }
        },
      });
    }

    return this;
  }

  appendSchemaFromFile(file) {
    if (file.endsWith('.js')) this.appendSchema(require(file)); // eslint-disable-line global-require,import/no-dynamic-require
    else this.appendSchema(FS.readFileSync(file, 'utf8'));
    return this;
  }

  appendSchemaFromDirectory(dir, options) {
    Glob.sync(`${dir}/**/*.{js,gql,graphql}`, options).forEach(file => this.appendSchemaFromFile(file));
    return this;
  }

  makeExecutableSchema() {
    return makeExecutableSchema(this.schema);
  }

  printSchema() {
    return printSchema(buildSchema(this.toString()));
  }

  toString() {
    return this.schema.typeDefs.join('\n');
  }
};
