Error.stackTraceLimit = 50;

const Validator = require('validator');
const Rule = require('../src/core/Rule');

Rule.factory('email', () => (f, v) => !Validator.isEmail(v), { enumerable: true });
// Rule.extend('bookName', Rule.deny('The Bible'));
// Rule.extend('bookPrice', Rule.range(0, 100));
// Rule.extend('artComment', Rule.allow('yay', 'great', 'boo'));
// Rule.extend('colors', Rule.allow('blue', 'red', 'green', 'purple'));
// Rule.extend('buildingType', Rule.allow('home', 'office', 'business'));
