const EventEmitter = require('../../src/core/EventEmitter');
const { timeout } = require('../../src/service/app.service');

describe('EventEmitter', () => {
  test('Sequential Order', async (done) => {
    const em = new EventEmitter();

    const cb1 = jest.fn(async (data, next) => {
      await timeout(500);
      expect(data).toEqual('world');
      next();
    });

    const cb2 = jest.fn((data) => {
      expect(data).toEqual('world');
    });

    em.on('hello', cb1);
    em.once('hello', cb2);
    await em.emit('hello', 'world');
    await em.emit('hello', 'world');
    expect(cb1).toHaveBeenCalledTimes(2);
    expect(cb2).toHaveBeenCalledTimes(1);
    done();
  });
});
