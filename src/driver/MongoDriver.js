const { has } = require('lodash');
const { MongoClient, ObjectID } = require('mongodb');
const { proxyDeep, toKeyObj, globToRegex, proxyPromise } = require('../service/app.service');

module.exports = class MongoDriver {
  constructor(config, schema) {
    this.config = config;
    this.schema = schema;
    this.connection = this.connect();
  }

  connect() {
    return MongoClient.connect(this.config.uri, this.config.options);
  }

  raw(collection) {
    return proxyPromise(this.connection.then(client => client.db().collection(collection)));
  }

  query(collection, method, ...args) {
    if (has(args[args.length - 1], 'debug')) console.log(JSON.stringify(args));
    return this.raw(collection)[method](...args);
  }

  resolve(query) {
    query.where = MongoDriver.normalizeWhere(query.where);
    return this[query.method](query);
  }

  findOne({ key, select, where, flags }) {
    return this.query(key, 'findOne', where, flags);
  }

  findMany({ key, select, where, flags }) {
    return this.query(key, 'find', where, flags).then(cursor => cursor.toArray());
  }

  createOne({ key, data, flags }) {
    return this.query(key, 'insertOne', data, flags).then(result => Object.assign(data, { _id: result.insertedId }));
  }

  updateOne({ key, where, data, flags }) {
    return this.query(key, 'findOneAndUpdate', where, { $set: data }, { returnOriginal: false }, flags).then(result => result.value);
  }

  updateMany() {
    throw new Error('unsupported');
  }

  removeOne({ key, where, data, flags }) {
    return this.query(key, 'findOneAndDelete', where, { returnOriginal: false }, flags).then(result => result.value);
  }

  count({ key, where, flags }) {
    return this.query(key, 'countDocuments', where, flags);
  }

  dropModel(model) {
    return this.query(model, 'deleteMany');
  }

  createCollection(model) {
    return this.connection.then(client => client.db().createCollection(model)).catch(e => null);
  }

  createIndexes(model, indexes) {
    return Promise.all(indexes.map(({ name, type, on }) => {
      const $fields = on.reduce((prev, field) => Object.assign(prev, { [field]: 1 }), {});

      switch (type) {
        case 'unique': return this.query(model, 'createIndex', $fields, { name, unique: true });
        default: return null;
      }
    }));
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

  static normalizeWhere(where) {
    return proxyDeep(toKeyObj(where), {
      get(target, prop, rec) {
        const value = Reflect.get(target, prop, rec);
        if (Array.isArray(value)) return { $in: value };
        if (typeof value === 'function') return value.bind(target);
        if (typeof value === 'string') { return globToRegex(value, { nocase: true, regex: true }); }
        return value;
      },
    }).toObject();
  }
};
