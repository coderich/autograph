const FS = require('fs');
const Glob = require('glob');
const { Kind, parse, visit, printSchema, buildSchema } = require('graphql');
const { makeExecutableSchema } = require('graphql-tools');
const Node = require('./Node');
// const Model = require('./Model');

const modelKinds = [Kind.OBJECT_TYPE_DEFINITION, Kind.OBJECT_TYPE_EXTENSION, Kind.INTERFACE_TYPE_DEFINITION, Kind.INTERFACE_TYPE_EXTENSION];

module.exports = class Schema {
  constructor(schema) {
    this.models = {};
    this.schema = { typeDefs: [], resolvers: {}, schemaDirectives: {} };
    if (schema) this.appendSchema(schema);
  }

  toString() {
    return this.schema.typeDefs.join('\n');
  }

  printSchema() {
    return printSchema(buildSchema(this.toString()));
  }

  appendSchema(schema) {
    let gql;

    if (typeof schema === 'object') {
      const { typeDefs = [], resolvers = {}, schemaDirectives = {} } = schema;
      this.schema.typeDefs.concat(typeDefs);
      Object.entries(resolvers).forEach((key, value) => (this.schema.resolvers[key] = value));
      Object.entries(schemaDirectives).forEach((key, value) => (this.schema.schemaDirectives[key] = value));
      gql = Array.isArray(typeDefs) ? typeDefs.join('\n') : typeDefs;
    } else {
      this.schema.typeDefs.push(schema);
      gql = schema;
    }

    visit(parse(gql), {
      enter(ast) {
        if (modelKinds.indexOf(ast.kind) > -1) {
          // const node = new Node(ast);
          // console.log(node.getName());
        }
      },
    });
  }

  appendSchemaFromFile(file) {
    if (file.endsWith('.js')) {
      this.appendSchema(require(file)); // eslint-disable-line global-require,import/no-dynamic-require
    } else {
      this.appendSchema(FS.readFileSync(file, 'utf8'));
    }
  }

  appendSchemaFromDirectory(dir, options) {
    Glob.sync(`${dir}/**/*.{js,gql,graphql}`, options).forEach(file => this.appendSchemaFromFile(file));
  }

  makeExecutableSchema() {
    return makeExecutableSchema(this.schema);
  }
};
