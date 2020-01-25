const { ObjectID } = require('mongodb');
const { keyPaths, unravelObject, isPlainObject, isScalarValue, mergeDeep, proxyDeep, uniq, hashObject } = require('../../src/service/app.service');

const obj1 = { name: 'name1', friends: ['a', 'b', 'c'] };
const obj2 = { name: 'name2', friends: ['d', 'e', 'f'] };
const obj3 = { name: 'name3', friends: ['a', 'e', 'b'] };

const doc = {
  name: 'Richard',
  age: 100,
  family: [obj1, obj2, obj3],
  letters: ['a', 'b', 'c'],
  workplace: {
    name: 'gozio',
    address: 'gozio st',
    obj1,
    obj2,
    obj3,
  },
};

const doc2 = {
  workplace: {
    name: 'gozio',
    address: 'gozio st',
    obj2,
    obj1,
    obj3,
  },
  name: 'Richard',
  age: 100,
  family: [obj1, obj2, obj3],
  letters: ['a', 'c', 'b'],
};

describe('AppService', () => {
  test('object.reduce', () => {
    const data = { id: 1, name: 'rich' };
    const newData = Object.entries(data).reduce((prev, [key, value]) => {
      return prev;
    }, data);
    expect(newData.id).toBe(1);
    expect(newData.name).toBe('rich');
  });

  test('isPlainObject', () => {
    expect(isPlainObject(ObjectID('abclghalnohe'))).toBe(false);
    expect(isPlainObject([])).toBe(false);
    expect(isPlainObject({})).toBe(true);
  });

  test('mergeDeep', () => {
    // Expect concatenation
    expect(mergeDeep(obj1, obj2)).toEqual({ name: 'name2', friends: obj2.friends });
    expect(mergeDeep(obj1, obj2, obj3)).toEqual({ name: 'name3', friends: obj3.friends });

    // Expect originals not to change
    expect(obj1).toEqual({ name: 'name1', friends: ['a', 'b', 'c'] });
    expect(obj2).toEqual({ name: 'name2', friends: ['d', 'e', 'f'] });
    expect(obj3).toEqual({ name: 'name3', friends: ['a', 'e', 'b'] });
  });

  test('hashObject', () => {
    const o1 = { a: 'hello', b: 'ball' };
    const o2 = { b: 'ball', a: 'hello' };
    expect(hashObject(o1)).toEqual(hashObject(o2));
    expect(hashObject(doc)).toEqual(hashObject(doc2));
  });

  test('uniq', () => {
    expect(uniq(['a', 'b', 'c', 'a', 'd', 'b'])).toEqual(['a', 'b', 'c', 'd']);
  });

  test('keyPaths', () => {
    expect(keyPaths({ a: 'a' })).toEqual(['a']);
    expect(keyPaths({ a: { c: 'c' }, b: 'b' })).toEqual(['a.c', 'b']);
    expect(keyPaths({ a: { 'c.d': 'e', c: 'c' }, b: 'b' })).toEqual(['a.c.d', 'a.c', 'b']);
    expect(keyPaths({ 'authored.chapters': { name: 'citizen', 'pages.verbage': '*intro*' } })).toEqual(['authored.chapters.name', 'authored.chapters.pages.verbage']);
  });

  test('unravelObject', () => {
    expect(unravelObject({ a: 'a' })).toEqual({ a: 'a' });
    expect(unravelObject({ 'a.b.c': 'a' })).toEqual({ a: { b: { c: 'a' } } });
    expect(unravelObject({ 'a.b.c': 'a', 'a.b.d': 'e' })).toEqual({ a: { b: { c: 'a', d: 'e' } } });
    expect(unravelObject({ 'authored.chapters': { name: 'citizen', 'pages.verbage': '*intro*' } })).toEqual({ authored: { chapters: { name: 'citizen', pages: { verbage: '*intro*' } } } });
  });

  test('proxyDeep', () => {
    const trapFn = jest.fn((target, prop, rec) => {
      const value = Reflect.get(target, prop, rec);
      if (isScalarValue(value)) return 1;
      if (typeof value === 'function') return value.bind(target);
      if (Array.isArray(value)) return value.map(v => (isScalarValue(v) ? 1 : v));
      return value;
    });

    const proxy = proxyDeep(doc, { get: trapFn }).toObject();
    expect(trapFn).toHaveBeenCalledTimes(31);
    expect(proxy.name).toBe(1);
    expect(proxy.workplace.name).toBe(1);
    expect(proxy.workplace.address).toBe(1);
    expect(proxy.workplace.obj1).toEqual({ name: 1, friends: [1, 1, 1] });
    expect(proxy.family[0]).toEqual({ name: 1, friends: [1, 1, 1] });
    expect(trapFn).toHaveBeenCalledTimes(31);
  });
});
