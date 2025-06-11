const { getEslintConfig } = require('@coderich/dev');

module.exports = getEslintConfig({
  rules: {
    'no-new': 'off',
    'prefer-object-spread': 'off',
    'object-curly-newline': 'off',
    'no-async-promise-executor': 'off',
    'no-promise-executor-return': 'off',
  },
});
