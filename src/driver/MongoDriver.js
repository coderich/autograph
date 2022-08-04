const Util = require('util');
const { get, has } = require('lodash');
const { MongoClient, ObjectID } = require('mongodb');
const { map, ensureArray, proxyDeep, toKeyObj, globToRegex, proxyPromise, isScalarDataType, promiseRetry } = require('../service/app.service');

module.exports = class MongoDriver {
  constructor(config) {
    this.config = config;
    this.connection = this.connect();
    this.getDirectives = () => get(config, 'directives', {});
  }

  connect() {
    const { uri, options = {} } = this.config;
    options.ignoreUndefined = false;
    return MongoClient.connect(uri, options);
  }

  disconnect() {
    return this.connection.then(client => client.close());
  }

  raw(collection) {
    return proxyPromise(this.connection.then(client => client.db().collection(collection)));
  }

  query(collection, method, ...args) {
    if (has(args[args.length - 1], 'debug')) console.log(collection, method, Util.inspect(args, { depth: null, showHidden: false, colors: true }));
    if (method === 'aggregate') args.splice(2);
    return this.raw(collection)[method](...args);
  }

  resolve(query) {
    const { isNative } = query;
    if (!isNative) query.where = MongoDriver.normalizeWhere(query.where);
    return this[query.method](query);
  }

  findOne(query) {
    return this.findMany(Object.assign(query, { first: 1 })).then((stream) => {
      return new Promise((resolve, reject) => {
        stream.on('data', resolve);
        stream.on('error', reject);
        stream.on('end', resolve);
      });
    });
  }

  findMany(query) {
    const { model, options = {}, flags } = query;
    Object.assign(options, this.config.query || {});
    return this.query(model, 'aggregate', MongoDriver.aggregateQuery(query), options, flags).then(cursor => cursor.stream());
  }

  count(query) {
    const { model, options = {}, flags } = query;
    Object.assign(options, this.config.query || {});

    return this.query(model, 'aggregate', MongoDriver.aggregateQuery(query, true), options, flags).then((cursor) => {
      return cursor.next().then((doc) => {
        return doc ? doc.count : 0;
      });
    });
  }

  createOne({ model, input, options, flags }) {
    return this.query(model, 'insertOne', input, options, flags).then(result => Object.assign(input, { id: result.insertedId }));
  }

  updateOne({ model, where, $doc, options, flags }) {
    const $update = Object.entries($doc).reduce((prev, [key, value]) => {
      Object.assign(prev.$set, { [key]: value });
      return prev;
    }, { $set: {} });

    return this.query(model, 'updateOne', where, $update, options, flags).then(() => $doc);
  }

  deleteOne({ model, where, options, flags }) {
    return this.query(model, 'deleteOne', where, options, flags).then(() => true);
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

  transaction(ops) {
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
        if (typeof value === 'function') return value.bind(target);
        const $value = map(value, v => (typeof v === 'string' ? globToRegex(v, { nocase: true, regex: true }) : v));
        if (Array.isArray($value)) return { $in: $value };
        return $value;
      },
    }).toObject();
  }

  static getAddFields(query) {
    const { shape, where } = query;

    return shape.reduce((prev, { from, type, isArray }) => {
      // Basic checks to see if worth converting for regex
      let value = where[from];
      if (value === undefined) return prev;
      if (!isScalarDataType(type)) return prev;

      // Do regex conversion
      if (isArray) value = value.$in || value; // Where clause does not always use $in
      if (!ensureArray(value).some(el => el instanceof RegExp)) return prev;
      const conversion = isArray ? { $map: { input: `$${from}`, as: 'el', in: { $toString: '$$el' } } } : { $toString: `$${from}` };
      return Object.assign(prev, { [from]: conversion });
    }, {});
  }

  static getProjectFields(parentShape, currentShape = { _id: 0, id: '$_id' }, isEmbedded, isEmbeddedArray, path = []) {
    return parentShape.reduce((project, value) => {
      const { from, to, shape: subShape, isArray } = value;
      const $key = isEmbedded && isEmbeddedArray ? `$$embedded.${from}` : `$${path.concat(from).join('.')}`;

      if (subShape) {
        const $project = MongoDriver.getProjectFields(subShape, {}, true, isArray, path.concat(from));
        Object.assign(project, { [to]: isArray ? { $map: { input: $key, as: 'embedded', in: $project } } : $project });
      } else if (isEmbedded) {
        Object.assign(project, { [to]: $key });
      } else {
        Object.assign(project, { [to]: from === to ? 1 : $key });
      }

      return project;
    }, currentShape);
  }

  static aggregateQuery(query, count = false) {
    const { where: $match, sort = {}, skip, limit, joins, after, before, first } = query;
    const $aggregate = [{ $match }];

    // Used for $regex matching
    const $addFields = MongoDriver.getAddFields(query);
    if (Object.keys($addFields).length) $aggregate.unshift({ $addFields });

    if (count) {
      $aggregate.push({ $count: 'count' });
    } else {
      // This is needed to return FK references as an array in the correct order
      // http://www.kamsky.org/stupid-tricks-with-mongodb/using-34-aggregation-to-return-documents-in-same-order-as-in-expression
      // https://jira.mongodb.org/browse/SERVER-7528
      const idKey = MongoDriver.idKey();
      const idMatch = $match[idKey];
      if (typeof idMatch === 'object' && idMatch.$in) {
        $aggregate.push({ $addFields: { __order: { $indexOfArray: [idMatch.$in, `$${idKey}`] } } });
        $aggregate.push({ $sort: { __order: 1 } });
      }

      // Joins
      if (joins) $aggregate.push(...joins.map(({ to: from, by: foreignField, from: localField, as }) => ({ $lookup: { from, foreignField, localField, as } })));

      // Sort, Skip, Limit documents
      if (sort && Object.keys(sort).length) $aggregate.push({ $sort: toKeyObj(sort) });
      if (skip) $aggregate.push({ $skip: skip });
      if (limit) $aggregate.push({ $limit: limit });

      // Pagination
      if (after) $aggregate.push({ $match: { $or: Object.entries(after).reduce((prev, [key, value]) => prev.concat({ [key]: { [sort[key] === 1 ? '$gte' : '$lte']: value } }), []) } });
      if (before) $aggregate.push({ $match: { $or: Object.entries(before).reduce((prev, [key, value]) => prev.concat({ [key]: { [sort[key] === 1 ? '$lte' : '$gte']: value } }), []) } });
      if (first) $aggregate.push({ $limit: first });

      // // Projection
      // const $project = MongoDriver.getProjectFields(shape);
      // $aggregate.push({ $project });
    }

    return $aggregate;
  }
};
