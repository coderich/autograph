const _ = require('lodash');
const GraphqlFields = require('graphql-fields');
const Boom = require('./Boom');
const { map, unrollGuid, guidToId, ensureArray, promiseChain } = require('../service/app.service');

const normalizeQuery = (args = {}, info) => {
  const query = { fields: GraphqlFields(info, {}, { processArguments: true }), ...args };
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

        return promiseChain(Object.entries(splice).map(([key, { with: from, put: to, splice: subSplice }]) => {
          to = to ? ensureArray(to) : to;
          from = from ? ensureArray(from) : from;
          const selectAll = Boolean(from && from.length === 0);

          return async () => {
            if (subSplice) {
              console.log('we have to subSplice this');
            }

            if (selectAll) {
              // Empty
              if (to === null || (to && to.length === 0)) {
                txn.match(model).id(result.id).select(query.fields).meta(meta).save({ [key]: to });
                return txn.exec();
              }

              // Replace
              if (to) {
                const modelRef = model.getField(key).getModelRef();
                const createTo = await resolver.match(modelRef).save(...to);
                // const createTo = await Promise.all(to.map(el => modelRef.appendDefaultValues(el).then(r => modelRef.appendCreateFields(r, true))));
                txn.match(model).id(result.id).select(query.fields).meta(meta).save({ [key]: createTo });
                return txn.exec();
              }

              // Nonsense
              return Promise.resolve([result]);
            }

            // Update
            if (from && to) {
              txn.match(model).id(result.id).meta(meta).splice(key, from, to);
              return txn.exec();
            }

            // Remove
            if (from && to === null) {
              txn.match(model).id(result.id).meta(meta).splice(key, from);
              return txn.exec();
            }

            // Add
            if (!from && to) {
              txn.match(model).id(result.id).meta(meta).splice(key, null, to);
              return txn.exec();
            }

            // Nonsense
            return Promise.resolve([result]);
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
