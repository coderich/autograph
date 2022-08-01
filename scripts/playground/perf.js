const Schema = require('../../src/core/Schema');
const Query = require('../../src/query/Query');
const ResultSet = require('../../src/data/ResultSet');
const gqlSchema = require('../../test/fixtures/schema');
const stores = require('../../test/stores');

const arr = Array.from(new Array(4000)).map((el, i) => ({ name: `name${i}`, age: `age${i}` }));
const props = Array.from(new Array(20)).map((el, i) => `prop${i}`);
const schema = new Schema(gqlSchema, stores);
const model = schema.getModel('Person');

console.time('reduce');
arr.reduce((prev, curr) => {
  prev[curr.name] = curr.name;
  return prev;
}, {});
console.timeEnd('reduce');

console.time('reduceAssign');
arr.reduce((prev, curr) => {
  return Object.assign(prev, { [curr.name]: curr.name });
}, {});
console.timeEnd('reduceAssign');

console.time('forEach');
const obj3 = {};
arr.forEach((curr) => {
  obj3[curr.name] = curr.name;
});
console.timeEnd('forEach');

const defineProperties = props.reduce((prev, prop) => Object.assign(prev, { [prop]: { value: prop } }), {});

console.time('defineProperties');
arr.forEach((el) => {
  Object.defineProperties({}, defineProperties);
});
console.timeEnd('defineProperties');

console.time('proxy');
arr.forEach((el) => {
  const idk = new Proxy(props, {
    ownKeys: () => props.keys(),
  });
});
console.timeEnd('proxy');


console.time('ResultSet');
arr.forEach((el) => {
  new ResultSet(new Query({ model }), el);
});
console.timeEnd('ResultSet');

// const val = (() => Promise.resolve('1000'))();
// console.log(val === '1000');
process.exit(0);
