const { unrollGuid, guidToId } = require('../service/app.service');

module.exports = class ServerResolver {
  constructor() {
    // Queries
    this.get = ({ autograph }, model, { id: guid }, required = false, query) => autograph.resolver.match(model).id(guidToId(autograph, guid)).select(query.fields).one({ required });
    this.query = ({ autograph }, model, args, query) => autograph.resolver.match(model).select(query.fields).merge(args).many();
    this.count = ({ autograph }, model, args, query) => autograph.resolver.match(model).merge(args).count();

    // Mutations
    this.create = ({ autograph }, model, { input, meta }, query) => autograph.resolver.match(model).select(query.fields).meta(meta).save(unrollGuid(autograph, model, input));
    this.delete = ({ autograph }, model, { id: guid, meta }, query) => autograph.resolver.match(model).id(guidToId(autograph, guid)).select(query.fields).meta(meta).remove();
    this.update = ({ autograph }, model, { id: guid, meta, input }, query) => autograph.resolver.match(model).id(guidToId(autograph, guid)).select(query.fields).meta(meta).save(unrollGuid(autograph, model, input));
  }
};
