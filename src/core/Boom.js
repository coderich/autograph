const Boom = require('@hapi/boom');

/**
 * Boom.
 *
 * Standardizing how known/expected errors are thrown (such as Rule validation errors). This allows upstream applications
 * to more easily decide what to show to an end-user and what to hide.
 */
module.exports = Boom;
