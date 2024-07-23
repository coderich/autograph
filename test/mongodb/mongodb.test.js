const { ObjectId } = require('mongodb');

describe('mongodb', () => {
  test('ObjectId', () => {
    expect(new ObjectId('5d26950bc0dc5d5b305ca661').toString()).toEqual('5d26950bc0dc5d5b305ca661');
  });
});
