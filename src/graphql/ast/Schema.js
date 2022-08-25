const FS = require('fs');
const Glob = require('glob');
const Merge = require('deepmerge');
const { Kind, print, parse, visit } = require('graphql');
const { mergeASTArray } = require('../../service/graphql.service');
const { deleteKeys } = require('../../service/app.service');
const frameworkExt = require('../extension/framework');
const typeExt = require('../extension/type');
const apiExt = require('../extension/api');
const TypeDefApi = require('./TypeDefApi');
const Node = require('./Node');

/**
 * Schema
 *
 * This class helps facilitate dynamic modification of a schema before it is passed to makeExecutableSchema(). It allows
 * for "intelligent" merging of schemas and exposes an API wrapper for typeDefs.
 *
 * A "schema" is defined by the following object attributes:
 *
 *    typeDefs <String|Object> - GQL String or AST Object (also supports a mixed array of both)
 *    resolvers <Object> - GraphQL resolvers
 *    schemaDirectives <Object> - GraphQL directives
 *
 */
module.exports = class Schema extends TypeDefApi {
  constructor(schema) {
    super();
    this.schema = { typeDefs: [], resolvers: {}, schemaDirectives: {} };
    if (schema) this.mergeSchema(schema);
  }

  /**
   * Synchronously merge a schema
   */
  mergeSchema(schema, options = {}) {
    // Ensure this is a schema of sorts otherwise skip it
    if (typeof schema !== 'string' && ['typeDefs', 'resolvers', 'schemaDirectives'].every(key => !schema[key])) return this;

    // Here we want to normalize the schema into the shape { typeDefs, resolvers, schemaDirectives }
    // We do NOT want to modify the schema object because that may cause unwanted side-effects.
    const normalizedSchema = { ...schema };
    if (typeof schema === 'string') normalizedSchema.typeDefs = [schema];
    else if (schema.typeDefs && !Array.isArray(schema.typeDefs)) normalizedSchema.typeDefs = [schema.typeDefs];

    // For typeDefs we want the AST so that it can be intelligently merged. Here we convert
    // GQL strings to AST objects and also filter out anything that does not parse to AST.
    if (normalizedSchema.typeDefs && normalizedSchema.typeDefs.length) {
      normalizedSchema.typeDefs = deleteKeys(normalizedSchema.typeDefs.map((td) => {
        try {
          const ast = typeof td === 'object' ? td : parse(td);
          return ast.definitions;
        } catch (e) {
          return null;
        }
      }), ['loc']).filter(Boolean).flat();
    }

    // Now we're ready to merge the schema
    const [left, right] = options.passive ? [normalizedSchema, this.schema] : [this.schema, normalizedSchema];
    if (normalizedSchema.typeDefs && normalizedSchema.typeDefs.length) this.schema.typeDefs = mergeASTArray(left.typeDefs.concat(right.typeDefs));
    if (normalizedSchema.resolvers) this.schema.resolvers = Merge(left.resolvers, right.resolvers);
    if (normalizedSchema.schemaDirectives) this.schema.schemaDirectives = Merge(left.schemaDirectives, right.schemaDirectives);

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
          }).then(schema => this.mergeSchema(schema, options));
        })).then(() => resolve(this)).catch(e => reject(e));
      });
    });
  }

  /**
   * Traverses the current schema's typeDefs in order to keep the TypeDefApi in sync. This operation
   * only needs to be called when typeDefs have been changed and you want to keep the data model in sync.
   */
  initialize() {
    super.initialize(this.schema.typeDefs);
    this.getModels().forEach(model => model.initialize());
    return this;
  }

  /**
   * Decorate the schema with Autograph's default api/definitions
   */
  decorate() {
    this.initialize();
    this.mergeSchema(frameworkExt(this), { passive: true });
    this.mergeSchema(typeExt(this), { passive: true });
    this.initialize();
    this.mergeSchema(apiExt(this), { passive: true });
    this.finalize();
    return this;
  }

  /**
   * This should be called once before passing to makeExecutableSchema()
   */
  finalize() {
    const definitions = visit(this.schema.typeDefs, {
      [Kind.FIELD_DEFINITION]: (node) => {
        const scope = new Node(node, 'field').getDirectiveArg('field', 'gqlScope', 'crud');
        if (scope === null || scope.indexOf('r') === -1) return null; // Delete node
        return false; // Stop traversing this node
      },
    });

    this.schema.typeDefs = { kind: Kind.DOCUMENT, definitions };
    // validateSchema(this.schema);
    return this;
  }

  toObject() {
    return this.schema;
  }

  toString() {
    return print(this.typeDefs);
  }
};
