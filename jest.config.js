module.exports = {
  verbose: true,
  testTimeout: 60000,
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: ['src/**/**/*.js'],
  // globalSetup: '<rootDir>/jest.global.setup.js',
  setupFiles: ['<rootDir>/jest.prepare.js'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['<rootDir>/test/**/?(*.)+(spec|test).[jt]s?(x)'],
};
