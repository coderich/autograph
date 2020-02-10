const esm = require('esm')(module);
const isEmail = require('validator/lib/isEmail');

const { Quin, Rule } = esm('@coderich/quin');

// Adding new rules
Rule.factory('email', () => (f, v) => !isEmail(v));
Rule.factory('selfless', () => (f, v) => false);
Rule.factory('immutable', () => (f, v) => false);
Rule.factory('distinct', () => (f, v) => false);


// Adding Rules/Transformers
Quin.extend('email', Rule.email());
Quin.extend('bookName', Rule.deny('The Bible'));
Quin.extend('bookPrice', Rule.range(0, 100));
Quin.extend('artComment', Rule.allow('yay', 'great', 'boo'));
Quin.extend('colors', Rule.allow('blue', 'red', 'green', 'purple'));
Quin.extend('buildingType', Rule.allow('home', 'office', 'business'));
Quin.extend('selfless', Rule.selfless());
Quin.extend('immutable', Rule.immutable());
Quin.extend('distinct', Rule.distinct());

// Adding custom keys
Quin.custom('norepeat: Boolean');
Quin.custom('onDelete: OnDeleteEnum');
Quin.custom('indexes: [IndexInput!]');
