const esm = require('esm')(module);
const isEmail = require('validator/lib/isEmail');

const { Quin, Rule } = esm('@coderich/quin');

// Adding new rules
Rule.factory('email', () => v => !isEmail(v));
Rule.factory('selfless', () => v => false);
Rule.factory('immutable', () => v => false);
Rule.factory('distinct', () => v => false);
Rule.factory('idResolve', field => v => {
  return Rule.resolver.spot(field.getType()).id(v).one().then((doc) => {
    if (doc) return false;
    return true;
  });
});


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
