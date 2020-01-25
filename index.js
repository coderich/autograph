const Schema = require('./src/core/Schema');
const Dalmatian = require('./src/core/DataLoader');
const { eventEmitter: Emitter } = require('./src/service/event.service');

module.exports = {
  Schema,
  Dalmatian,
  Emitter,
};
