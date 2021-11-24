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

      if (model.getKind() === 'ObjectTypeDefinition') {
        return `
          extend type ${modelName} ${id ? 'implements Node' : ''} {
            ${id ? `id: ID! @field(key: "${id}", gqlScope: r)` : ''}
            ${createdAt ? `createdAt: AutoGraphDateTime @field(key: "${createdAt}", gqlScope: r)` : ''}
            ${updatedAt ? `updatedAt: AutoGraphDateTime @field(key: "${updatedAt}", gqlScope: r)` : ''}
          }
        `;
      }

      return '';
    }).concat(`
      interface Node { id: ID! }
      enum SortOrderEnum { asc desc }
      enum SubscriptionCrudEnum { create update delete } # Not going to support "read"
      enum SubscriptionWhenEnum { anytime preEvent postEvent }
    `),
  });
};
