const Pipeline = require('../../src/data/Pipeline');

describe('Pipeline', () => {
  test('define toUpperCase', () => {
    Pipeline.define('toUpperCase', ({ value }) => value.toUpperCase());
    expect(Pipeline.toUpperCase({ value: null })).toBeNull();
    expect(Pipeline.toUpperCase({ value: 'paul' })).toBe('PAUL');
    expect(Pipeline.toUpperCase({ value: ['rich', 'PaUL'] })).toEqual(['RICH', 'PAUL']);
    expect(Object.keys(Pipeline)).toEqual(expect.arrayContaining(['toUpperCase']));
  });
  test('factory toLowerCase', () => {
    Pipeline.factory('toLowerCase', () => ({ value }) => value.toLowerCase());
    expect(Pipeline.toLowerCase()({ value: 'RICH' })).toBe('rich');
    Pipeline.define('toEvenLowerCase', Pipeline.toLowerCase());
    expect(Pipeline.toEvenLowerCase({ value: 'RICH' })).toBe('rich');
    expect(Object.keys(Pipeline)).toEqual(expect.arrayContaining(['toUpperCase', 'toEvenLowerCase']));
  });
  test('errors throw', () => {
    expect(() => Pipeline.define('toUpperCase', ({ value }) => value.toUpperCase())).toThrow();
    expect(() => Pipeline.factory('toUpperCase', () => ({ value }) => value.toUpperCase())).toThrow();
    expect(() => Pipeline.factory('toLowerCase', () => ({ value }) => value.toLowerCase())).toThrow();
    expect(() => Pipeline.factory('toEvenLowerCase', () => ({ value }) => value.toLowerCase())).toThrow();
    expect(() => Pipeline.factory('NoGood')).toThrow(); // No thunk
    expect(() => Pipeline.factory('NoGood', {})).toThrow(); // Not a function
    expect(() => Pipeline.factory('NoGood', ({ value }) => value.toUpperCase())).toThrow(); // Not a thunk
  });
  test('Configurables', () => {
    Pipeline.define('toDate', ({ value }) => new Date(value), { configurable: true });
    expect(() => Pipeline.define('toDate', ({ value }) => new Date(value))).not.toThrow();
    expect(() => Pipeline.define('toDate', ({ value }) => new Date(value))).toThrow();
    Pipeline.factory('prefixer', prefix => ({ value }) => `${prefix}${value}`, { configurable: true });
    Pipeline.define('myPrefix', Pipeline.prefixer('my'));
    expect(Pipeline.myPrefix({ value: 'richard' })).toBe('myrichard');
    Pipeline.define('yourPrefix', Pipeline.prefixer('your'), { configurable: true });
    expect(Pipeline.yourPrefix({ value: 'richard' })).toBe('yourrichard');
    Pipeline.define('yourPrefix', Pipeline.prefixer("you're"), { configurable: true });
    expect(Pipeline.yourPrefix({ value: 'richard' })).toBe("you'rerichard");
    expect(Object.keys(Pipeline)).toEqual(expect.arrayContaining(['toUpperCase', 'toEvenLowerCase', 'toDate', 'myPrefix', 'yourPrefix']));
  });
  test('required', () => {
    Pipeline.define('required', ({ value }) => value != null, { ignoreNull: true, itemize: false });
    // expect(Pipeline.required({ value: null })).toBe(false);
    expect(Pipeline.required({ value: [null, null] })).toBe(true);
  });
});
