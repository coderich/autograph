const timeout = ms => new Promise(res => setTimeout(res, ms));

class DataResolver {
  constructor(data, resolver) {
    return new Proxy(data, {
      get(target, prop, rec) {
        const value = Reflect.get(target, prop, rec);
        if (typeof value === 'function') return value.bind(target);
        return resolver(data, prop);
      },
    });
  }
}

const getFriends = async () => {
  await timeout(500);
  return [{ name: 'john' }, { name: 'tom' }, { name: 'christie' }];
};

const resolver = async (data, prop) => {
  switch (prop) {
    case 'friends': {
      const friends = await getFriends();
      return friends.map(friend => new DataResolver(friend, resolver));
    }
    default: return data[prop];
  }
};

module.exports = {
  typeDefs: `
    type Person {
      name: String
      friends: [Person]
    }

    type Query {
      findPerson: Person
    }
  `,

  resolvers: {
    Query: {
      findPerson: () => new DataResolver({ name: 'rich' }, resolver),
    },
  },
};
