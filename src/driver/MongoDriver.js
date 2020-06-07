const { MongoClient, ObjectID } = require('mongodb');
const { promiseRetry, globToRegex, proxyDeep, isScalarDataType, toKeyObj, proxyPromise } = require('../service/app.service');

module.exports = class MongoDriver {
  constructor(config, schema) {
    this.config = config;
    this.schema = schema;
    this.connection = this.connect();
  }

  getConfig() {
    return this.config;
  }

  connect() {
    return MongoClient.connect(this.config.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      tlsInsecure: true,
    });
  }

  query(collection, method, ...args) {
    return this.connection.then(client => client.db().collection(collection)[method](...args));
  }

  get(model, id, options) {
    MongoDriver.normalizeOptions(options);
    return this.query(model, 'findOne', { _id: id }, options);
  }

  find(model, where = {}, options) {
    const { version = 0 } = this.config;
    MongoDriver.normalizeOptions(options);

    if (version >= 4) {
      const $where = MongoDriver.normalizeWhereAggregation(model, this.schema, where);
      return this.query(model, 'aggregate', $where, options).then(results => results.toArray());
    }

    const $where = MongoDriver.normalizeWhere(where);
    return this.query(model, 'find', $where, options).then(results => results.toArray());
  }

  count(model, where = {}, options) {
    const { version = 0 } = this.config;
    MongoDriver.normalizeOptions(options);

    if (version >= 4) {
      const $where = MongoDriver.normalizeWhereAggregation(model, this.schema, where, true);
      return this.query(model, 'aggregate', $where, options).then(cursor => cursor.next().then(data => (data ? data.count : 0)));
    }

    const $where = MongoDriver.normalizeWhere(where);
    return this.query(model, 'countDocuments', $where, options);
  }

  create(model, data, options) {
    MongoDriver.normalizeOptions(options);
    return this.query(model, 'insertOne', data, options).then(result => Object.assign(data, { _id: result.insertedId }));
  }

  replace(model, id, data, doc, options) {
    MongoDriver.normalizeOptions(options);
    return this.query(model, 'replaceOne', { _id: id }, doc, options).then(() => doc);
  }

  delete(model, id, doc, options) {
    MongoDriver.normalizeOptions(options);
    return this.query(model, 'deleteOne', { _id: id }, options).then(() => doc);
  }

  native(model, method, ...args) {
    switch (method) {
      case 'count': return this.query(model, 'countDocuments', ...args);
      default: return this.query(model, method, ...args).then(results => results.toArray());
    }
  }

  raw(model) {
    return proxyPromise(this.connection.then(client => client.db().collection(model)));
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

  static normalizeOptions(options = {}) {
    options.fields = options.fields || [];

    options.fields = options.fields.reduce((prev, key) => {
      return Object.assign(prev, { [key]: 1 });
    }, {});

    return options;
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

  static normalizeWhereAggregation(modelName, schema, where, count = false) {
    const $agg = [];
    const model = schema.getModel(modelName);
    const $match = MongoDriver.normalizeWhere(where);

    // Determine which fields need to be cast for the query
    const fields = model.getSelectFields().filter((field) => {
      const fieldName = field.getName();
      const val = where[fieldName];
      const type = field.getDataType();
      if (!isScalarDataType(type)) return false;
      const stype = String((type === 'Float' || type === 'Int' ? 'Number' : type)).toLowerCase();
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
