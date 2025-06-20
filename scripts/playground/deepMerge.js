const AppService = require('../../src/service/app.service');

const doc = { arr: ['a'] };
const input = {};
const merged = AppService.mergeDeep(doc, input);

console.log(merged, doc.arr, merged.arr, doc.arr === merged.arr);
