const GraphqlFields = require('graphql-fields');
const Boom = require('./Boom');
const { unrollGuid, guidToId } = require('../service/app.service');

const normalizeQuery = (args = {}, info) => {
  return { fields: GraphqlFields(info, {}, { processArguments: true }), ...args };
};

module.exports = class ServerResolver {
  constructor() {
    // Getter
    this.get = ({ autograph }, model, { id: guid }, required = false, info) => {
      const query = { fields: GraphqlFields(info, {}, { processArguments: true }) };

      return autograph.resolver.match(model).id(guidToId(autograph, guid)).merge(query).one().then((doc) => {
        if (!doc && required) throw Boom.notFound(`${model} Not Found`);
        return doc;
      });
    };

    // Query
    this.query = ({ autograph }, model, args, info) => autograph.resolver.match(model).merge(normalizeQuery(args, info)).many();
    this.count = ({ autograph }, model, args, info) => autograph.resolver.match(model).merge(args).count();

    // Mutations
    this.create = ({ autograph }, model, { input, meta }, query) => autograph.resolver.match(model).meta(meta).save(unrollGuid(autograph, model, input));
    this.delete = ({ autograph }, model, { id: guid, meta }, query) => autograph.resolver.match(model).id(guidToId(autograph, guid)).select(query.fields).meta(meta).remove();
    this.update = ({ autograph }, model, { id: guid, meta, input }, query) => autograph.resolver.match(model).id(guidToId(autograph, guid)).select(query.fields).meta(meta).save(unrollGuid(autograph, model, input));
  }
};
