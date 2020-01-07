const { range } = require('../../src/service/rule.service');

describe('RuleService', () => {
  test('range', async () => {
    const isMatch = range(0, 100);
    expect(() => isMatch(null)).not.toThrow();
    expect(() => isMatch('0')).not.toThrow();
    expect(() => isMatch('9')).not.toThrow();
    expect(() => isMatch('98')).not.toThrow();
    expect(() => isMatch('100')).not.toThrow();
    expect(() => isMatch('0.00')).not.toThrow();
    expect(() => isMatch('9.5')).not.toThrow();
    expect(() => isMatch('13.45')).not.toThrow();
    expect(() => isMatch('13.459')).not.toThrow();

    expect(() => isMatch('-1')).toThrow();
    expect(() => isMatch('13.4.9')).toThrow();
    expect(() => isMatch('101')).toThrow();
    expect(() => isMatch('100.01')).toThrow();

    const lowerBound = range(1);
    expect(() => lowerBound(1)).not.toThrow();
    expect(() => lowerBound(5)).not.toThrow();
    expect(() => lowerBound(50000)).not.toThrow();
    expect(() => lowerBound(0)).toThrow();

    const upperBound = range(null, 100);
    expect(() => upperBound(1)).not.toThrow();
    expect(() => upperBound(5)).not.toThrow();
    expect(() => upperBound(-100)).not.toThrow();
    expect(() => upperBound(50000)).toThrow();
  });
});
