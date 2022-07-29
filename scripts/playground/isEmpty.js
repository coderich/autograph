const { isEmpty } = require('lodash');

console.log(isEmpty());
console.log(isEmpty(undefined));
console.log(isEmpty(null));
console.log(isEmpty([]));
console.log(isEmpty(100));
console.log(isEmpty(''));
console.log(isEmpty({}));
