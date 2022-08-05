const setup = require('../setup');

let resolver;
let rawPerson;

describe('DataManipulations', () => {
  beforeAll(async () => {
    // Setup
    ({ resolver } = await setup());

    // Fixtures
    rawPerson = await resolver.raw('Person').insertOne({ name: 'name', network: 'network' }).then(r => Object.assign({ name: 'name' }, { _id: r.insertedId }));
  });

  test('person', async () => {
    expect(rawPerson).toBeDefined();
    expect(rawPerson._id).toBeDefined(); // eslint-disable-line no-underscore-dangle
    expect(rawPerson.name).toEqual('name');
    expect(rawPerson.telephone).toBeUndefined();
  });

  test('getPerson', async () => {
    const person = await resolver.match('Person').id(rawPerson._id).one(); // eslint-disable-line no-underscore-dangle
    expect(person).toBeTruthy();
    expect(person.name).toEqual('Name');
    expect(person.telephone).toEqual('###-###-####');
  });
});
