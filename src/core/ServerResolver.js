const _ = require('lodash');
const GraphqlFields = require('graphql-fields');
const { NotFoundError } = require('../service/error.service');
const { fromGUID, map } = require('../service/app.service');

const guidToId = guid => fromGUID(guid)[1];

const unrollGuid = (loader, model, data) => {
  model = loader.toModel(model);
  const fields = model.getDataRefFields().map(field => field.getName());

  return map(data, (doc) => {
    return Object.entries(doc).reduce((prev, [key, value]) => {
      return Object.assign(prev, { [key]: (fields.indexOf(key) > -1 ? guidToId(value) : value) });
    }, {});
  });
};

const normalizeQuery = (args = {}, info) => {
  const query = { fields: GraphqlFields(info, {}, { processArguments: true }), ...args.query };
  const { fields = {} } = query;
  const { first, last, before, after } = args;
  return Object.assign(query, { pagination: { first, last, before, after }, fields: _.get(fields, 'edges.node') });
};

module.exports = class ServerResolver {
  constructor() {
    // Getter
    this.get = ({ loader }, model, guid, required = false, info) => {
      const query = { fields: GraphqlFields(info, {}, { processArguments: true }) };

      return loader.match(model).id(guidToId(guid)).query(query).one().then((doc) => {
        if (!doc && required) throw new NotFoundError(`${model} Not Found`);
        return doc;
      });
    };

    // Query
    this.query = ({ loader }, model, args, info) => loader.match(model).query(normalizeQuery(args, info)).many();
    this.count = ({ loader }, model, args, info) => loader.match(model).where(args.where).count();

    // Mutations
    this.create = ({ loader }, model, data, query) => loader.match(model).select(query.fields).save(unrollGuid(loader, model, data));
    this.update = ({ loader }, model, guid, data, query) => loader.match(model).id(guidToId(guid)).select(query.fields).save(unrollGuid(loader, model, data));
    this.delete = ({ loader }, model, guid, query) => loader.match(model).id(guidToId(guid)).select(query.fields).remove();
  }
};
