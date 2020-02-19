const Rule = require('../src/graphql/Rule');
const Schema = require('../src/graphql/Schema');

Schema.extend('bookName', Rule.deny('The Bible'));
Schema.extend('bookPrice', Rule.range(0, 100));
Schema.extend('artComment', Rule.allow('yay', 'great', 'boo'));
Schema.extend('colors', Rule.allow('blue', 'red', 'green', 'purple'));
Schema.extend('buildingType', Rule.allow('home', 'office', 'business'));
