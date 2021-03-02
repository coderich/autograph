const { map } = require('../service/app.service');

module.exports = class ResultSet {
  constructor(query, data) {
    const keyNameMap = query.model().getFields().reduce((prev, field) => Object.assign(prev, { [field.getKey()]: field.getName() }), {});

    return map(data, (doc) => {
      return Object.entries(doc).reduce((prev, [key, value]) => Object.assign(prev, { [keyNameMap[key]]: value }), {});
    });
  }
};
