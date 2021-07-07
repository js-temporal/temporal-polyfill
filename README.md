# Temporal Polyfill

## Polyfill for [TC39 Proposal: Temporal](https://github.com/tc39/proposal-temporal)

This polyfill is maintained by the champions of the [Temporal proposal](https://github.com/tc39/proposal-temporal) and is intended be ready for production use by the time the Temporal proposal reaches Stage 4.

This polyfill is compatible with Node.js 12 or later.

## Roadmap

* [x] Fork non-production polyfill from [tc39/proposal-temporal repo](https://github.com/tc39/proposal-temporal/tree/main/polyfill)
* [x] Release initial pre-alpha to NPM at [@js-temporal/polyfill](https://www.npmjs.com/package/@js-temporal/polyfill)
* [ ] Sync up the code in this repo with the handful of polyfill changes that have recently been made in the [tc39/proposal-temporal](https://github.com/tc39/proposal-temporal) repo
* [ ] Release alpha version to NPM 
* [ ] Deprecate all other earlier Temporal polyfills
* [ ] Convert to TypeScript for better maintainability
* [ ] (Maybe) Optimize performance of slow operations, notably non-ISO calendar calculations

## Bug Reports and Feedback

If you think you've found a bug in the Temporal API itself (not the implementation in this polyfill), please file an issue in the [tc39/proposal-temporal issue tracker](https://github.com/tc39/proposal-temporal/issues) issue tracker.

If you've found a bug in this polyfill&mdash;meaning that the implementation here doesn't match the [Temporal spec](https://tc39.es/proposal-temporal/)&mdash;please file an issue in this repo's [issue tracker](https://github.com/js-temporal/temporal-polyfill/issues).

## Documentation

Reference documentation and examples for the Temporal API can be found [here](https://tc39.es/proposal-temporal/docs/index.html).

A cookbook to help you get started and learn the ins and outs of Temporal is available [here](https://tc39.es/proposal-temporal/docs/index.html)

If you find a bug in the documentation, please file a bug over in the [tc39/proposal-temporal issue tracker](https://github.com/tc39/proposal-temporal/issues) issue tracker.

Note that the Temporal documentation is in the process of being migrated to [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript).  

## Usage

To install:

```bash
$ npm install @js-temporal/polyfill
```

CJS Usage:

```javascript
const { Temporal } = require('@js-temporal/polyfill');
```

Import the polyfill as an ES6 module:

```javascript
import { Temporal } from '@js-temporal/polyfill/lib/index.mjs';
```

Note that this polyfill currently does not install a global `Temporal` object like a real implementation will.
This behavior avoids hiding the global Temporal object in environments where a real Temporal implementation is present.
This behavior may change soon as we try to match built-in behavior more closely. 

## Contributing / Help Wanted

(Coming soon)
