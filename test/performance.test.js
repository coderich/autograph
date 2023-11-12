const setup = require('./setup');

describe('performance', () => {
  let resolver;

  beforeAll(async () => {
    ({ resolver } = await setup());
  });

  test('performance', async () => {
    // Create 1000 dummy people
    const input = Array.from(new Array(1000)).map((el, i) => ({
      age: 45,
      name: `person${i}`,
      emailAddress: `email${i}@gmail.com`,
      sections: Array.from(new Array(100)).map((ej, j) => ({
        name: `section${j}`,
      })),
    }));

    console.time('createMany');
    const create = await resolver.match('Person').save(input);
    console.timeEnd('createMany');
    expect(create.length).toBe(1000);

    console.time('findMany');
    const find = await resolver.match('Person').many();
    console.timeEnd('findMany');
    expect(find.length).toBe(1000);
  });
});
