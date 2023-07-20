const Boom = require('@hapi/boom');

const badData = Boom.badData('you bad data', { model: 'Model', field: 'Field' });
const badRequest = Boom.badRequest('you bad request', { model: 'Model', field: 'Field' });

console.log(badData.data);
console.log(badRequest.data);
