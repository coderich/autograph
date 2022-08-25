const setup = require('../setup');
const Query = require('../../src/query/Query');
const { ucFirst } = require('../../src/service/app.service');

let query;

const data = Array.from(new Array(6000)).map((el, i) => ({
  my_age: `my_age${i}`,
  name: `name${i}`,
  state: `state${i}`,
  telephone: `telephone${i}`,
  sections: [{ name: 'SECTION1' }, { name: 'SecTioN2' }, { name: 'Section3' }],
}));

describe('Data Performance', () => {
  let schema, resolver, model, shape;

  beforeAll(async () => {
    // Setup
    ({ schema, resolver } = await setup());
    model = schema.getModel('Person');
    query = new Query({ resolver, model });
    shape = model.getShape();
  });

  test('speed test', async () => {
    console.time('map');
    const t1 = data.map(({ my_age: age, name, state, telephone, sections }) => ({
      age,
      name: ucFirst(name),
      status: state,
      telephone,
      network: 'network',
      sections: sections.map(section => ({
        name: section.name.toLowerCase(),
        frozen: 'frozen',
      })),
    }));
    console.timeEnd('map');

    console.time('shape');
    const t2 = model.shapeObject(shape, data, query);
    console.timeEnd('shape');

    expect(t2).toMatchObject(t1);
  });

  test('Magic mutation $methods', async () => {
    // Create some people
    const [doc1, doc2] = await Promise.all([
      resolver.match('Person').save({ name: 'temp1', emailAddress: 'temp1@temp.com' }),
      resolver.match('Person').save({ name: 'temp2', emailAddress: 'temp2@temp.com' }),
    ]);
    expect(doc1).toBeDefined();
    expect(doc2).toBeDefined();

    // Update doc1 and save
    doc1.name = 'newname1';
    expect((await doc1.$save()).name).toBe('Newname1');
    expect((await resolver.match('Person').id(doc1.id).one()).name).toBe('Newname1');

    // Update via a query
    const doc3 = await resolver.match('Person').id(doc1).one();
    expect((await doc3.$save({ name: 'newname2' })).name).toBe('Newname2');
    expect((await resolver.match('Person').id(doc3.id).one()).name).toBe('Newname2');

    // Leave doc2 alone but save
    expect((await doc2.$save()).name).toBe('Temp2');
    expect((await resolver.match('Person').id(doc2.id).one()).name).toBe('Temp2');

    // Delete both docs
    await Promise.all([doc1.$delete(), doc2.$remove()]);
    expect((await resolver.match('Person').id(doc1.id).one())).toBeNull();
    expect((await resolver.match('Person').id(doc2.id).one())).toBeNull();
  });
});
