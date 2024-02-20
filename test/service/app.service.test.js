const { get } = require('lodash');
const { ObjectID } = require('mongodb');
const AppService = require('../../src/service/app.service');

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
    expect(AppService.isPlainObject(ObjectID('abclghalnohe'))).toBe(false);
    expect(AppService.isPlainObject([])).toBe(false);
    expect(AppService.isPlainObject({})).toBe(true);
  });

  test('mergeDeep', () => {
    // Expect concatenation
    expect(AppService.mergeDeep(obj1, obj2)).toEqual({ name: 'name2', friends: obj2.friends });
    expect(AppService.mergeDeep(obj1, obj2, obj3)).toEqual({ name: 'name3', friends: obj3.friends });

    // Expect originals not to change
    expect(obj1).toEqual({ name: 'name1', friends: ['a', 'b', 'c'] });
    expect(obj2).toEqual({ name: 'name2', friends: ['d', 'e', 'f'] });
    expect(obj3).toEqual({ name: 'name3', friends: ['a', 'e', 'b'] });
  });

  test('getDeep', () => {
    expect(AppService.getDeep(doc2, 'workplace.obj1')).toBe(obj1);
    expect(AppService.getDeep(doc2, 'workplace.obj1.name')).toBe('name1');
    expect(AppService.getDeep(doc2, 'family.name')).toEqual(['name1', 'name2', 'name3']);
    expect(AppService.getDeep(doc2, 'family.friends')).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'a', 'e', 'b']);
  });

  test('hashObject', () => {
    const o1 = { a: 'hello', b: 'ball' };
    const o2 = { b: 'ball', a: 'hello' };
    const query1 = {
      cmd: 'resolve',
      method: 'count',
      native: { categories: new ObjectID('5e0807d30e52c16c7e7aad74') },
      where: { categories: new ObjectID('5e0807d30e52c16c7e7aad74') },
      search: undefined,
      sort: undefined,
      skip: undefined,
      limit: undefined,
      before: undefined,
      after: undefined,
      first: undefined,
      last: undefined,
      options: {},
    };
    const query2 = {
      cmd: 'resolve',
      method: 'count',
      native: { categories: new ObjectID('5e0807d30e52c16c7e7aad70') },
      where: { categories: new ObjectID('5e0807d30e52c16c7e7aad70') },
      search: undefined,
      sort: undefined,
      skip: undefined,
      limit: undefined,
      before: undefined,
      after: undefined,
      first: undefined,
      last: undefined,
      options: {},
    };

    expect(AppService.hashObject(o1)).toEqual(AppService.hashObject(o2));
    expect(AppService.hashObject(doc)).toEqual(AppService.hashObject(doc2));
    expect(AppService.hashObject(query1)).not.toEqual(AppService.hashObject(query2));
  });

  test('uniq', () => {
    expect(AppService.uniq(['a', 'b', 'c', 'a', 'd', 'b'])).toEqual(['a', 'b', 'c', 'd']);
  });

  test('keyPathObj, keyPaths', () => {
    expect(AppService.keyPaths({ a: 'a' })).toEqual(['a']);
    expect(AppService.keyPaths({ a: { c: 'c' }, b: 'b' })).toEqual(['a.c', 'b']);
    expect(AppService.keyPaths({ a: { 'c.d': 'e', c: 'c' }, b: 'b' })).toEqual(['a.c.d', 'a.c', 'b']);
    expect(AppService.keyPaths({ 'authored.chapters': { name: 'citizen', 'pages.verbage': '*intro*' } })).toEqual(['authored.chapters.name', 'authored.chapters.pages.verbage']);
  });

  test('keyPathLeafs', () => {
    expect(AppService.keyPathLeafs({ a: 'a' })).toEqual(['a']);
    expect(AppService.keyPathLeafs({ a: { c: 'c' }, b: 'b' })).toEqual(['b', 'a.c']);
    expect(AppService.keyPathLeafs({ a: { 'c.d': 'e', c: 'c' }, b: 'b' })).toEqual(['b', 'a.c.d']);
    expect(AppService.keyPathLeafs({ 'authored.chapters': { name: 'citizen', 'pages.verbage': '*intro*' } })).toEqual(['authored.chapters.pages.verbage', 'authored.chapters.name']);
  });

  test('unravelObject', () => {
    expect(AppService.unravelObject({ a: 'a' })).toEqual({ a: 'a' });
    expect(AppService.unravelObject({ 'a.b.c': 'a' })).toEqual({ a: { b: { c: 'a' } } });
    expect(AppService.unravelObject({ 'a.b.c': 'a', 'a.b.d': 'e' })).toEqual({ a: { b: { c: 'a', d: 'e' } } });
    expect(AppService.unravelObject({ 'authored.chapters': { name: 'citizen', 'pages.verbage': '*intro*' } })).toEqual({ authored: { chapters: { name: 'citizen', pages: { verbage: '*intro*' } } } });
  });

  test('proxyDeep', () => {
    const trapFn = jest.fn((target, prop, rec) => {
      const value = Reflect.get(target, prop, rec);
      if (AppService.isScalarValue(value)) return 1;
      if (typeof value === 'function') return value.bind(target);
      if (Array.isArray(value)) return value.map(v => (AppService.isScalarValue(v) ? 1 : v));
      return value;
    });

    const proxy = AppService.proxyDeep(doc, { get: trapFn }).toObject();
    expect(trapFn).toHaveBeenCalledTimes(31);
    expect(proxy.name).toBe(1);
    expect(proxy.workplace.name).toBe(1);
    expect(proxy.workplace.address).toBe(1);
    expect(proxy.workplace.obj1).toEqual({ name: 1, friends: [1, 1, 1] });
    expect(proxy.family[0]).toEqual({ name: 1, friends: [1, 1, 1] });
    expect(trapFn).toHaveBeenCalledTimes(31);
  });

  test('removeUndefinedDeep', () => {
    expect({ a: undefined }).toEqual({});
    expect(AppService.removeUndefinedDeep({ a: 1 })).toEqual({ a: 1 });
    expect(AppService.removeUndefinedDeep({ a: undefined })).toEqual({});
    expect(AppService.removeUndefinedDeep({ a: { b: 'b', c: false, d: undefined } })).toEqual({ a: { b: 'b', c: false } });
  });

  test('getGQLReturnType', () => {
    // Array
    expect(AppService.getGQLReturnType('[Int]!')).toBe('array');
    expect(AppService.getGQLReturnType('[Float]!')).toBe('array');
    expect(AppService.getGQLReturnType('[Array]')).toBe('array');
    expect(AppService.getGQLReturnType('[Array]!')).toBe('array');
    expect(AppService.getGQLReturnType('[Array!]!')).toBe('array');
    expect(AppService.getGQLReturnType('[MyConnection]!')).toBe('array');

    // Connection
    expect(AppService.getGQLReturnType('MyConnection')).toBe('connection');
    expect(AppService.getGQLReturnType('MyConnection!')).toBe('connection');

    // number
    expect(AppService.getGQLReturnType('Int')).toBe('number');
    expect(AppService.getGQLReturnType('Int!')).toBe('number');
    expect(AppService.getGQLReturnType('Float')).toBe('number');
    expect(AppService.getGQLReturnType('Float!')).toBe('number');

    // scalar
    expect(AppService.getGQLReturnType('Person')).toBe('scalar');
    expect(AppService.getGQLReturnType('Intt')).toBe('scalar');
    expect(AppService.getGQLReturnType('aFloat')).toBe('scalar');
    expect(AppService.getGQLReturnType('Connection')).toBe('scalar');
    expect(AppService.getGQLReturnType('Connectionn')).toBe('scalar');
  });

  test('seek', () => {
    const obj = {
      name: 'richard',
      sections: [
        { name: 'section1' },
        { name: 'section2', hint: 'two' },
        { name: 'section3', hint: 'three' },
        { name: 'section3', sections: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }, { id: 3, name: 'c' }] },
      ],
    };
    expect(get(obj.sections, ['0', 'name'])).toBe('section1');
    expect(AppService.seek(obj, 'name')).toBe('richard');
    expect(AppService.seek(obj, ['name'])).toBe('richard');
    expect(AppService.seek(obj, 'sections.name')).toBeUndefined();
    expect(AppService.seek(obj, 'sections.name', { name: 'section1' })).toBe('section1');
    expect(AppService.seek(obj, 'sections.name', { name: 'section2' })).toBe('section2');
    expect(AppService.seek(obj, 'sections.name', { hint: 'three' })).toBe('section3');
    expect(AppService.seek(obj, 'sections.sections.name', { id: 2 })).toBe('b');
    expect(AppService.seek(obj, 'sections.sections.name', { id: '2' })).toBe('b');
  });
});
