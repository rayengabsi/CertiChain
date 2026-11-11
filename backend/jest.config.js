module.exports = {
  testEnvironment: 'node',
  testTimeout: 30000,
  setupFiles: ['<rootDir>/tests/setup.js'],
  coverageDirectory: 'coverage',
  testMatch: ['**/tests/**/*.test.js'],
};
