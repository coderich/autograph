const Rule = require('../src/schema/Rule');
const Quin = require('../src/schema/Quin');

Quin.extend('bookName', Rule.deny('The Bible'));
Quin.extend('bookPrice', Rule.range(0, 100));
Quin.extend('artComment', Rule.allow('yay', 'great', 'boo'));
Quin.extend('colors', Rule.allow('blue', 'red', 'green', 'purple'));
Quin.extend('buildingType', Rule.allow('home', 'office', 'business'));
