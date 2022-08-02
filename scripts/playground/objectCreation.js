// const person = {
//   isHuman: false,
//   printIntroduction: function() {
//     console.log(`My name is ${this.name}. Am I human? ${this.isHuman}`);
//   }
// };

// const me = Object.create(person);

// me.name = 'Matthew'; // "name" is a property set on "me", but not on "person"
// me.isHuman = true; // inherited properties can be overwritten

// me.printIntroduction();

const template = Object.create(null, {
  id: {
    get() { return this.$$services.data.id; },
    set(id) { this.$$services.data.id = id; },
    enumerable: true,
    configurable: true,
  },
  name: {
    get() { return this.$$services.data.name; },
    set(name) { this.$$services.data.name = name; },
    enumerable: true,
    configurable: true,
  },
});

const instance = Object.create(template, {
  $$services: {
    value: { data: { id: 1, name: 'rich' } },
    enumerable: false,
  },
});

const me = new Proxy(instance, {
  ownKeys(target) {
    return Reflect.ownKeys(target).concat('id', 'name');
  },
  getOwnPropertyDescriptor(target, prop) {
    return ['id', 'name'].indexOf(prop) > -1 ? { enumerable: true, configurable: true } : Reflect.getOwnPropertyDescriptor(target, prop);
  },
  getPrototypeOf() {
    return { $$services: instance.$$services };
  },
  deleteProperty(target, prop) {
    delete instance.$$services.data[prop];
  },
});

const you = new Proxy(Object.create(template, {
  $$services: {
    value: { data: { id: 2, name: 'susan' } },
    enumerable: false,
  },
}), {
  ownKeys(target) {
    return Reflect.ownKeys(target).concat('id', 'name');
  },
  getOwnPropertyDescriptor(target, prop) {
    return ['id', 'name'].indexOf(prop) > -1 ? { enumerable: true, configurable: true } : Reflect.getOwnPropertyDescriptor(target, prop);
  },
  getPrototypeOf() {
    return { $$services: template.$$services };
  },
  deleteProperty(target, prop) {
    console.log('delete', target, prop);
    delete template.$$services.data[prop];
  },
});

delete me.id;
// const clone = Object.create(Object.getPrototypeOf(me));
const us = Object.assign({}, me, { id: 4 });
// const us = { ...me, ...you };

console.log(me.name, me.id);
console.log(you.name, you.id);
console.log(us.name, us.id);
