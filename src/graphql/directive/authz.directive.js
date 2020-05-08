const PicoMatch = require('picomatch');
const { SchemaDirectiveVisitor } = require('graphql-tools');

const getCrudOperation = (mutationName) => {
  const crudMap = {
    create: 'C',
    add: 'C',
    findOrCreate: 'C',
    get: 'R',
    find: 'R',
    count: 'R',
    update: 'U',
    replace: 'U',
    edit: 'U',
    set: 'U',
    move: 'U',
    delete: 'D',
    remove: 'D',
    subscribe: 'S',
  };

  return Object.entries(crudMap).reduce((prev, [key, value]) => {
    if (prev) return prev;
    if (mutationName.indexOf(key) === 0) return value;
    return null;
  }, null);
};

const authorize = (context, model, fields, crud) => {
  const { schema, permissions = [] } = context.autograph;
  const namespace = schema.getModel(model).getNamespace();
  const parts = namespace.split('/').reverse();

  // const flags = fields.reduce((obj, field) => {
  //   const directTargets = parts.reduce((prev, part, i) => prev.concat(`${part}/${prev[i]}`), [`${model}/${field}/${crud}`]);
  //   let result = directTargets.some(target => PicoMatch.isMatch(target, permissions, { nocase: true }));

  //   if (!result) {
  //     const authorTargets = parts.reduce((prev, part, i) => prev.concat(`${part}/${prev[i]}`), [`${model}/${field}/${crud}`]);
  //     result = authorTargets.some(target => PicoMatch.isMatch(target, permissions, { nocase: true })) ? 1 : false;
  //   }

  //   return Object.assign(obj, { [field]: result });
  // }, {});

  // console.log(flags);
  // console.log('------');

  const authorized = fields.every((field) => {
    const targets = parts.reduce((prev, part, i) => prev.concat(`${part}/${prev[i]}`), [`${model}/${field}/${crud}`]);
    return targets.some(target => PicoMatch.isMatch(target, permissions, { nocase: true }));
  });

  if (!authorized) throw new Error('Not Authorized');
};

module.exports = class extends SchemaDirectiveVisitor {
  visitObject(type) { // eslint-disable-line
    const fields = type.getFields();

    Object.keys(fields).forEach((fieldName) => {
      const field = fields[fieldName];
      const { resolve = root => root[fieldName] } = field;
      const { model = `${type}` } = this.args;

      field.resolve = async function resolver(root, args, context, info) {
        authorize(context, model, [fieldName], 'R');
        return resolve.call(this, root, args, context, info);
      };
    });
  }

  visitFieldDefinition(field, details) { // eslint-disable-line
    const { name, type, resolve = root => root[name] } = field;
    const dataType = type.toString().replace(/[[\]!]/g, '');
    const crudOperation = getCrudOperation(name);
    const { model = dataType } = this.args;

    field.resolve = async function resolver(root, args, context, info) {
      authorize(context, model, Object.keys(args.data || { id: 1 }), crudOperation);
      return resolve.call(this, root, args, context, info);
    };
  }
};
