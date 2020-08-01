const Query = require('../../src/query/Query');
const Schema = require('../../src/core/Schema');
const Resolver = require('../../src/core/Resolver');
const { createSystemEvent, eventEmitter } = require('../../src/service/event.service');
const { timeout } = require('../../src/service/app.service');
const gql = require('../fixtures/bare.graphql');
const stores = require('../stores');

const schema = new Schema({ typeDefs: gql }, stores);
const resolver = new Resolver(schema);
const model = schema.getModel('Person');
const query = new Query(model);

describe('EventService', () => {
  test('createSystemEvent', async (done) => {
    const cb1 = jest.fn(async (data, next) => {
      await timeout(500);
      next();
    });

    const cb2 = jest.fn((data) => {});

    eventEmitter.on('preTest', cb1);
    eventEmitter.once('preTest', cb2);
    await createSystemEvent('test', { model, query, resolver });
    await createSystemEvent('test', { model, query, resolver });
    expect(cb1).toHaveBeenCalledTimes(2);
    expect(cb2).toHaveBeenCalledTimes(1);
    done();
  });
});
