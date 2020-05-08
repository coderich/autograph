module.exports = schema => `
  ${schema.getEntityModels().map((model) => {
    const createdAt = model.getDirectiveArg('model', 'createdAt', 'createdAt');
    const updatedAt = model.getDirectiveArg('model', 'updatedAt', 'updatedAt');

    return `
      type ${model.getName()} {
        id: ID @field(scope: private)
        ${createdAt ? `createdAt: Int @field(alias: "${createdAt}", scope: private)` : ''}
        ${updatedAt ? `updatedAt: Int @field(alias: "${updatedAt}", scope: private)` : ''}
      }
    `;
  })}
`;
