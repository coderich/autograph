const { get } = require('lodash');
const Errors = require('./error.service');
const { hashObject } = require('./app.service');

exports.immutable = (val, oldData, op, path) => {
  const p = path.substr(path.indexOf('.') + 1);
  const oldVal = get(oldData, p);
  if (op === 'update' && val !== undefined && `${hashObject(val)}` !== `${hashObject(oldVal)}`) throw new Errors.ImmutableRuleError(`${path} is immutable; cannot be changed once set`);
};

exports.selfless = (val, oldData, op, path) => {
  if (val == null) return;
  if (`${val}` === `${get(oldData, 'id')}`) throw new Errors.SelflessRuleError(`${path} cannot hold a reference to itself`);
};
