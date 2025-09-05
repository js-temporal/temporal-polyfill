// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/configuration
const config = {
  resolver: '<rootDir>/jest.resolve.cjs',
  testMatch: ['**/test/*.mjs', '!**/test/validStrings.mjs', '!**/test/resolve.source.mjs']
};
module.exports = config;
