const arr = Array.from(new Array(2000)).map((el, i) => ({ name: `name${i}` }));
const props = Array.from(new Array(20)).map((el, i) => `prop${i}`);

console.time('obj1');
arr.reduce((prev, curr) => {
  prev[curr.name] = curr.name;
  return prev;
}, {});
console.timeEnd('obj1');

console.time('obj2');
arr.reduce((prev, curr) => {
  return Object.assign(prev, { [curr.name]: curr.name });
}, {});
console.timeEnd('obj2');

console.time('obj3');
const obj3 = {};
arr.forEach((curr) => {
  obj3[curr.name] = curr.name;
});
console.timeEnd('obj3');

const def = props.reduce((prev, prop) => Object.assign(prev, { [prop]: { value: prop } }), {});

console.time('obj4');
arr.forEach((el) => {
  Object.defineProperties({}, def);
});
console.timeEnd('obj4');
