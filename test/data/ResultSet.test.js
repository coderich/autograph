const ResultSet = require('../../src/data/ResultSet');

const data = Array.from(new Array(2000)).map((el, i) => ({
  age: `age${i}`,
  name: `name${i}`,
  nickname: `nickname${i}`,
  title: `title${i}`,
  description: `description${i}`,
}));

const schema = {
  age: {
    key: 'age',
  },
  name: {
    key: 'name',
  },
  nick: {
    key: 'nickname',
  },
  title: {
    key: 'title',
  },
  description: {
    key: 'description',
  },
};

describe('ResultSet', () => {
  test('speed test', () => {
    let start = new Date().getTime();
    const t1 = data.map(({ age, name, nickname, title, description }) => ({ age, name, nickname, title, description }));
    let stop = new Date().getTime();
    console.log(stop - start);

    start = new Date().getTime();
    const RS = new ResultSet(data, schema);
    const t2 = RS.map(({ age, name, nick, title, description }) => ({ age, name, nickname: nick, title, description }));
    stop = new Date().getTime();
    console.log(stop - start);
    expect(t1).toMatchObject(t2);
  });
});
