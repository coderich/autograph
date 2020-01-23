module.exports = class ParentChildMap {
  constructor() {
    this.map = new Map();
    this.throw = (e = 'Parent not found') => { throw new Error(e); };
  }

  add(parent, child) {
    if (parent) {
      const [, map] = this.get(parent) || this.throw();
      map.set(child, new Map());
    } else {
      this.map.set(child, new Map());
    }
  }

  get(parent, map = this.map) {
    if (map.has(parent)) return [map, map.get(parent)];

    return Array.from(map.values()).reduce((value, child) => {
      if (value) return value;
      return this.get(parent, child);
    }, undefined);
  }

  remove(parent) {
    const [map] = this.get(parent) || this.throw();
    const el = map.get(parent);
    map.delete(parent);
    return el;
  }

  elements(map = this.map) {
    return Array.from(map.entries()).reduce((prev, [key, value]) => {
      return prev.concat(key).concat(this.elements(value));
    }, []);
  }

  ascendants(parent) {
    if (!this.get(parent)) this.throw();

    const traverse = (e) => {
      return Array.from(e.entries()).reduce((prev, [key, value]) => {
        const descendants = this.descendants(key);
        if (descendants.indexOf(parent) > -1) prev.push(key);
        return prev.concat(traverse(value));
      }, []);
    };

    return traverse(this.map);
  }

  descendants(parent) {
    const [, map] = this.get(parent) || this.throw();
    return this.elements(map);
  }
};
