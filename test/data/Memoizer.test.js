const Memoizer = require('../../src/data/Memoizer');

class Service {
  constructor() {
    this.a = 1;
    this.b = 2;
    return new Memoizer(this, Object.getOwnPropertyNames(Service.prototype));
  }

  one() {
    return this.a;
  }

  two() {
    return this.b;
  }

  echo(a) {
    return this.c || a;
  }
}

const service = {
  one: () => 1,
  two: () => 2,
  echo: a => a,
};

const one = jest.fn(() => 1);
const echo = jest.fn(a => a);

describe('Memoizer', () => {
  describe('service', () => {
    test('no args', async () => {
      const spyOne = jest.spyOn(service, 'one');
      const spyTwo = jest.spyOn(service, 'two');
      const memoizer = new Memoizer(service);
      expect(memoizer.one()).toEqual(1);
      expect(memoizer.one()).toEqual(1);
      expect(memoizer.one()).toEqual(1);
      expect(memoizer.two()).toEqual(2);
      expect(memoizer.two()).toEqual(2);
      expect(spyOne).toHaveBeenCalledTimes(1);
      expect(spyTwo).toHaveBeenCalledTimes(1);
      spyOne.mockClear();
      spyTwo.mockClear();
    });

    test('1 arg', async () => {
      const spyEcho = jest.spyOn(service, 'echo');
      const memoizer = new Memoizer(service);
      expect(memoizer.echo('hello world')).toEqual('hello world');
      expect(memoizer.echo('hello ball')).toEqual('hello ball');
      expect(memoizer.echo('hello world')).toEqual('hello world');
      expect(spyEcho).toHaveBeenCalledTimes(2);
      spyEcho.mockClear();
    });
  });

  describe('function', () => {
    test('one', async () => {
      const memoizer = new Memoizer(one);
      expect(memoizer()).toEqual(1);
      expect(memoizer()).toEqual(1);
      expect(memoizer()).toEqual(1);
      expect(one).toHaveBeenCalledTimes(1);
    });

    // test('1 arg', async () => {
    //   const spyEcho = jest.spyOn(service, 'echo');
    //   const memoizer = new Memoizer(service);
    //   expect(memoizer.echo('hello world')).toEqual('hello world');
    //   expect(memoizer.echo('hello ball')).toEqual('hello ball');
    //   expect(memoizer.echo('hello world')).toEqual('hello world');
    //   expect(spyEcho).toHaveBeenCalledTimes(2);
    //   spyEcho.mockClear();
    // });
  });

  describe('class', () => {
    test('no args', async () => {
      const spyOne = jest.spyOn(Service.prototype, 'one');
      const spyTwo = jest.spyOn(Service.prototype, 'two');
      const memoizer = new Service();
      expect(memoizer.one()).toEqual(1);
      expect(memoizer.one()).toEqual(1);
      expect(memoizer.one()).toEqual(1);
      expect(memoizer.two()).toEqual(2);
      expect(memoizer.two()).toEqual(2);
      expect(spyOne).toHaveBeenCalledTimes(1);
      expect(spyTwo).toHaveBeenCalledTimes(1);
      spyOne.mockClear();
      spyTwo.mockClear();
    });

    test('1 arg', async () => {
      const spyEcho = jest.spyOn(Service.prototype, 'echo');
      const memoizer = new Service();
      expect(memoizer.echo('hello world')).toEqual('hello world');
      expect(memoizer.echo('hello ball')).toEqual('hello ball');
      expect(memoizer.echo('hello world')).toEqual('hello world');
      expect(spyEcho).toHaveBeenCalledTimes(2);
      spyEcho.mockClear();
    });
  });
});
