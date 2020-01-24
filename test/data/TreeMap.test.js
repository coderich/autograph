const TreeMap = require('../../src/data/TreeMap');

const map = new TreeMap();

// Parent child data
const outsider = { name: 'outsider' };
const grandparent = { name: 'grandparent' };
const parent1 = { name: 'parent1' };
const parent2 = { name: 'parent2' };
const child1 = { name: 'child1' };
const child2 = { name: 'child2' };
const child3 = { name: 'child3' };
const child4 = { name: 'child4' };

describe('TreeMap', () => {
  test('add', () => {
    // Line 1
    map.add(grandparent);
    map.add(grandparent, parent1);
    map.add(parent1, child1);
    map.add(parent1, child2);
    map.add(grandparent, parent2);
    map.add(parent2, child3);

    // Line 2
    map.add(undefined, outsider);

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
    expect(map.elements()).toEqual([grandparent, parent1, child1, child2, parent2, child3, child4, outsider]);
  });

  test('descendants', () => {
    expect(map.descendants(grandparent)).toEqual([parent1, child1, child2, parent2, child3, child4]);
    expect(map.descendants(parent1)).toEqual([child1, child2]);
    expect(map.descendants(parent2)).toEqual([child3, child4]);
    expect(map.descendants(child1)).toEqual([]);
  });

  test('ascendants', () => {
    expect(map.ascendants(grandparent)).toEqual([]);
    expect(map.ascendants(parent1)).toEqual([grandparent]);
    expect(map.ascendants(parent2)).toEqual([grandparent]);
    expect(map.ascendants(child1)).toEqual([grandparent, parent1]);
    expect(map.ascendants(child2)).toEqual([grandparent, parent1]);
    expect(map.ascendants(child3)).toEqual([grandparent, parent2]);
    expect(map.ascendants(child4)).toEqual([grandparent, parent2]);
  });

  test('siblings', () => {
    expect(map.siblings(grandparent)).toEqual([]);
    expect(map.siblings(parent1)).toEqual([parent2]);
    expect(map.siblings(parent2)).toEqual([parent1]);
    expect(map.siblings(child1)).toEqual([child2]);
    expect(map.siblings(child2)).toEqual([child1]);
    expect(map.siblings(child3)).toEqual([child4]);
    expect(map.siblings(child4)).toEqual([child3]);
  });

  test('lineage', () => {
    expect(map.lineage(grandparent)).toEqual([grandparent, parent1, child1, child2, parent2, child3, child4]);
    expect(map.lineage(parent1)).toEqual([grandparent, parent1, child1, child2, parent2, child3, child4]);
    expect(map.lineage(parent2)).toEqual([grandparent, parent1, child1, child2, parent2, child3, child4]);
    expect(map.lineage(child1)).toEqual([grandparent, parent1, child1, child2, parent2, child3, child4]);
    expect(map.lineage(child2)).toEqual([grandparent, parent1, child1, child2, parent2, child3, child4]);
    expect(map.lineage(child3)).toEqual([grandparent, parent1, child1, child2, parent2, child3, child4]);
    expect(map.lineage(child4)).toEqual([grandparent, parent1, child1, child2, parent2, child3, child4]);
    expect(map.lineage(outsider)).toEqual([outsider]);
  });

  test('remove', () => {
    const children = map.remove(parent1);
    expect(children.size).toBe(2);
    expect(map.get(parent1)).not.toBeDefined();
    expect(() => map.add(parent1, {})).toThrow();
  });
});
