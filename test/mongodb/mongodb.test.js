const { ObjectID } = require('mongodb');

describe('mongodb', () => {
  test('ObjectID', () => {
    expect(ObjectID('5d26950bc0dc5d5b305ca661').toString()).toEqual('5d26950bc0dc5d5b305ca661');
    // expect(ObjectID(undefined)).toEqual('5d26950bc0dc5d5b305ca661');
  });
});
