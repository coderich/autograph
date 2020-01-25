const Schema = require('./src/core/Schema');
const Dalmation = require('./src/core/DataLoader');
const { eventEmitter: Emitter } = require('./src/service/event.service');

module.exports = {
  Schema,
  Dalmation,
  Emitter,
};
