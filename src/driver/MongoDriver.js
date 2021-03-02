const { MongoClient, ObjectID } = require('mongodb');
// const { toKeyObj } = require('../service/app.service');

module.exports = class MongoDriver {
  constructor(config, schema) {
    this.config = config;
    this.schema = schema;
    this.connection = this.connect();
  }

  connect() {
    return MongoClient.connect(this.config.uri, this.config.options);
  }

  query(collection, method, ...args) {
    return this.connection.then(client => client.db().collection(collection)[method](...args));
  }

  findOne({ key, select, where }) {
    return this.query(key, 'findOne', where);
  }

  findMany({ key, select, where }) {
    return this.query(key, 'find', where).then(cursor => cursor.toArray());
  }

  createOne({ key, data }) {
    return this.query(key, 'insertOne', data).then(result => Object.assign(data, { _id: result.insertedId }));
  }

  updateOne({ key, where, data }) {
    return this.query(key, 'findOneAndUpdate', where, { $set: data }, { returnOriginal: false }).then(result => result.value);
  }

  static idKey() {
    return '_id';
  }

  static idValue(value) {
    if (value instanceof ObjectID) return value;

    try {
      const id = ObjectID(value);
      return id;
    } catch (e) {
      return value;
    }
  }
};
