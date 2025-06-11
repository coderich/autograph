// Register a require hook for .graphql files
require.extensions['.graphql'] = (module, filename) => {
  const fs = require('fs');
  const content = fs.readFileSync(filename, 'utf8');
  module._compile(`module.exports = ${content};`, filename);
};
