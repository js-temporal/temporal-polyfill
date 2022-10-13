# 0.4.3

Bug fixes:

- Fix an off-by-one error when dates in the Hebrew calendar were created using
  `monthCode`, the year was a leap year, and the month was after the leap
  month ([f3d0ca9f])
- Fix addition of months and years for lunisolar calendars ([4f8b04c1])
- Fix the ISO8601 representation of years between 1 BCE and 999 BCE ([b251dc0e]).
- Fix a bug causing time to appear to go backwards for a small number of
  milliseconds ([bb59ca97])
- Always validate ISO8601 time components as well as date components
  ([34662a05])
- Fix comparison of dates that might have a differing number of hours in their
  respective days ([a4c60241])
- Include calendar reference information when `calendarName='always'` is passed
  to various Temporal toString method's options bags ([54fcc4f3])
- Fix a nonconformant use of the `relativeTo` property bag ([9992f9b1])
- Fix ZonedDateTime.prototype.withPlainTime(null) to throw a TypeError, instead
  of treating it as midnight ([ec2b0546])
- Fix parsing of some valid Instant strings when they would be out of range
  before considering the UTC offset ([d9de9e74])
- Bail out early in non-ISO calendar implementations to avoid an infinte loop
  when calculating the duration between two identical dates. ([6f3c42c9])
- Fix type resolution when using TypeScript Node16 and transpiling to CJS ([9bab0eb5], see
  also the [relevant TypeScript issue](https://github.com/microsoft/TypeScript/issues/49160))

Non-breaking changes:

- Consistently call observable operations with undefined options arguments,
  instead of empty objects ([297b8f38])

# 0.4.2

This version is a patch version enabling TypeScript Node16 support for this
package.

Bug Fixes:

- Add types to exports/./import to support Typescript Node16 ([304c86dd])

# 0.4.1

This version is a patch version enabling polyfill compatibility with Safari
versions <15.1 (October 2021 and earlier).

Bug fixes:

- Remove erroneous options from Safari's Intl.DateTimeFormat resolvedOptions
  bag. The underlying bug in Safari was fixed in Safari 15.1.

# 0.4.0

This version roughly corresponds with all the changes made to the Temporal polyfill as of the January 2022 TC39 Plenary meeting.

Breaking changes:

- Use JSBI instead of big-integer for Big Integer math operations. If your codebase does not need to polyfill BigInt, consider using [the JSBI Babel plugin](https://github.com/GoogleChromeLabs/babel-plugin-transform-jsbi-to-bigint) to transpile these operations to native BigInt.
- Reject plain date-only strings ([b733c213], see also [Spec PR](https://github.com/tc39/proposal-temporal/pull/1952), [proposal-temporal polyfill PR](https://github.com/tc39/proposal-temporal/pull/1986))
- Reject '-000000' as an extended year value ([670cda6b], see also [Spec PR](https://github.com/tc39/proposal-temporal/pull/1992))
- Add missing branding checks for Calendar and Timezone classes to match spec changes ([670cda6b], see also [Spec PR](https://github.com/tc39/proposal-temporal/pull/1995))

Bug fixes:

- Temporal class prototypes are no longer writeable ([871d28dc], see also [proposal-temporal polyfill PR](https://github.com/tc39/proposal-temporal/pull/1974))
- Throw a RangeError for invalid offset strings ([d5ada8b0], see also [proposal-temporal polyfill PR](https://github.com/tc39/proposal-temporal/pull/1976))
- Pad fractional second values correctly in Duration.prototype.toString() ([e046ccdf], see also [Spec PR](https://github.com/tc39/proposal-temporal/pull/1956))
- Support the numberless output of Hebrew months from Intl.DateTimeFormat ([b06ac47f], see also [proposal-temporal polyfill PR](https://github.com/tc39/proposal-temporal/pull/2034))
- Workaround FireFox bug with Gregory era names ([30c4d4d8], see also [proposal-temporal polyfill PR](https://github.com/tc39/proposal-temporal/pull/2033))

Non-breaking changes:

- Rename public ...FromFields types ([3554d7f1])
- Add validation for hard-coded Era data in Calendar.ts ([08e84c9f])
- Improve code in Calendar.ts to handle calendar with a constant era but a variable number of months in a year ([ef8c588b])
- Add an optional calendar to PlainTime, PlainDateTime, and PlainMonthDay ([f8837367], see also [Spec PR](https://github.com/tc39/proposal-temporal/pull/1950))
- Only require a year in Gregorian calendar implementations, not a full date ([02aec1c3])
- Include `valueOf` in the Temporal.Duration type ([b1dd7eb3])
- Expand the types allowed to be used as TimezoneLike and CalendarLike to match the spec ([9d54c646])
- Improve worse-case performance when finding Timezone transition points by over 1000X! ([e70d6324])
- Change Calendar.fields to return an `Array`, not an `Iterable` ([3145c6c4], see also [Spec PR](https://github.com/tc39/proposal-temporal/pull/2056))

Other:

- Update build dependencies ([500b4c97])
- Run tests against Node 17 on CI ([db63e22a])

# 0.3.0

This version roughly corresponds with all the changes made to the Temporal polyfill as of the October 2021 TC39 Plenary meeting.

Breaking changes:

- Timezones now require a `getOffsetNanosecondsFor` method, and no longer fall back to the intrinsic definition (previously provided by `Temporal.Timezone#getOffsetNanosecondsFor`) if not provided. ([08346dc5], see also [proposal-temporal polyfill PR](https://github.com/tc39/proposal-temporal/pull/1929))
- Disallow Z designators when parsing strings for Plain Temporal types ([f3f8a994], see also [Spec PR](https://github.com/tc39/proposal-temporal/pull/1874))
- Allow ISO strings with "Z" + a bracketed IANA name ([70bd9898], see also [Spec PR](https://github.com/tc39/proposal-temporal/pull/1749))
- Emit ES2020 builds for newer browsers, and emit ES5 for older browsers. ([2331468d], [9e95c62b])
- Temporal.Duration constructor will now throw if given a non-integer ([9df5d068], see also [Spec PR](https://github.com/tc39/proposal-temporal/pull/1872))
- Remove support for sub-minute offsets in ISO strings ([766e5037], see also [Spec PR](https://github.com/tc39/proposal-temporal/pull/1871), [Spec PR](https://github.com/tc39/proposal-temporal/pull/1862))
- Throw TypeError on missing options from Duration.total ([4ec075f0], see also [Spec PR](https://github.com/tc39/proposal-temporal/pull/1720))
- Reject non-integer Duration fields in Duration.with() ([e6b2488d], see also [Spec PR](https://github.com/tc39/proposal-temporal/pull/1735))
- Ensure an Object is returned from calendar.mergeFields() ([4e63f25f], see also [Spec PR](https://github.com/tc39/proposal-temporal/pull/1719))

Bug fixes:

- Fix GetFormatterParts for Firefox Nightly ([47f9132f])
- Fix TS types of RoundTo and TotalOf ([3008a670])
- Fix crash setting `day` outside current JPN era ([6d3588c3], see also [proposal-temporal polyfill PR](https://github.com/tc39/proposal-temporal/pull/1807))
- Copy options object for PlainYearMonth.{add,subtract} and InterpretTemporalDateTimeFields to prevent user-modified objects from interfering with later operations. ([bafa1bdf], see also [Spec PR](https://github.com/tc39/proposal-temporal/pull/1748))
- Validate input to Calendar.prototype.fields ([7ebc700e], see also [Spec PR](https://github.com/tc39/proposal-temporal/pull/1750))
- Stop observably calling into `getPossibleInstantsFor` in `InterpretISODateTimeOffset` ([5448e59f], see also [Spec PR](https://github.com/tc39/proposal-temporal/pull/1688))
- Call `CalendarEquals` correctly ([07ea694e], see also [proposal-temporal polyfill PR](https://github.com/tc39/proposal-temporal/pull/1858))
- Fix arithmetic issues when using non-ISO months ([079a3325], see also [proposal-temporal polyfill PR](https://github.com/tc39/proposal-temporal/pull/1761))
- Regex: tighten matching of month and day values in datesplit ([b5736546], see also [proposal-temporal polyfill PR](https://github.com/tc39/proposal-temporal/pull/1836))
- Fix TS types for required CalendarProtocol methods ([0ee4581f], see also [proposal-temporal polyfill PR](https://github.com/tc39/proposal-temporal/pull/1964))

Non-breaking changes:

- Various `#round` and `#total` methods now accept string parameters or options bags. Strings are interpreted as the `smallestUnit` option (or `unit` for `Temporal.Duration#total`). ([068e801f], see also [Spec PR](https://github.com/tc39/proposal-temporal/pull/1875))
- Add @@toStringTag to TS types ([41ab6bc0])
- Accept string Calendar names in PlainMonthDay and PlainYearMonth constructors ([27b4c7e8])
- Make options optional in Calendar method TS types ([3a09d00d])
- Align implementation of RoundDuration with adjusted spec text ([4a0d0264], see also [Spec PR](https://github.com/tc39/proposal-temporal/pull/1968/files))

Other:

- Bump various dependencies ([47701107], [f5427de9], [310d9d8b])
- Allow launching and debugging tests (both Demitasse and Test262 suites) from the VSCode debug panel ([960d9b76], [7f7c19a1], [4ec6568e], [edcc668b])
- Run the Test262 test suite against this polyfill, for various configurations of the resulting build artifact ([2331468d], [666c69da], [429273ec], [ff937782], [f885253f])
- Remove various pieces of unused code, and add CI testing to detect unused code in PR review ([67f9f6bb], [63bdfcd1])
- Drop the dependency on es-abstract ([d24575f2], [ad7e2e3a], [5b1bc5e2])
- The polyfill's source was ported to TypeScript ([12e4d529], [ac78fd9d], [53f32e0f], [06b806c9], [66fdc765], [50b1c34b], [4724b017], [947a8a5e], [fdbf7e01], [fa60af6a], [da753f2f], [f4db8b0b], [4a38420d])
- Document the release process for this polyfill ([c55818b6])

[f3d0ca9f]: https://github.com/js-temporal/temporal-polyfill/commit/f3d0ca9f2f32beb071a7d25c9732bd38784b3e6d
[4f8b04c1]: https://github.com/js-temporal/temporal-polyfill/commit/4f8b04c1caba0360a527cbe8c8d95e2a8642ab6e
[b251dc0e]: https://github.com/js-temporal/temporal-polyfill/commit/b251dc0ef48cd7b2edee2f6541ce0cfb6d019e08
[bb59ca97]: https://github.com/js-temporal/temporal-polyfill/commit/bb59ca970b1c0cb70bdafd2896814076c11edd07
[34662a05]: https://github.com/js-temporal/temporal-polyfill/commit/34662a05cfe50e17a02356cbc55ff0ca2365e888
[a4c60241]: https://github.com/js-temporal/temporal-polyfill/commit/a4c602410bb5b711683918cd414568e19c594499
[54fcc4f3]: https://github.com/js-temporal/temporal-polyfill/commit/54fcc4f34b6ce87d15d3df9359bb538766c562ef
[9992f9b1]: https://github.com/js-temporal/temporal-polyfill/commit/9992f9b1137ff52cc427bc0c96504dca387d267b
[ec2b0546]: https://github.com/js-temporal/temporal-polyfill/commit/ec2b0546dd68718c6645713512753570eccf0ba6
[d9de9e74]: https://github.com/js-temporal/temporal-polyfill/commit/d9de9e74d0cba630b3480b31964362f82c435992
[6f3c42c9]: https://github.com/js-temporal/temporal-polyfill/commit/6f3c42c90460fa0917e228b5724d7b462c052fd8
[9bab0eb5]: https://github.com/js-temporal/temporal-polyfill/commit/9bab0eb586a8db13081a51e81fd0f6f2518d041a
[297b8f38]: https://github.com/js-temporal/temporal-polyfill/commit/297b8f385e5a146ad9c97ce3a9865a654999a713
[304c86dd]: https://github.com/js-temporal/temporal-polyfill/commit/304c86dd61e7107095ed42149e85d919e3a6cac8
[b733c213]: https://github.com/js-temporal/temporal-polyfill/commit/b733c213cba462f79eb9ee3a084661ea5344d9ea
[670cda6b]: https://github.com/js-temporal/temporal-polyfill/commit/670cda6bd269db66c8ce97eb73f941b20abb92ec
[670cda6b]: https://github.com/js-temporal/temporal-polyfill/commit/670cda6bd269db66c8ce97eb73f941b20abb92ec
[871d28dc]: https://github.com/js-temporal/temporal-polyfill/commit/871d28dc16674b650bd2161e168bae4549ec2bd2
[d5ada8b0]: https://github.com/js-temporal/temporal-polyfill/commit/d5ada8b01f6ebc96cac46b6fda888ee6fc64e457
[e046ccdf]: https://github.com/js-temporal/temporal-polyfill/commit/e046ccdfd5ff4a2f048195894e279aefc64e565c
[b06ac47f]: https://github.com/js-temporal/temporal-polyfill/commit/b06ac47f2d580f7079f13b4f82a90ebce2e469bb
[30c4d4d8]: https://github.com/js-temporal/temporal-polyfill/commit/30c4d4d8584267989423cb09124ea175e08e9c04
[3554d7f1]: https://github.com/js-temporal/temporal-polyfill/commit/3554d7f119d275749507dc0943f9b0823a0a3dd2
[08e84c9f]: https://github.com/js-temporal/temporal-polyfill/commit/08e84c9f2478dc9e62bbe43737bacba762dbc9f7
[ef8c588b]: https://github.com/js-temporal/temporal-polyfill/commit/ef8c588bc54204d584ff5f3f582f9075e7e1abf7
[f8837367]: https://github.com/js-temporal/temporal-polyfill/commit/f88373671662b5d108311804c26f56df8df2f32c
[02aec1c3]: https://github.com/js-temporal/temporal-polyfill/commit/02aec1c319b9081e394232ec264d515549ed2a51
[b1dd7eb3]: https://github.com/js-temporal/temporal-polyfill/commit/b1dd7eb348d001008240102a154e94eb141f8d7d
[9d54c646]: https://github.com/js-temporal/temporal-polyfill/commit/9d54c6464b31a71b9f28d94cc8cfae60c5765067
[e70d6324]: https://github.com/js-temporal/temporal-polyfill/commit/e70d6324b876888c5b46e46523e1a3ef47a067ba
[3145c6c4]: https://github.com/js-temporal/temporal-polyfill/commit/3145c6c411a36e69985419a84d4bbf9a573383c0
[500b4c97]: https://github.com/js-temporal/temporal-polyfill/commit/500b4c97e05b225472ae61007da579a7548bfb78
[db63e22a]: https://github.com/js-temporal/temporal-polyfill/commit/db63e22a238c3546d8c1082847ae6a19c7bc9570
[08346dc5]: https://github.com/js-temporal/temporal-polyfill/commit/08346dc5bc809e7575eacde3200f9775fe19c378
[f3f8a994]: https://github.com/js-temporal/temporal-polyfill/commit/f3f8a994c05603ddf1f4ebad09f191a8e847566e
[70bd9898]: https://github.com/js-temporal/temporal-polyfill/commit/70bd98989d79da847c479b1a3ff05a6a4dc045b2
[2331468d]: https://github.com/js-temporal/temporal-polyfill/commit/2331468dc809b1abefab5d3c6d0901baf298f9fa
[9e95c62b]: https://github.com/js-temporal/temporal-polyfill/commit/9e95c62b4346f89b79a8be66a8767bf120230cf8
[9df5d068]: https://github.com/js-temporal/temporal-polyfill/commit/9df5d068165cce79cbdf5b047674e4156a3acb28
[766e5037]: https://github.com/js-temporal/temporal-polyfill/commit/766e5037a7943ed30f4e7d106bd74fb68509008e
[4ec075f0]: https://github.com/js-temporal/temporal-polyfill/commit/4ec075f0b8d3e58cc1a6632157696dc76901835a
[e6b2488d]: https://github.com/js-temporal/temporal-polyfill/commit/e6b2488d668c72e73f2d0052439bca4eca48536c
[4e63f25f]: https://github.com/js-temporal/temporal-polyfill/commit/4e63f25f4adcb3230ae18d75aca878eadff7ab91
[47f9132f]: https://github.com/js-temporal/temporal-polyfill/commit/47f9132f1c56658e40bb1f268a9ac542a897a9ca
[3008a670]: https://github.com/js-temporal/temporal-polyfill/commit/3008a670b3758abe1b2341d54da4217b251bc234
[6d3588c3]: https://github.com/js-temporal/temporal-polyfill/commit/6d3588c33fec99d18c403229cff19375a7726dea
[bafa1bdf]: https://github.com/js-temporal/temporal-polyfill/commit/bafa1bdf2dbfc28513d7e39b0c0d1c3d075d9db5
[7ebc700e]: https://github.com/js-temporal/temporal-polyfill/commit/7ebc700ea92d660f42b6397f7e400122630c2e76
[5448e59f]: https://github.com/js-temporal/temporal-polyfill/commit/5448e59f461e7a56f8d5af4eb5353b2284cbab93
[07ea694e]: https://github.com/js-temporal/temporal-polyfill/commit/07ea694e0e44bffae021b537facf80def78d94cf
[079a3325]: https://github.com/js-temporal/temporal-polyfill/commit/079a33254af4e6610b409e33a3cc7fa22d116796
[b5736546]: https://github.com/js-temporal/temporal-polyfill/commit/b5736546a193478cd4b8f491f8a7c7d9763c322a
[0ee4581f]: https://github.com/js-temporal/temporal-polyfill/commit/0ee4581f8068fdd433040b17c7a2580733c55039
[068e801f]: https://github.com/js-temporal/temporal-polyfill/commit/068e801ff507aa1176dba2283e526900cdc6d0c1
[41ab6bc0]: https://github.com/js-temporal/temporal-polyfill/commit/41ab6bc01dc66b6f20ba7bc39f681aeebb64068a
[27b4c7e8]: https://github.com/js-temporal/temporal-polyfill/commit/27b4c7e89d617434bddf9b4240c57ab732233dba
[3a09d00d]: https://github.com/js-temporal/temporal-polyfill/commit/3a09d00de02918362b1530cc4121047c9e7495bb
[4a0d0264]: https://github.com/js-temporal/temporal-polyfill/commit/4a0d02648592439840345820b80f6d6f45e773aa
[47701107]: https://github.com/js-temporal/temporal-polyfill/commit/477011079f6e69e4d6fb18127d9cb0db2ee29ea6
[f5427de9]: https://github.com/js-temporal/temporal-polyfill/commit/f5427de92d4e4f015ea1374368b6594295597af3
[310d9d8b]: https://github.com/js-temporal/temporal-polyfill/commit/310d9d8b329de46e83fb2de75b997c7d28ac65f6
[960d9b76]: https://github.com/js-temporal/temporal-polyfill/commit/960d9b76d7acb24f017eb6ad58c72cb89905f804
[7f7c19a1]: https://github.com/js-temporal/temporal-polyfill/commit/7f7c19a11fc16bdd8aed52cd9e074d06be14c1ae
[4ec6568e]: https://github.com/js-temporal/temporal-polyfill/commit/4ec6568e1dc64f219b8b9aeddc9655f2728157b5
[edcc668b]: https://github.com/js-temporal/temporal-polyfill/commit/edcc668b680321aea0ceb20f041e7831cbb3b041
[2331468d]: https://github.com/js-temporal/temporal-polyfill/commit/2331468dc809b1abefab5d3c6d0901baf298f9fa
[666c69da]: https://github.com/js-temporal/temporal-polyfill/commit/666c69dab69655940ed712ca40d1ea7b1a6f3a4c
[429273ec]: https://github.com/js-temporal/temporal-polyfill/commit/429273ec7ced0eb85bfd736d07c01e7c31d871e8
[ff937782]: https://github.com/js-temporal/temporal-polyfill/commit/ff9377829f27895ee5d31f02d2b442fea827e399
[f885253f]: https://github.com/js-temporal/temporal-polyfill/commit/f885253fdc0d16115b0a9d986a47e3fa35e50878
[67f9f6bb]: https://github.com/js-temporal/temporal-polyfill/commit/67f9f6bbb7c3252144d6267cd1cf25f53e253d56
[63bdfcd1]: https://github.com/js-temporal/temporal-polyfill/commit/63bdfcd11f62d85796761c6397369b900db35a84
[d24575f2]: https://github.com/js-temporal/temporal-polyfill/commit/d24575f21b127c7889f1fa49ce41fc2f5e100618
[ad7e2e3a]: https://github.com/js-temporal/temporal-polyfill/commit/ad7e2e3a5b7a9f136c0ef551753b7381a5d16301
[5b1bc5e2]: https://github.com/js-temporal/temporal-polyfill/commit/5b1bc5e2e8635626993a65dadfecab45125f4f96
[12e4d529]: https://github.com/js-temporal/temporal-polyfill/commit/12e4d5294ffe6c847ca0a98e752fbf25a68b973d
[ac78fd9d]: https://github.com/js-temporal/temporal-polyfill/commit/ac78fd9ddff96dd792703a4948d11196d52fbbed
[53f32e0f]: https://github.com/js-temporal/temporal-polyfill/commit/53f32e0f868d2ddcaf09643c87a09df2ed158b78
[06b806c9]: https://github.com/js-temporal/temporal-polyfill/commit/06b806c9c1831eca649d5398399f862ea539a5ed
[66fdc765]: https://github.com/js-temporal/temporal-polyfill/commit/66fdc76589578b349ae2df63d9c79972f311ff0f
[50b1c34b]: https://github.com/js-temporal/temporal-polyfill/commit/50b1c34b3f54073fe50ce56998767a3bb0f4c763
[4724b017]: https://github.com/js-temporal/temporal-polyfill/commit/4724b017f86ef8c7b51d6291594604bff24a81f3
[947a8a5e]: https://github.com/js-temporal/temporal-polyfill/commit/947a8a5e0bfbfaf534fb943d8bd46d676dd5b5e6
[fdbf7e01]: https://github.com/js-temporal/temporal-polyfill/commit/fdbf7e0167be4413b39d3ea9c1e41c5323ab97c1
[fa60af6a]: https://github.com/js-temporal/temporal-polyfill/commit/fa60af6af015dbefba11de488e7f6be707c953a7
[da753f2f]: https://github.com/js-temporal/temporal-polyfill/commit/da753f2fedd80f4894ab5d1d9522b2820eb39f56
[f4db8b0b]: https://github.com/js-temporal/temporal-polyfill/commit/f4db8b0bb47584da0ecf5ab138242836924f052f
[4a38420d]: https://github.com/js-temporal/temporal-polyfill/commit/4a38420de406f35439c937eafbdc5783cda9c2b9
[c55818b6]: https://github.com/js-temporal/temporal-polyfill/commit/c55818b6458cfd4ea0efd7259f593fc2ec8dcda9
