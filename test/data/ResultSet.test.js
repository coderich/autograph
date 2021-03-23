const setup = require('../setup');
const Query = require('../../src/query/Query');
const ResultSet = require('../../src/data/ResultSet');
const { ucFirst } = require('../../src/service/app.service');

let query;

const data = Array.from(new Array(2000)).map((el, i) => ({
  my_age: `my_age${i}`,
  name: `name${i}`,
  state: `state${i}`,
  telephone: `telephone${i}`,
}));

describe('ResultSet', () => {
  beforeAll(async () => {
    // Setup
    const { schema, resolver } = await setup();
    const model = schema.getModel('Person');
    query = new Query({ resolver, model });
  });

  test('speed test', () => {
    let start = new Date().getTime();
    const t1 = data.map(({ my_age: age, name, state, telephone }) => ({ age, name: ucFirst(name), state, telephone }));
    let stop = new Date().getTime();
    console.log(stop - start);

    start = new Date().getTime();
    const RS = new ResultSet(query, data);
    const t2 = RS.map(({ age, name, status, telephone }) => ({ age, name, state: status, telephone }));
    stop = new Date().getTime();
    console.log(stop - start);
    expect(t1).toMatchObject(t2);
  });

  test('Object keys', () => {
    const [item] = new ResultSet(query, data);
    const obj = item.toObject();
    expect(item).toMatchObject(obj);
    expect(obj).not.toMatchObject(item); // This is because rs has undefined values!!!
  });
});
