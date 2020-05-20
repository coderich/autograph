const { get } = require('lodash');
const Boom = require('../core/Boom');
const { hashObject } = require('./app.service');

exports.immutable = (val, oldData, op, path) => {
  const p = path.substr(path.indexOf('.') + 1);
  const oldVal = get(oldData, p);
  if (op === 'update' && val !== undefined && `${hashObject(val)}` !== `${hashObject(oldVal)}`) throw Boom.badRequest(`${path} is immutable; cannot be changed once set`);
};

exports.selfless = (val, oldData, op, path) => {
  if (val == null) return;
  if (`${val}` === `${get(oldData, 'id')}`) throw Boom.badRequest(`${path} cannot hold a reference to itself`);
};
