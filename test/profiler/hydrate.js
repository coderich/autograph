// Pretend DB results
const results = Array.from(new Array(1000)).map((el, i) => {
  return {
    id: i,
    name: `NAME-${i}`,
  };
});

console.time('beginLowercase');
const resultSet = results.map((r) => {
  return new Proxy(r, {});
  // return Object.assign(r, { name: r.name.toLowerCase() });
  // return { ...r, name: r.name.toLowerCase() };
});
console.timeEnd('beginLowercase');
