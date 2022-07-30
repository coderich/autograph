const template = Object.defineProperties({}, {
  name: {
    get() {
      return this.$data.name;
    },
  },
});

const me = Object.create(template);
const you = Object.create(template);

me.$data = { name: 'richard' };
you.$data = { name: 'susan' };
console.log(me.name);
console.log(you.name);
