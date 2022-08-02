const Mongo = require('./mongo');
const Hydrator = require('./hydrator');
const $project = require('./data/project');

const [method = 'Array', useProject = false] = process.argv.slice(2);

(async () => {
  const args = [];
  if (useProject) args.push({ $project });
  const client = await Mongo.connect();
  const cursor = await Mongo.getCursor(client, args);
  const data = await Hydrator[`from${method}`](cursor, args);
  await Mongo.disconnect();
  process.exit(0);
})();
