const { ucFirst } = require('../../service/app.service');

/**
 * Decorate Entity Models
 */
module.exports = (schema) => {
  return ({
    typeDefs: schema.getEntityModels().map((model) => {
      const modelName = model.getName();
      const createdAt = model.getDirectiveArg('model', 'createdAt', 'createdAt');
      const updatedAt = model.getDirectiveArg('model', 'updatedAt', 'updatedAt');

      return `
        extend type ${modelName} implements Node {
          id: ID! @field(gqlScope: r, key: "${model.idKey()}")
          ${createdAt ? `createdAt: AutoGraphDateTime @field(gqlScope: r, key: "${createdAt}")` : ''}
          ${updatedAt ? `updatedAt: AutoGraphDateTime @field(gqlScope: r, key: "${updatedAt}")` : ''}
          # ${model.getCountableFields().map(field => `count${ucFirst(field.getName())}(where: ${field.getDataRef()}InputWhere): Int @field(gqlScope: r persist: false)`)}
          # countSelf(where: ${modelName}InputWhere): Int @field(gqlScope: r, persist: false)
        }
      `;
    }).concat(`
      enum SortOrderEnum { ASC DESC }
    `),
  });
};
