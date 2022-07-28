const Query = require('../../src/query/Query');
const { createSystemEvent, eventEmitter } = require('../../src/service/event.service');
const { timeout } = require('../../src/service/app.service');
const setup = require('../setup');

describe('EventService', () => {
  let schema, resolver;
  let query;

  beforeAll(async () => {
    ({ schema, resolver } = await setup());
    const model = schema.getModel('Person');
    query = new Query({ model, resolver });
  });

  test('createSystemEvent', async () => {
    const cb1 = jest.fn(async (data, next) => {
      await timeout(500);
      next();
    });

    const cb2 = jest.fn((data) => {});

    eventEmitter.on('preTest', cb1);
    eventEmitter.once('preTest', cb2);
    await createSystemEvent('test', { query });
    await createSystemEvent('test', { query });
    expect(cb1).toHaveBeenCalledTimes(2);
    expect(cb2).toHaveBeenCalledTimes(1);
  });

  test('createSystemEvent order of events', (done) => {
    let count = 0;

    eventEmitter.on('preMutation', () => {
      expect(count++).toBe(0);
    });

    eventEmitter.on('validate', () => {
      expect(count++).toBe(1);
    });

    eventEmitter.on('postMutation', () => {
      expect(count++).toBe(2);
    });

    eventEmitter.on('preResponse', () => {
      expect(count++).toBe(3);
    });

    eventEmitter.on('postResponse', () => {
      expect(count++).toBe(4);
      done();
    });

    resolver.match('Person').save({ name: 'person1', emailAddress: 'person1@gmail.com' });
  });
});
