const { MongoClient, ObjectID } = require('mongodb');
const { promiseRetry, globToRegex, proxyDeep, isScalarDataType } = require('../service/app.service');

const toObject = (doc) => {
  if (!doc) return undefined;
  return Object.defineProperty(doc, 'id', { value: doc._id }); // eslint-disable-line
};

module.exports = class MongoDriver {
  constructor(uri, schema) {
    this.uri = uri;
    this.schema = schema;
    this.connection = this.connect();
  }

  connect() {
    return MongoClient.connect(this.uri, { useUnifiedTopology: true });
  }

  query(collection, method, ...args) {
    // console.log(method, JSON.stringify(args));
    return this.connection.then(client => client.db().collection(collection)[method](...args));
  }

  get(model, id, options) {
    return this.query(model, 'findOne', { _id: id }, options).then(toObject);
  }

  find(model, where = {}, options) {
    const $where = MongoDriver.normalizeWhereAggregation(model, this.schema, where);
    return this.query(model, 'aggregate', $where, options).then(results => results.map(toObject).toArray());
  }

  count(model, where = {}, options) {
    const $where = MongoDriver.normalizeWhereAggregation(model, this.schema, where, true);
    return this.query(model, 'aggregate', $where, options).then(cursor => cursor.next().then(data => (data ? data.count : 0)));
  }

  create(model, data, options) {
    return this.query(model, 'insertOne', data, options).then(result => toObject(Object.assign(data, { _id: result.insertedId })));
  }

  replace(model, id, data, doc, options) {
    return this.query(model, 'replaceOne', { _id: id }, doc, options).then(() => toObject(doc));
  }

  delete(model, id, doc, options) {
    return this.query(model, 'deleteOne', { _id: id }, options).then(() => doc);
  }

  deleteMany(model, where = {}, options) {
    const $where = MongoDriver.normalizeWhere(where);
    return this.query(model, 'deleteMany', $where, options).then(() => 'success');
  }

  dropModel(model) {
    return this.query(model, 'deleteMany');
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

  createIndexes(model, indexes) {
    return Promise.all(indexes.map(({ name, type, fields }) => {
      const $fields = fields.reduce((prev, field) => Object.assign(prev, { [field]: 1 }), {});

      switch (type) {
        case 'unique': return this.query(model, 'createIndex', $fields, { name, unique: true });
        default: return null;
      }
    }));
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
    return proxyDeep(where, {
      get(target, prop, rec) {
        const value = Reflect.get(target, prop, rec);
        if (Array.isArray(value)) return { $in: value };
        if (typeof value === 'function') return value.bind(target);
        if (typeof value === 'string') { return globToRegex(value, { nocase: true, regex: true }); }
        return value;
      },
    }).toObject();
  }

  static normalizeWhereAggregation(modelName, schema, where, count = false) {
    const $agg = [];
    const model = schema.getModel(modelName);
    const $match = MongoDriver.normalizeWhere(where);

    const fields = model.getFields().filter((field) => {
      const fieldName = field.getName();
      const val = where[fieldName];
      const type = field.getDataType();
      if (!isScalarDataType(type)) return false;
      const stype = String((type === 'Float' ? 'Number' : type)).toLowerCase();
      if (String(typeof val) === `${stype}`) return false;
      return true;
    });

    const $addFields = fields.reduce((prev, field) => Object.assign(prev, { [field.getName()]: { $toString: `$${field.getName()}` } }), {});
    if (Object.keys($addFields).length) $agg.push({ $addFields });
    $agg.push({ $match });
    if (count) $agg.push({ $count: 'count' });
    return $agg;
  }
};
