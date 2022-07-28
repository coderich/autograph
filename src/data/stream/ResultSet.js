const { get } = require('lodash');
const DataService = require('../DataService');
const { ensureArray } = require('../../service/app.service');

module.exports = class ResultSet {
  constructor(query, data, adjustForPagination = true) {
    if (data == null) return data;
    const { first, after, last, before } = query.toObject();

    let hasNextPage = false;
    let hasPreviousPage = false;
    if (adjustForPagination && data.length) (({ hasPreviousPage, hasNextPage } = DataService.paginateResultSet(data, first, after, last, before)));

    return Object.defineProperties(data, {
      $$pageInfo: {
        get() {
          const edges = ensureArray(data);

          return {
            startCursor: get(edges, '0.$$cursor', ''),
            endCursor: get(edges, `${edges.length - 1}.$$cursor`, ''),
            hasPreviousPage,
            hasNextPage,
          };
        },
        enumerable: false,
      },
      $$isResultSet: {
        value: true,
        enumerable: false,
      },
    });
  }
};