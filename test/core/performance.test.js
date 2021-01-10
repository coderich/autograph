const MongoDriver = require('../../src/driver/MongoDriver');
const setup = require('../setup');

let resolver;

describe('Performance', () => {
  beforeAll(async () => {
    // Setup
    ({ resolver } = await setup());

    // Fixtures
    const [person1, person2] = await Promise.all([
      resolver.match('Person').save({ name: 'name1', emailAddress: 'name1@gmail.com' }),
      resolver.match('Person').save({ name: 'name2', emailAddress: 'name2@gmail.com' }),
      resolver.match('Person').save({ name: 'name3', emailAddress: 'name3@gmail.com' }),
    ]);

    await resolver.match('Person').id(person1.id).save({ friends: [person2.id] });
  });

  describe('Driver # of calls', () => {
    test('Simple find', async () => {
      const spyGet = jest.spyOn(MongoDriver.prototype, 'get');
      const spyFind = jest.spyOn(MongoDriver.prototype, 'find');
      const people = await resolver.match('Person').many();
      expect(people.length).toBe(3);
      expect(spyGet).toHaveBeenCalledTimes(0);
      expect(spyFind).toHaveBeenCalledTimes(1);
      spyGet.mockClear();
      spyFind.mockClear();
    });

    test('Simple where clause', async () => {
      const spyGet = jest.spyOn(MongoDriver.prototype, 'get');
      const spyFind = jest.spyOn(MongoDriver.prototype, 'find');
      const people = await resolver.match('Person').where({ name: 'name1' }).many();
      expect(people.length).toBe(1);
      expect(spyGet).toHaveBeenCalledTimes(0);
      expect(spyFind).toHaveBeenCalledTimes(1);
      spyGet.mockClear();
      spyFind.mockClear();
    });

    // test('Nested where clause (found)', async () => {
    //   const spyGet = jest.spyOn(MongoDriver.prototype, 'get');
    //   const spyFind = jest.spyOn(MongoDriver.prototype, 'find');
    //   const people = await resolver.match('Person').where({ friends: { name: 'name2' } }).many();
    //   expect(people.length).toBe(1);
    //   expect(spyGet).toHaveBeenCalledTimes(0);
    //   expect(spyFind).toHaveBeenCalledTimes(2);
    //   spyGet.mockClear();
    //   spyFind.mockClear();
    // });

    // test('Nested where clause (not found)', async () => {
    //   const spyGet = jest.spyOn(MongoDriver.prototype, 'get');
    //   const spyFind = jest.spyOn(MongoDriver.prototype, 'find');
    //   const people = await resolver.match('Person').where({ friends: { name: 'name1' } }).many();
    //   expect(people.length).toBe(0);
    //   expect(spyGet).toHaveBeenCalledTimes(0);
    //   expect(spyFind).toHaveBeenCalledTimes(1);
    //   spyGet.mockClear();
    //   spyFind.mockClear();
    // });
  });
});
