const Axios = require('axios');
const Neo4j = require('neo4j-driver');
const { globToRegex, proxyDeep, isScalarValue } = require('../service/app.service');

class Cypher {
  constructor(uri, schema, options = {}) {
    this.uri = uri;
    this.schema = schema;
    this.options = options;
  }

  get(model, id, options) {
    return this.query(`MATCH (n:${model}) WHERE n.id = { id } RETURN n`, { id }, options).then(docs => docs[0]);
  }

  find(model, where = {}, options) {
    const { $where, $params } = Cypher.normalizeWhereClause(where);
    const $wherePart = $where ? `WHERE ${$where}` : '';
    return this.query(`MATCH (n:${model}) ${$wherePart} RETURN n`, $params, options);
  }

  count(model, where = {}, options) {
    const { $where, $params } = Cypher.normalizeWhereClause(where);
    const $wherePart = $where ? `WHERE ${$where}` : '';
    return this.query(`MATCH (n:${model}) ${$wherePart} RETURN count(n) AS n`, $params, options).then(counts => counts[0]);
  }

  create(model, data, options) {
    return this.query(`CREATE (n:${model} { ${Object.keys(data).map(k => `${k}:{${k}}`)} }) SET n.id = id(n) RETURN n`, data, options).then(docs => docs[0]);
  }

  replace(model, id, data, doc, options) {
    return this.query(`MATCH (n:${model}) WHERE n.id = { id } SET ${Object.keys(doc).map(k => `n.${k}={${k}}`)} RETURN n`, { id, ...doc }, options).then(docs => docs[0]);
  }

  delete(model, id, doc, options) {
    return this.query(`MATCH (n:${model}) WHERE n.id = { id } DELETE n`, { id }, options).then(() => doc);
  }

  dropModel(model) {
    return this.query(`MATCH (n:${model}) DELETE n`);
  }

  createIndexes(model, indexes) {
    return Promise.all(indexes.map(({ type, fields }) => {
      if (fields.length > 1) return null;

      switch (type) {
        case 'unique': return this.query(`CREATE CONSTRAINT on (n:${model}) ASSERT (${fields.map(f => `n.${f}`).join(',')}) IS UNIQUE`);
        default: return null;
      }
    }));
  }

  static idValue(value) {
    return Number(value);
  }

  static normalizeWhereClause(where) {
    const $params = {};

    const obj = proxyDeep(where, {
      get(target, prop, rec) {
        const value = Reflect.get(target, prop, rec);
        if (typeof value === 'function') return value.bind(target);

        if (Array.isArray(value)) {
          $params[prop] = value;
          return `any (x IN $${prop} WHERE x IN n.${prop})`;
        }

        if (typeof value === 'string') {
          $params[prop] = `(?i)${globToRegex(value.toLowerCase(), { unescape: true, regex: false, maxLength: 100 }).toString().slice(1, -1)}`;
          return `toString(n.${prop}) =~ $${prop}`;
        }

        $params[prop] = value;
        return `n.${prop} = $${prop}`;
      },
    }).toObject();

    return {
      $where: Object.values(obj).join(' AND '),
      $params,
    };
  }

  static serialize(data) {
    return proxyDeep(data, {
      get(target, prop, rec) {
        const value = Reflect.get(target, prop, rec);
        if (typeof value === 'function') return value.bind(target);
        if (typeof value === 'object' && !Array.isArray(value)) return JSON.stringify(value);
        return value;
      },
    }).toObject();
  }

  static deserialize(data) {
    return proxyDeep(data, {
      get(target, prop, rec) {
        const value = Reflect.get(target, prop, rec);
        if (typeof value === 'function') return value.bind(target);

        if (typeof value === 'string') {
          try {
            const val = JSON.parse(value);
            return val;
          } catch (e) {
            return value;
          }
        }

        return value;
      },
    }).toObject();
  }
}

exports.Neo4jRestDriver = class Neo4jRestDriver extends Cypher {
  constructor(uri, options) {
    super(uri, options);
    this.cypher = Axios.get(`${uri}/db/data/`).then(({ data }) => data.cypher);
  }

  query(query, params = {}, options = {}) {
    return this.cypher.then(url => Axios.post(url, { query, params: Neo4jRestDriver.serialize(params) }).then(({ data }) => Neo4jRestDriver.toObject(data.data || [])));
  }

  static toObject(records) {
    return records.map(([result]) => {
      if (isScalarValue(result)) return result;

      const { metadata, data } = result;
      return Object.defineProperty(Neo4jRestDriver.deserialize(data), 'id', { value: metadata.id });
    });
  }
};

exports.Neo4jDriver = class Neo4jDriver extends Cypher {
  constructor(uri, options) {
    super(uri, options);
    this.driver = Neo4j.driver(uri, null, { disableLosslessIntegers: true });
  }

  query(query, params = {}, options = {}) {
    const session = options.session || this.driver.session();

    return session.run(query, Neo4jDriver.serialize(params)).then((records) => {
      if (session.close) session.close(); // could be in a transaction in which case we can't close
      return Neo4jDriver.toObject(records);
    });
  }

  transaction(ops) {
    // Create session and start transaction
    const session = this.driver.session();
    const txn = session.beginTransaction();
    const close = () => { session.close(); };

    // Execute each operation with session
    return Promise.all(ops.map(op => op.exec({ session: txn }))).then((results) => {
      results.$commit = () => txn.commit().then(close);
      results.$rollback = () => txn.rollback().then(close);
      return results;
    }).catch((e) => {
      close();
      throw e;
    });
  }

  static toObject({ records }) {
    return records.map((record) => {
      const node = record.get('n');
      if (isScalarValue(node)) return node;

      const doc = node.properties;
      return Object.defineProperty(Neo4jDriver.deserialize(doc), 'id', { value: node.identity });
    });
  }
};
