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

      if (model.getKind() === 'ObjectTypeDefinition' && (id || createdAt || updatedAt)) {
        const interfaces = [];
        if (id) interfaces.push('Node');
        const interfacesGQL = interfaces.length ? ' implements'.concat(' ', interfaces.join(' & ')) : '';

        return `
          extend type ${modelName}${interfacesGQL} {
            ${id ? `id: ID! @field(key: "${id}", gqlScope: r)` : ''}
            ${createdAt ? `createdAt: AutoGraphDateTime @field(key: "${createdAt}", serialize: createdAt, gqlScope: r)` : ''}
            ${updatedAt ? `updatedAt: AutoGraphDateTime @field(key: "${updatedAt}", serialize: timestamp, gqlScope: r)` : ''}
          }
        `;
      }

      return '';
    }).concat(`
      interface Node { id: ID! }
      enum SortOrderEnum { asc desc }
      enum SubscriptionCrudEnum { create update delete } # Not going to support "read"
      enum SubscriptionWhenEnum { preEvent postEvent }
    `),
  });
};
