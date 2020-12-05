const { ucFirst } = require('../../service/app.service');

/**
 * Decorate Entity Models
 */
module.exports = (schema) => {
  return ({
    typeDefs: schema.getMarkedModels().map((model) => {
      const id = model.idKey();
      const modelName = model.getName();
      const createdAt = model.getDirectiveArg('model', 'createdAt', 'createdAt');
      const updatedAt = model.getDirectiveArg('model', 'updatedAt', 'updatedAt');

      return `
        extend type ${modelName} ${id ? 'implements Node' : ''} {
          ${id ? `id: ID! @field(key: "${id}", gqlScope: r)` : ''}
          ${createdAt ? `createdAt: AutoGraphDateTime @field(key: "${createdAt}", gqlScope: r)` : ''}
          ${updatedAt ? `updatedAt: AutoGraphDateTime @field(key: "${updatedAt}", gqlScope: r)` : ''}
          # ${model.getCountableFields().map(field => `count${ucFirst(field.getName())}(where: ${field.getDataRef()}InputWhere): Int @field(persist: false, gqlScope: r)`)}
          # countSelf(where: ${modelName}InputWhere): Int @field(persist: false, gqlScope: r)
        }
      `;
    }).concat(`
      interface Node { id: ID! }
      enum SortOrderEnum { ASC DESC }
    `),
  });
};
