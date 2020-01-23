const ParentChildMap = require('../../src/data/ParentChildMap');

const map = new ParentChildMap();

// Parent child data
const grandparent = { name: 'grandparent' };
const parent1 = { name: 'parent1' };
const parent2 = { name: 'parent2' };
const child1 = { name: 'child1' };
const child2 = { name: 'child2' };
const child3 = { name: 'child3' };
const child4 = { name: 'child4' };

describe('ParentChildMap', () => {
  test('add', () => {
    map.add(undefined, grandparent);
    map.add(grandparent, parent1);
    map.add(parent1, child1);
    map.add(parent1, child2);
    map.add(grandparent, parent2);
    map.add(parent2, child3);

    const [root, grandchildren] = map.get(grandparent);
    expect(root).toBeDefined();
    expect(grandchildren.size).toBe(2);

    const [gp1, children1] = map.get(parent1);
    expect(gp1).toBeDefined();
    expect(children1.size).toBe(2);

    const [gp2, children2] = map.get(parent2);
    expect(gp2).toBeDefined();
    expect(children2.size).toBe(1);

    expect(gp1).toBe(gp2);

    const [p1, kids1] = map.get(child1);
    expect(kids1.size).toBe(0);
    expect(p1).toBe(grandchildren.get(parent1));

    const [p2, kids2] = map.get(child2);
    expect(kids2.size).toBe(0);
    expect(p2).toBe(grandchildren.get(parent1));

    expect(p1).toBe(p2);

    const [p3, kids3] = map.get(child3);
    expect(kids3.size).toBe(0);
    expect(p3).toBe(grandchildren.get(parent2));

    //
    p3.set(child4, new Map());
    const [a, b] = map.get(child4);
    expect(a).toBe(p3);
    expect(b.size).toBe(0);
  });

  test('elements', () => {
    expect(map.elements()).toEqual([grandparent, parent1, child1, child2, parent2, child3, child4]);
  });

  test('descendants', () => {
    expect(map.descendants(grandparent)).toEqual([parent1, child1, child2, parent2, child3, child4]);
    expect(map.descendants(parent1)).toEqual([child1, child2]);
    expect(map.descendants(parent2)).toEqual([child3, child4]);
    expect(map.descendants(child1)).toEqual([]);
  });

  // test('ascendants', () => {
  //   expect(map.ascendants(grandparent)).toEqual([]);
  //   expect(map.ascendants(parent1)).toEqual([grandparent]);
  //   expect(map.ascendants(parent2)).toEqual([child3, child4]);
  //   expect(map.ascendants(child1)).toEqual([]);
  // });

  test('remove', () => {
    const children = map.remove(parent1);
    expect(children.size).toBe(2);
    expect(map.get(parent1)).not.toBeDefined();
    // expect(() => map.get(parent1)).toThrow();
  });
});
