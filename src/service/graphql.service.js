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
  const ast = exports.toAST(astLike); // Ensure AST

  switch (ast.kind) {
    case Kind.DOCUMENT: return exports.mergeASTSchema(ast);
    default: return ast;
  }
};

exports.mergeASTSchema = (schema) => {
  const ast = exports.toAST(schema); // Ensure AST
  ast.definitions = exports.mergeASTArray(ast.definitions); // Merge like objects
  return ast;
};

exports.mergeASTArray = (arr) => {
  return arr.reduce((prev, curr) => {
    const original = prev.find(el => get(el, 'kind', 'a') === get(curr, 'kind', 'b') && get(el, 'name.value', 'a') === get(curr, 'name.value', 'b'));

    if (original) {
      Object.entries(curr).forEach(([key, value]) => {
        if (Array.isArray(value)) {
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

exports.toAST = (a) => {
  if (typeof a === 'string') return parse(a);
  if (Array.isArray(a)) return parse(a.map(e => exports.toGQL(e)).join('\n\n'));
  return a;
};

exports.toGQL = (a) => {
  if (typeof a === 'string') return a;
  if (Array.isArray(a)) return a.join('\n\n');
  return print(a);
};
