const { Kind, parse, print } = require('graphql');

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
  const ast = exports.toAST(schema);

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
    const original = prev.find(el => el.kind === curr.kind && el.name.value === curr.name.value);

    if (original) {
      Object.entries(curr).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          original[key] = exports.mergeASTArray((original[key] || []).concat(value));
        } else {
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
