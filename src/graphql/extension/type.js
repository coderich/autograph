const { ucFirst } = require('../../service/app.service');

module.exports = (schema) => {
  return ({
    typeDefs: schema.getEntityModels().map((model) => {
      const modelName = model.getName();
      const createdAt = model.getDirectiveArg('model', 'createdAt', 'createdAt');
      const updatedAt = model.getDirectiveArg('model', 'updatedAt', 'updatedAt');

      return `
        extend type ${modelName} implements Node {
          id: ID!
          ${createdAt ? `createdAt: AutoGraphDateTime @field(scope: query, alias: "${createdAt}")` : ''}
          ${updatedAt ? `updatedAt: AutoGraphDateTime @field(scope: query, alias: "${updatedAt}")` : ''}
          # ${model.getCountableFields().map(field => `count${ucFirst(field.getName())}(where: ${field.getDataRef()}InputWhere): Int @field(scope: resolver)`)}
          # countSelf(where: ${modelName}InputWhere): Int @field(scope: resolver)
        }
      `;
    }).concat(`
      enum SortOrderEnum { ASC DESC }
    `),
  });
};
