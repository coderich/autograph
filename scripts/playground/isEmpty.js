const { isEmpty } = require('lodash');
const { ObjectId } = require('mongodb');

console.log(isEmpty());
console.log(isEmpty(undefined));
console.log(isEmpty(null));
console.log(isEmpty([]));
console.log(isEmpty(100));
console.log(isEmpty(''));
console.log(isEmpty({}));
console.log(isEmpty(ObjectId('5d5110693fb0490f1fc07b5b')));
