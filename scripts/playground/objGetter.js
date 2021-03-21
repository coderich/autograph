const timeout = ms => new Promise(res => setTimeout(res, ms));

const obj = Object.defineProperties({}, {
  name: {
    get() {
      return undefined;
    },
    enumerable: true,
  },
});

(async () => {
  const data = { age: 1, name: 'richard' };
  const merged = Object.assign(data, obj);
  console.log(merged);
  // console.log(obj.name);
  // await timeout(1000);
  // console.log(obj.name);
})();
