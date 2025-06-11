Error.stackTraceLimit = 50;

const Validator = require('validator');
const Pipeline = require('./src/data/Pipeline');
const setup = require('./test/setup');

Pipeline.define('email', ({ value }) => {
  if (!Validator.isEmail(value)) throw new Error('Invalid email');
});

beforeAll(async () => {
  jest.setTimeout(10000);
  await setup();
});
