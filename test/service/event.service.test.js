const { createSystemEvent, eventEmitter } = require('../../src/service/event.service');
const { timeout } = require('../../src/service/app.service');

describe('EventService', () => {
  test('createSystemEvent', async (done) => {
    const cb1 = jest.fn(async (data, next) => {
      await timeout(500);
      next();
    });

    const cb2 = jest.fn((data) => {});

    eventEmitter.on('preTest', cb1);
    eventEmitter.once('preTest', cb2);
    await createSystemEvent('test');
    await createSystemEvent('test');
    expect(cb1).toHaveBeenCalledTimes(2);
    expect(cb2).toHaveBeenCalledTimes(1);
    done();
  });
});
