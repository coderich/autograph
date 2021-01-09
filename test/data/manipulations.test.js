const setup = require('../setup');

let resolver;
let rawPerson;

describe('DataManipulations', () => {
  beforeAll(async () => {
    // Setup
    ({ resolver } = await setup());

    // Fixtures
    const result = await resolver.raw('Person').insertOne({ name: 'name' });
    ([rawPerson] = result.ops);
  });

  test('person', async () => {
    expect(rawPerson).toBeDefined();
    expect(rawPerson._id).toBeDefined(); // eslint-disable-line no-underscore-dangle
    expect(rawPerson.name).toEqual('name');
    expect(rawPerson.telephone).toBeUndefined();
  });

  test('getPerson', async () => {
    const person = await resolver.match('Person').id(rawPerson._id).one(); // eslint-disable-line no-underscore-dangle
    expect(person).toBeDefined();
    expect(person.name).toEqual('Name');
    expect(person.$manipulate).toBeDefined();
    expect(await person.$manipulate).toBe(5);
    // expect(person.telephone).toEqual('###-###-####');
  });
});
