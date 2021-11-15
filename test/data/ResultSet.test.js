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
  let schema, resolver;

  beforeAll(async () => {
    // Setup
    ({ schema, resolver } = await setup());
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

  test('Magic mutation $$methods', async () => {
    // Create some people
    const [doc1, doc2] = await Promise.all([
      resolver.match('Person').save({ name: 'temp1', emailAddress: 'temp1@temp.com' }),
      resolver.match('Person').save({ name: 'temp2', emailAddress: 'temp2@temp.com' }),
    ]);
    expect(doc1).toBeDefined();
    expect(doc2).toBeDefined();

    // Update doc1 and save
    doc1.name = 'newname1';
    expect((await doc1.$$save()).name).toBe('Newname1');
    expect((await resolver.match('Person').id(doc1.id).one()).name).toBe('Newname1');

    // Update via a query
    const doc3 = await resolver.match('Person').id(doc1).one();
    expect((await doc3.$$save({ name: 'newname2' })).name).toBe('Newname2');
    expect((await resolver.match('Person').id(doc3.id).one()).name).toBe('Newname2');

    // Leave doc2 alone but save
    expect((await doc2.$$save()).name).toBe('Temp2');
    expect((await resolver.match('Person').id(doc2.id).one()).name).toBe('Temp2');

    // Delete both docs
    await Promise.all([doc1.$$delete(), doc2.$$remove()]);
    expect((await resolver.match('Person').id(doc1.id).one())).toBeNull();
    expect((await resolver.match('Person').id(doc2.id).one())).toBeNull();
  });
});
