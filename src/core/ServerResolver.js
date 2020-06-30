const _ = require('lodash');
const GraphqlFields = require('graphql-fields');
const Boom = require('./Boom');
const { fromGUID, map, ensureArray, promiseChain } = require('../service/app.service');

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
    this.get = ({ autograph }, model, { id: guid }, required = false, info) => {
      const query = { fields: GraphqlFields(info, {}, { processArguments: true }) };

      return autograph.resolver.match(model).id(guidToId(autograph, guid)).query(query).one().then((doc) => {
        if (!doc && required) throw Boom.notFound(`${model} Not Found`);
        return doc;
      });
    };

    // Query
    this.query = ({ autograph }, model, args, info) => autograph.resolver.match(model).query(normalizeQuery(args, info)).many();
    this.count = ({ autograph }, model, args, info) => autograph.resolver.match(model).where(args.where).count();

    // Mutations
    this.create = ({ autograph }, model, { input, meta }, query) => autograph.resolver.match(model).select(query.fields).meta(meta).save(unrollGuid(autograph, model, input));
    this.delete = ({ autograph }, model, { id: guid, meta }, query) => autograph.resolver.match(model).id(guidToId(autograph, guid)).select(query.fields).meta(meta).remove();

    this.update = ({ autograph }, model, args, query) => {
      const { resolver } = autograph;
      const { id: guid, input, splice = {}, meta } = args;

      return autograph.resolver.match(model).id(guidToId(autograph, guid)).select(query.fields).meta(meta).save(unrollGuid(autograph, model, input)).then((result) => {
        if (!Object.keys(splice).length) return result;

        const txn = resolver.transaction();

        return promiseChain(Object.entries(splice).map(([key, { from, with: to }]) => {
          to = to ? ensureArray(to) : to;
          from = from ? ensureArray(from) : from;

          return () => {
            if (!from && !to) return Promise.resolve([result]);
            txn.match(model).id(result.id).splice(key, from, to);
            return txn.exec();
          };
        })).then((results) => {
          return txn.commit().then(() => {
            return results.pop().pop();
          });
        });
      });
    };
  }
};
