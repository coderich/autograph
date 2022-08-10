Error.stackTraceLimit = 50;

const Validator = require('validator');
const Pipeline = require('../src/data/Pipeline');

Pipeline.define('email', ({ value }) => {
  if (!Validator.isEmail(value)) throw new Error('Invalid email');
});
