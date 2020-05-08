const _ = require('lodash');
const GraphqlFields = require('graphql-fields');
const { NotFoundError } = require('../service/error.service');
const { fromGUID, map } = require('../service/app.service');

const guidToId = (context, guid) => (context.legacyMode ? guid : fromGUID(guid)[1]);

const unrollGuid = (context, model, data) => {
  if (context.legacyMode) return data;
  model = context.loader.toModel(model);
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
    this.get = (context, model, guid, required = false, info) => {
      const query = { fields: GraphqlFields(info, {}, { processArguments: true }) };

      return context.loader.match(model).id(guidToId(context, guid)).query(query).one().then((doc) => {
        if (!doc && required) throw new NotFoundError(`${model} Not Found`);
        return doc;
      });
    };

    // Query
    this.query = ({ loader }, model, args, info) => loader.match(model).query(normalizeQuery(args, info)).many();
    this.count = ({ loader }, model, args, info) => loader.match(model).where(args.where).count();

    // Mutations
    this.create = (context, model, data, query) => context.loader.match(model).select(query.fields).save(unrollGuid(context, model, data));
    this.update = (context, model, guid, data, query) => context.loader.match(model).id(guidToId(context, guid)).select(query.fields).save(unrollGuid(context.loader, model, data));
    this.delete = (context, model, guid, query) => context.loader.match(model).id(guidToId(context, guid)).select(query.fields).remove();
  }
};
