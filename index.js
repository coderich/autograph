const Schema = require('./src/core/Schema');
const Resolver = require('./src/core/Resolver');
const { eventEmitter: Emitter } = require('./src/service/event.service');

module.exports = {
  Schema,
  Resolver,
  Emitter,
};
