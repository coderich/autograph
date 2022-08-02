const { MongoClient, ObjectId } = require('mongodb');

const $match = { network: new ObjectId('17aba99d5d50f55f1dd0e58b') };
const connection = MongoClient.connect('mongodb://127.0.0.1:27017/cm-dev?retryWrites=true&w=majority', { useUnifiedTopology: true });

exports.connect = () => connection;
exports.disconnect = () => connection.then(client => client.close());

exports.getCursor = async (client, args) => {
  const collection = client.db().collection('network_place');
  const aggregate = [{ $match }].concat(...args);
  return collection.aggregate(aggregate);
};
