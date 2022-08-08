const { guidToId } = require('../../src/service/app.service');
const setup = require('../setup');

// let schema;
let resolver;
let graphql;
let personId;
let friends;

const attrs = `
  id
  name
  emailAddress
  telephone
  authored {
    edges {
      node { name price author { name } }
    }
  }
  friends {
    edges {
      node { id name emailAddress }
    }
  }
  sections {
    name
  }
`;

describe('GraphQL', () => {
  beforeAll(async () => {
    // Setup
    ({ graphql, resolver } = await setup());

    // Fixtures
    friends = await Promise.all([
      resolver.match('Person').save({ name: 'friend1', emailAddress: 'friend1@gmail.com' }),
      resolver.match('Person').save({ name: 'friend2', emailAddress: 'friend2@gmail.com' }),
      resolver.match('Person').save({ name: 'friend3', emailAddress: 'friend3@gmail.com' }),
    ]);
  });

  test('exec (create)', async () => {
    const friendIds = friends.map(f => `"${f.id}"`).join(',');

    const result = await graphql.exec(`
      mutation {
        createPerson(input: {
          name: "GraphQL"
          telephone: null
          emailAddress: "graphql@gmail.com"
          friends: [${friendIds}]
        }) { ${attrs} }
      }
    `);

    expect(result).toBeDefined();
    expect(result.errors).not.toBeDefined();
    expect(result.data).toBeDefined();
    expect(result.data.createPerson).toMatchObject({
      id: expect.anything(),
      name: 'Graphql',
      telephone: null,
      emailAddress: 'graphql@gmail.com',
      authored: {
        edges: [],
      },
      friends: {
        edges: [
          { node: { id: expect.anything(), name: 'Friend1' } },
          { node: { id: expect.anything(), name: 'Friend2' } },
          { node: { id: expect.anything(), name: 'Friend3' } },
        ],
      },
    });

    // Save off personId
    personId = result.data.createPerson.id;

    // Create book
    await resolver.match('Book').save({ author: guidToId({}, personId), name: 'book', price: 9.99 });
  });

  test('exec (update)', async () => {
    const result = await graphql.exec(`
      mutation {
        updatePerson(id: "${personId}", input: {
          name: "NewName"
        }) { ${attrs} }
      }
    `);

    expect(result).toBeDefined();
    expect(result.errors).not.toBeDefined();
    expect(result.data).toBeDefined();
    expect(result.data.updatePerson).toMatchObject({
      id: expect.anything(),
      name: 'Newname',
      telephone: null,
      authored: {
        edges: [
          {
            node: {
              name: 'Book',
              price: 9.99,
              author: { name: 'Newname' },
            },
          },
        ],
      },
      friends: {
        edges: [
          { node: { id: expect.anything(), name: 'Friend1' } },
          { node: { id: expect.anything(), name: 'Friend2' } },
          { node: { id: expect.anything(), name: 'Friend3' } },
        ],
      },
    });
  });

  test('exec (find)', async () => {
    const result = await graphql.exec(`
      query {
        findPerson {
          edges {
            node { ${attrs} }
          }
        }
      }
    `);

    expect(result).toBeDefined();
    expect(result.errors).not.toBeDefined();
    expect(result.data).toBeDefined();

    // Need to sort friends to make sure it matches order
    result.data.findPerson.edges.sort((a, b) => {
      if (`${a.node.id}` < `${b.node.id}`) return -1;
      if (`${a.node.id}` > `${b.node.id}`) return 1;
      return 0;
    });

    expect(result.data.findPerson.edges[0].node).toMatchObject({
      id: expect.anything(),
      name: 'Friend1',
      telephone: '###-###-####',
      authored: { edges: [] },
      friends: { edges: [] },
    });
    expect(result.data.findPerson.edges[1].node).toMatchObject({
      id: expect.anything(),
      name: 'Friend2',
      telephone: '###-###-####',
      authored: { edges: [] },
      friends: { edges: [] },
    });
    expect(result.data.findPerson.edges[2].node).toMatchObject({
      id: expect.anything(),
      name: 'Friend3',
      telephone: '###-###-####',
      authored: { edges: [] },
      friends: { edges: [] },
    });
    expect(result.data.findPerson.edges[3].node).toMatchObject({
      id: expect.anything(),
      name: 'Newname',
      telephone: null,
      authored: {
        edges: [
          {
            node: {
              name: 'Book',
              price: 9.99,
              author: { name: 'Newname' },
            },
          },
        ],
      },
    });

    // Need to sort friends to make sure it matches order
    result.data.findPerson.edges[3].node.friends.edges.sort((a, b) => {
      if (`${a.node.id}` < `${b.node.id}`) return -1;
      if (`${a.node.id}` > `${b.node.id}`) return 1;
      return 0;
    });

    expect(result.data.findPerson.edges[3].node.friends).toMatchObject({
      edges: expect.objectContaining([
        { node: { id: expect.anything(), name: 'Friend1', emailAddress: 'friend1@gmail.com' } },
        { node: { id: expect.anything(), name: 'Friend2', emailAddress: 'friend2@gmail.com' } },
        { node: { id: expect.anything(), name: 'Friend3', emailAddress: 'friend3@gmail.com' } },
      ]),
    });
  });

  // test('exec with systemEvent override', async () => {
  //   expect(schema).toBeDefined();
  //   expect(graphql).toBeDefined();
  //   expect(resolver).toBeDefined();

  //   // Listen for event (change result)
  //   eventEmitter.onKeys('preMutation', ['createPersony', 'createPerson'], (event, next) => {
  //     next({ id: 1, name: 'NewName', emailAddress: 'emailAddress' });
  //   });

  //   const result = await graphql.exec(`
  //     mutation {
  //       createPerson(input: {
  //         name: "GraphQL"
  //         emailAddress: "graphql@gmail.com"
  //       }) {
  //         id
  //         name
  //         emailAddress
  //         telephone
  //         authored {
  //           name
  //           price
  //         }
  //       }
  //     }
  //   `);

  //   expect(result).toBeDefined();
  //   expect(result.data).toBeDefined();
  //   expect(result.errors).not.toBeDefined();
  //   expect(result.data.createPerson.id).toBeDefined();
  //   expect(result.data.createPerson.name).toBe('Newname'); // Title case
  // });
});
