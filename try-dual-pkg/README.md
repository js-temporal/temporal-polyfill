# try-dual-package

A directory to try dual(multiple) packages combination.

## Packages

- consumer
  - an entry point (ESM)
- lib-cjs
  - a package with the CommonJS `@js-temporal/polyfill`
- lib-esm
  - a package with the ESM `@js-temporal/polyfill`

## Usage

1. Make sure you are in the root of the `@js-temporal/polyfill` repository and run `npm run try-dual-pkg:prepare`: It will install all node modules for the each `try-dual-pkg` package (btw everything is a symlink. Nothing is installed from the npm registry over the tnternet).

1. Run `npm run try-dual-pkg`. It will build temporal-polyfill code base and exectute the `./try-dual-pkg/consumer` and now you should be able to experience the dual package combination.

Each package has `@js-temporal/polyfill` as a symlink to the root of this repository. So your changes to the temporal-polyfill code base will affect as soon as the build gets updated.
