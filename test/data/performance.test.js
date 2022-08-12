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
});
