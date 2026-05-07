module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverageFrom: [
    'controllers/**/*.js',
    'routes/**/*.js',
    'middleware/**/*.js',
    '!**/node_modules/**'
  ],
  testTimeout: 30000,
  verbose: true,
  maxWorkers: 1,
  forceExit: true,
  detectOpenHandles: true,
  bail: false
};
