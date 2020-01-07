const Case = require('change-case');

const stripRegexp = new RegExp('[^A-Z0-9\\[\\]?*{}.!,\\@\\(\\)\\$]', 'gi');

exports.lowerCase = () => val => val.toLowerCase();
exports.upperCase = () => val => val.toUpperCase();
exports.titleCase = () => val => Case.capitalCase(val.toLowerCase(), { stripRegexp });
