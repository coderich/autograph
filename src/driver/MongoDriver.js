const { MongoClient, ObjectID } = require('mongodb');
const { globToRegex, proxyDeep, isScalarDataType } = require('../service/app.service');

const toObject = (doc) => {
  if (!doc) return undefined;
  return Object.defineProperty(doc, 'id', { value: doc._id }); // eslint-disable-line
};

module.exports = class MongoDriver {
  constructor(uri, schema) {
    this.schema = schema;
    this.connection = MongoClient.connect(uri, { useUnifiedTopology: true });
  }

  query(collection, method, ...args) {
    // console.log(method, JSON.stringify(args));
    return this.connection.then(client => client.db().collection(collection)[method](...args));
  }

  get(model, id) {
    return this.query(model, 'findOne', { _id: id }).then(toObject);
  }

  find(model, where = {}) {
    const $where = MongoDriver.normalizeWhereClause(model, this.schema, where);
    return this.query(model, 'aggregate', $where).then(results => results.map(toObject).toArray());
  }

  count(model, where = {}) {
    const $where = MongoDriver.normalizeWhereClause(model, this.schema, where, true);
    return this.query(model, 'aggregate', $where).then(cursor => cursor.next().then(data => (data ? data.count : 0)));
  }

  create(model, data) {
    return this.query(model, 'insertOne', data).then(result => toObject(Object.assign(data, { _id: result.insertedId })));
  }

  replace(model, id, data, doc) {
    return this.query(model, 'replaceOne', { _id: id }, doc).then(() => toObject(doc));
  }

  delete(model, id, doc) {
    return this.query(model, 'deleteOne', { _id: id }).then(() => doc);
  }

  dropModel(model) {
    return this.query(model, 'deleteMany');
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

  static normalizeWhereClause(modelName, schema, where, count = false) {
    const $match = proxyDeep(where, {
      get(target, prop, rec) {
        const value = Reflect.get(target, prop, rec);
        if (Array.isArray(value)) return { $in: value };
        if (typeof value === 'function') return value.bind(target);
        if (typeof value === 'string') { return globToRegex(value, { nocase: true, regex: true }); }
        return value;
      },
    }).toObject();

    const $agg = [];
    const model = schema.getModel(modelName);

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
