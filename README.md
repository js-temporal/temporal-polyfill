# Temporal Polyfill

## Polyfill for [TC39 Proposal: Temporal](https://github.com/tc39/proposal-temporal)

This polyfill was kicked off by some of the champions of the [Temporal proposal](https://github.com/tc39/proposal-temporal).
The goal is to be ready for production use when the Temporal proposal reaches Stage 4, although like with all OSS work progress is dependent on contributors.
We're eagerly welcoming to contributors who want to help build and maintain this polyfill.
PRs are always welcome!

Note that this polyfill is not affiliated with TC39. Links to other polyfills can be found [here](https://github.com/tc39/proposal-temporal/tree/main/#polyfills).

This polyfill is compatible with Node.js 14 or later.

## v0.4.0 => v0.5.0 Breaking Changes and Migration

Until recently, this polyfill lagged behind the proposal repo (and its not-for-production-use polyfill).
It's now caught up with the last few years of changes to the Temporal proposal, including many removed APIs and other breaking changes.
While breaking changes to any TC39 proposal are always possible before [Stage 4](https://tc39.es/process-document/), Temporal is close to adoption and no significant changes are expected in the future.

The [changelog](./CHANGELOG.md#050) details what's changed, including tips for migrating existing code to the latest version.

## Roadmap

- [x] Fork non-production polyfill from [tc39/proposal-temporal repo](https://github.com/tc39/proposal-temporal/tree/main/polyfill)
- [x] Release initial pre-alpha to NPM at [@js-temporal/polyfill](https://www.npmjs.com/package/@js-temporal/polyfill)
- [x] Sync the code in this repo with the handful of polyfill changes that have recently been made in the [tc39/proposal-temporal](https://github.com/tc39/proposal-temporal) repo
- [x] Release alpha version to NPM
- [x] Deprecate all other earlier Temporal polyfills
- [x] Optimize slow operations by reducing calls to Intl.DateTimeFormat constructor (see [#7](https://github.com/js-temporal/temporal-polyfill/issues/7), [#8](https://github.com/js-temporal/temporal-polyfill/pull/8), [#10](https://github.com/js-temporal/temporal-polyfill/pull/10), [#12](https://github.com/js-temporal/temporal-polyfill/pull/12))
- [x] Convert to TypeScript for better maintainability
- [x] Improve typing of sources for better maintainability
- [x] Migrate to JSBI for improved compile-time safety around BigInt operations.
- [ ] Optimize performance of other slow operations
- [ ] Release production version to NPM

## Bug Reports and Feedback

If you think you've found a bug in the Temporal API itself (not the implementation in this polyfill), please file an issue in the [tc39/proposal-temporal issue tracker](https://github.com/tc39/proposal-temporal/issues).

If you've found a bug in this polyfill&mdash;meaning that the implementation here doesn't match the [Temporal spec](https://tc39.es/proposal-temporal/)&mdash;please file an issue in this repo's [issue tracker](https://github.com/js-temporal/temporal-polyfill/issues).

## Documentation

Reference documentation and examples for the Temporal API can be found [here](https://tc39.es/proposal-temporal/docs/index.html).

A cookbook to help you get started and learn the ins and outs of Temporal is available [here](https://tc39.es/proposal-temporal/docs/index.html)

If you find a bug in the documentation, please file a bug over in the [tc39/proposal-temporal issue tracker](https://github.com/tc39/proposal-temporal/issues) issue tracker.

Note that the Temporal documentation is in the process of being migrated to [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript).
You can track the progress of the MDN migration [here](https://github.com/tc39/proposal-temporal/issues/1449).

## Usage

To install:

```bash
$ npm install @js-temporal/polyfill
```

CJS Usage:

```javascript
const { Temporal, Intl, toTemporalInstant } = require('@js-temporal/polyfill');
Date.prototype.toTemporalInstant = toTemporalInstant;
```

Import the polyfill as an ES6 module:

```javascript
import { Temporal, Intl, toTemporalInstant } from '@js-temporal/polyfill';
Date.prototype.toTemporalInstant = toTemporalInstant;
```

Note that this polyfill currently does not install a global `Temporal` object like a real implementation will.
This behavior avoids hiding the global Temporal object in environments where a real Temporal implementation is present.
See [this issue](https://github.com/tc39/proposal-temporal/issues/778) for more background on this decision.
Once JS engines start shipping with Temporal, we may decide to change this behavior to match built-in behavior more closely.
See [#2](https://github.com/js-temporal/temporal-polyfill/issues/2) to provide feedback or track this issue.

This polyfill ships ES2020 code for both CJS and ESM bundles - if your
environment does not support ES2020, then please make sure to transpile the
content of this package along with the rest of your code.

This polyfill uses [JSBI](https://github.com/GoogleChromeLabs/jsbi) to enable backwards-compatibility for environments that don't support native bigints. If your project only ever runs in environments that do support native bigints (see [caniuse data](https://caniuse.com/bigint)), we highly recommend configuring the [JSBI Babel plugin](https://github.com/GoogleChromeLabs/babel-plugin-transform-jsbi-to-bigint) that translates JSBI calls to their native bigint equivalent, improving code-size and performance. We are exploring ways to provide separate builds for these use-cases in [#155](https://github.com/js-temporal/temporal-polyfill/issues/155).

## Contributing / Help Wanted

We're eagerly welcoming to contributors who want to help build and maintain this polyfill.
PRs are always welcome!
