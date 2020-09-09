const { get } = require('lodash');
const { Kind, parse, print } = require('graphql');
const { validate } = require('graphql/validation');
const { makeExecutableSchema } = require('graphql-tools');

//
const mergePairs = [
  [Kind.SCHEMA_DEFINITION, Kind.SCHEMA_EXTENSION],
  [Kind.ENUM_TYPE_DEFINITION, Kind.ENUM_TYPE_EXTENSION],
  [Kind.UNION_TYPE_DEFINITION, Kind.UNION_TYPE_EXTENSION],
  [Kind.SCALAR_TYPE_DEFINITION, Kind.SCALAR_TYPE_EXTENSION],
  [Kind.OBJECT_TYPE_DEFINITION, Kind.OBJECT_TYPE_EXTENSION],
  [Kind.INTERFACE_TYPE_DEFINITION, Kind.INTERFACE_TYPE_EXTENSION],
  [Kind.INPUT_OBJECT_TYPE_DEFINITION, Kind.INPUT_OBJECT_TYPE_EXTENSION],
];

// const operators = ['Query', 'Mutation', 'Subscription'];

exports.areMergeableASTs = (a, b) => {
  const aKind = get(a, 'kind', 'a');
  const aName = get(a, 'name.value', 'a');
  const bKind = get(b, 'kind', 'b');
  const bName = get(b, 'name.value', 'b');
  const sameKind = Boolean(aKind === bKind || mergePairs.some(pair => pair.indexOf(aKind) > -1 && pair.indexOf(bKind) > -1));
  const sameName = aName === bName;
  return Boolean(sameKind && sameName);
};

exports.getTypeInfo = (ast, info = {}, traverse = true) => {
  const { type } = ast;
  if (!type) return info;
  if (type.name) info.name = type.name.value;
  if (type.kind === Kind.LIST_TYPE) info.isArray = true;
  if (type.kind === Kind.NON_NULL_TYPE) info.isRequired = true;
  return traverse ? exports.getTypeInfo(type, info) : info;
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

exports.mergeASTObject = (left, right) => {
  Object.entries(right).forEach(([key, value]) => {
    if (key !== 'kind' && key !== 'loc') {
      if (Array.isArray(value)) {
        left[key] = exports.mergeASTArray((left[key] || []).concat(...value));
      } else if (value != null) {
        left[key] = value;
        // left[key] = merge(left[key], value);
      }
    }
  });
};

exports.mergeASTArray = (arr) => {
  return arr.reduce((prev, curr) => {
    const match = prev.find(el => !el.deleteFlag && exports.areMergeableASTs(el, curr));

    if (match) {
      const [left, right] = [match, curr].sort((a, b) => (a.kind.indexOf('Extension') > -1 && b.kind.indexOf('Extension') === -1 ? 1 : 0));
      exports.mergeASTObject(left, right);
      right.deleteFlag = true;
    }

    return prev.concat(curr);
  }, []).filter(el => !el.deleteFlag);
};

exports.validateSchema = (ast) => {
  const errs = validate(makeExecutableSchema(ast), ast.typeDefs).filter(({ message }) => message.indexOf('not executable') === -1).map(({ message }) => message);
  if (errs.length) throw new Error(errs.join('\n'));
};

exports.makeExecutableSchema = makeExecutableSchema;

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
