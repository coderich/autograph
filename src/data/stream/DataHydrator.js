const Stream = require('stream');
const ResultSet = require('./ResultSet');
const ResultSetItem = require('./ResultSetItem');
const { map } = require('../../service/app.service');
// const { createResultSet, createResultSetItem } = require('./service');

module.exports = class DataHydrator {
  constructor(query, data) {
    const { model } = query.toObject();
    const fields = model.getFields().filter(f => f.getName() !== 'id');
    return data instanceof Stream ? DataHydrator.hydrate(query, fields, data) : new ResultSet(query, map(data, d => new ResultSetItem(query, d, fields)));
    // return data instanceof Stream ? DataHydrator.hydrate(query, fields, data) : createResultSet(query, map(data, d => createResultSetItem(query, d, fields)));
  }

  static hydrate(query, fields, stream) {
    const results = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (data) => {
        results.push(new ResultSetItem(query, data, fields));
        // results.push(createResultSetItem(query, data, fields));
      });

      stream.on('error', reject);

      stream.on('end', () => {
        resolve(new ResultSet(query, results));
        // resolve(createResultSet(query, results));
      });
    });
  }
};
