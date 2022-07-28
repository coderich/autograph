const timeout = ms => new Promise(res => setTimeout(res, ms));

(async () => {
  console.log('one');

  Promise.resolve().then(() => {
    console.log('two');
  });

  console.log('three');

  await timeout(100);
  process.exit(0);
})();
