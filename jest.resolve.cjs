// See https://jestjs.io/docs/configuration#resolver-string
const path = require('path');

module.exports = function (req, options) {
  let specifier = req;
  if (specifier === '@js-temporal/polyfill') {
    specifier = path.resolve(options.basedir, '../tsc-out/temporal.js');
  } else if (specifier.startsWith('../lib')) {
    specifier = path.resolve(options.basedir, specifier.replace('../lib/', '../tsc-out/'));
    if (!specifier.endsWith('.js')) specifier += '.js';
  } else if (req.includes('/tsc-out/') && specifier.startsWith('./') && !specifier.endsWith('.js')) {
    specifier += '.js';
  }
  return options.defaultResolver(specifier, options);
};
