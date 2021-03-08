const { get, has } = require('lodash');
const { MongoClient, ObjectID } = require('mongodb');
const { proxyDeep, toKeyObj, globToRegex, proxyPromise, isScalarDataType, promiseRetry } = require('../service/app.service');

module.exports = class MongoDriver {
  constructor(config, schema) {
    this.config = config;
    this.schema = schema;
    this.connection = this.connect();
    this.getDirectives = () => get(config, 'directives', {});
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
    const { isNative } = query;
    if (!isNative) query.where = MongoDriver.normalizeWhere(query.where);
    return this[query.method](query);
  }

  get(query) {
    return this.find(Object.assign(query, { first: 1 })).then(docs => docs[0]);
  }

  find(query) {
    const { model, flags } = query;
    return this.query(model, 'aggregate', MongoDriver.facetQuery(query), flags).then(cursor => cursor.next()).then(facet => facet.docs);
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

  async transaction(ops) {
    const promise = async () => {
      // Create session and start transaction
      const session = await this.connection.then(client => client.startSession({ readPreference: { mode: 'primary' } }));
      session.startTransaction({ readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' } });
      const close = () => { session.endSession(); };

      // Execute each operation with session
      return Promise.all(ops.map(op => op.exec({ session }))).then((results) => {
        results.$commit = () => session.commitTransaction().then(close);
        results.$rollback = () => session.abortTransaction().then(close);
        return results;
      }).catch((e) => {
        close();
        throw e;
      });
    };

    // Retry promise conditionally
    return promiseRetry(promise, 200, 5, e => e.errorLabels && e.errorLabels.indexOf('TransientTransactionError') > -1);
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

  static getAddFields(query) {
    const { schema, where } = query;

    return Object.entries(schema).reduce((prev, [key, type]) => {
      const value = where[key];
      if (value === undefined) return prev;
      if (!isScalarDataType(type)) return false;
      const stype = String((type === 'Float' || type === 'Int' ? 'Number' : type)).toLowerCase();
      if (String(typeof value) === `${stype}`) return prev;
      return Object.assign(prev, { [key]: { $toString: `$${key}` } });
    }, {});
  }

  static facetQuery(query) {
    const { where: $match, sort, skip, limit } = query;
    const $facet = { docs: [{ $match }] };
    const $aggregate = [{ $facet }];

    // Used for $regex matching
    const $addFields = MongoDriver.getAddFields(query);
    if (Object.keys($addFields).length) $facet.docs.unshift({ $addFields });

    // Sort, Skip, Limit documents
    if (sort && Object.keys(sort).length) $facet.docs.push({ $sort: Object.assign(sort, { _id: -1 }) });
    if (skip) $facet.docs.push({ $skip: skip });
    if (limit) $facet.docs.push({ $limit: limit });

    const { after, before, first, last } = query;

    if (after) {
      $aggregate.push({
        $project: {
          docs: {
            $filter: {
              input: '$docs',
              as: 'doc',
              cond: {
                $or: Object.entries(after).reduce((prev, [key, value]) => prev.concat({ $gt: [`$$doc.${key}`, value] }), []),
              },
            },
          },
        },
      });
    }

    if (before) {
      $aggregate.push({
        $project: {
          docs: {
            $filter: {
              input: '$docs',
              as: 'doc',
              cond: {
                $or: Object.entries(before).reduce((prev, [key, value]) => prev.concat({ $lt: [`$$doc.${key}`, value] }), []),
              },
            },
          },
        },
      });
    }

    if (first) $aggregate.push({ $project: { docs: { $slice: ['$docs', 0, first] } } });
    if (last) $aggregate.push({ $project: { docs: { $slice: ['$docs', -last] } } });

    return $aggregate;
  }
};
