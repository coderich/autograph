const { get } = require('lodash');
const { Kind, parse, print } = require('graphql');

exports.getTypeInfo = (ast, info = {}) => {
  const { type } = ast;
  if (!type) return info;
  if (type.name) info.name = type.name.value;
  if (type.kind === Kind.LIST_TYPE) info.isArray = true;
  if (type.kind === Kind.NON_NULL_TYPE) info.isRequired = true;
  return exports.getTypeInfo(type, info);
};

exports.mergeAST = (astLike) => {
  // Step 1: Ensure AST
  const ast = exports.toAST(astLike);

  switch (ast.kind) {
    case Kind.DOCUMENT: return exports.mergeASTSchema(ast);
    default: return ast;
  }
};

exports.mergeASTSchema = (schema) => {
  // Step 1: Ensure AST
  const ast = exports.toAST(Array.isArray(schema) ? schema.join('\n') : schema);

  // Step 2: All extensions become definitions
  ast.definitions.forEach((definition) => {
    if (definition.kind === Kind.OBJECT_TYPE_EXTENSION) definition.kind = Kind.OBJECT_TYPE_DEFINITION;
  });

  // Step 3: Merge like objects
  ast.definitions = exports.mergeASTArray(ast.definitions);

  // Step 4: Return!
  return ast;
};

exports.mergeASTArray = (arr) => {
  return arr.reduce((prev, curr) => {
    const original = prev.find(el => get(el, 'kind', 'a') === get(curr, 'kind', 'b') && get(el, 'name.value', 'a') === get(curr, 'name.value', 'b'));

    if (original) {
      Object.entries(curr).forEach(([key, value]) => {
        if (Array.isArray(value)) {
        // if (['fields', 'directives', 'arguments'].indexOf(key) > -1) {
          original[key] = exports.mergeASTArray((original[key] || []).concat(value));
        } else if (value !== undefined) {
          original[key] = value;
        }
      });

      return prev;
    }

    return prev.concat(curr);
  }, []);
};

exports.toAST = a => (typeof a === 'string' ? parse(a) : a);
exports.toGQL = a => (typeof a === 'string' ? a : print(a));
