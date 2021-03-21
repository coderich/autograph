const arr = Array.from(new Array(2000)).map((el, i) => ({ name: `name${i}` }));

console.time('obj1');
const obj1 = arr.reduce((prev, curr) => {
  prev[curr.name] = curr.name;
  return prev;
}, {});
console.timeEnd('obj1');

console.time('obj2');
const obj2 = arr.reduce((prev, curr) => {
  return Object.assign(prev, { [curr.name]: curr.name });
}, {});
console.timeEnd('obj2');

console.time('obj3');
const obj3 = {};
arr.forEach((curr) => {
  obj3[curr.name] = curr.name;
});
console.timeEnd('obj3');
