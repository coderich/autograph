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
    if (has(args[args.length - 1], 'debug')) console.log(method, JSON.stringify(args));
    return this.raw(collection)[method](...args);
  }

  resolve(query) {
    query.where = MongoDriver.normalizeWhere(query.where);
    return this[query.method](query);
  }

  get({ model, where, flags }) {
    return this.query(model, 'findOne', where, flags);
  }

  find({ model, where, flags }) {
    return this.query(model, 'find', where, flags).then(cursor => cursor.toArray());
  }

  count({ model, where, flags }) {
    return this.query(model, 'countDocuments', where, flags);
  }

  create({ model, input, flags }) {
    return this.query(model, 'insertOne', input, flags).then(result => result.insertedId);
  }

  update({ model, where, $doc, flags }) {
    const $update = Object.entries($doc).reduce((prev, [key, value]) => {
      Object.assign(prev.$set, { [key]: value });
      return prev;
    }, { $set: {} });

    return this.query(model, 'updateOne', where, $update, flags);
  }

  delete({ model, where, flags }) {
    return this.query(model, 'deleteOne', where, flags);
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
