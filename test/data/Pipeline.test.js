const { Method, Transformer, Rule } = require('../../src/data/Pipeline');

describe('Pipeline', () => {
  describe('Transformer', () => {
    test('define toUpperCase', () => {
      Transformer.define('toUpperCase', ({ value }) => value.toUpperCase());
      expect(Transformer.toUpperCase({ value: null })).toBeNull();
      expect(Transformer.toUpperCase({ value: 'paul' })).toBe('PAUL');
      expect(Transformer.toUpperCase({ value: ['rich', 'PaUL'] })).toEqual(['RICH', 'PAUL']);
      expect(Object.keys(Method)).toEqual(['toUpperCase']);
      expect(Object.values(Method).map(fn => fn.kind)).toEqual(['Transformer']);
    });
    test('factory toLowerCase', () => {
      Transformer.factory('toLowerCase', () => ({ value }) => value.toLowerCase());
      expect(Transformer.toLowerCase()({ value: 'RICH' })).toBe('rich');
      Transformer.define('toEvenLowerCase', Transformer.toLowerCase());
      expect(Transformer.toEvenLowerCase({ value: 'RICH' })).toBe('rich');
      expect(Object.keys(Method)).toEqual(['toUpperCase', 'toEvenLowerCase']);
      expect(Object.values(Method).map(fn => fn.kind)).toEqual(['Transformer', 'Transformer']);
    });
    test('errors throw', () => {
      expect(() => Transformer.define('toUpperCase', ({ value }) => value.toUpperCase())).toThrow();
      expect(() => Transformer.factory('toUpperCase', () => ({ value }) => value.toUpperCase())).toThrow();
      expect(() => Transformer.factory('toLowerCase', () => ({ value }) => value.toLowerCase())).toThrow();
      expect(() => Transformer.factory('toEvenLowerCase', () => ({ value }) => value.toLowerCase())).toThrow();
      expect(() => Transformer.factory('NoGood')).toThrow(); // No thunk
      expect(() => Transformer.factory('NoGood', {})).toThrow(); // Not a function
      expect(() => Transformer.factory('NoGood', ({ value }) => value.toUpperCase())).toThrow(); // Not a thunk
    });
    test('Configurables', () => {
      Transformer.define('toDate', ({ value }) => new Date(value), { configurable: true });
      expect(() => Transformer.define('toDate', ({ value }) => new Date(value))).not.toThrow();
      expect(() => Transformer.define('toDate', ({ value }) => new Date(value))).toThrow();

      Transformer.factory('prefixer', prefix => ({ value }) => `${prefix}${value}`, { configurable: true });
      Transformer.define('myPrefix', Transformer.prefixer('my'));
      expect(Transformer.myPrefix({ value: 'richard' })).toBe('myrichard');
      Transformer.define('yourPrefix', Transformer.prefixer('your'), { configurable: true });
      expect(Transformer.yourPrefix({ value: 'richard' })).toBe('yourrichard');
      Transformer.define('yourPrefix', Transformer.prefixer("you're"), { configurable: true });
      expect(Transformer.yourPrefix({ value: 'richard' })).toBe("you'rerichard");
      expect(Object.keys(Method)).toEqual(['toUpperCase', 'toEvenLowerCase', 'toDate', 'myPrefix', 'yourPrefix']);
    });
  });

  describe('Rule', () => {
    test('required', () => {
      Rule.define('required', ({ value }) => value != null, { ignoreNull: false, itemize: true });
      expect(Rule.required({ value: null })).toBe(false);
      // expect(Rule.required({ value: [null, null] })).toBe(true);
    });
  });
});
