const _ = require('lodash');
const GraphqlFields = require('graphql-fields');
const { NotFoundError } = require('../service/error.service');
const { fromGUID, map } = require('../service/app.service');

const guidToId = (autograph, guid) => (autograph.legacyMode ? guid : fromGUID(guid)[1]);

const unrollGuid = (autograph, model, data) => {
  if (autograph.legacyMode) return data;
  model = autograph.resolver.toModel(model);
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
    this.get = ({ autograph }, model, guid, required = false, info) => {
      const query = { fields: GraphqlFields(info, {}, { processArguments: true }) };

      return autograph.resolver.match(model).id(guidToId(autograph, guid)).query(query).one().then((doc) => {
        if (!doc && required) throw new NotFoundError(`${model} Not Found`);
        return doc;
      });
    };

    // Query
    this.query = ({ autograph }, model, args, info) => autograph.resolver.match(model).query(normalizeQuery(args, info)).many();
    this.count = ({ autograph }, model, args, info) => autograph.resolver.match(model).where(args.where).count();

    // Mutations
    this.create = ({ autograph }, model, data, meta, query) => autograph.resolver.match(model).select(query.fields).meta(meta).save(unrollGuid(autograph, model, data));
    this.update = ({ autograph }, model, guid, data, meta, query) => autograph.resolver.match(model).id(guidToId(autograph, guid)).select(query.fields).meta(meta).save(unrollGuid(autograph, model, data));
    this.delete = ({ autograph }, model, guid, meta, query) => autograph.resolver.match(model).id(guidToId(autograph, guid)).select(query.fields).meta(meta).remove();
  }
};
