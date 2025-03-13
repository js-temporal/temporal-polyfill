const ArrayIncludes = Array.prototype.includes;
const ArrayPrototypeConcat = Array.prototype.concat;
const ArrayPrototypeFilter = Array.prototype.filter;
const ArrayPrototypePush = Array.prototype.push;
const ArrayPrototypeSlice = Array.prototype.slice;
const ArrayPrototypeSort = Array.prototype.sort;
const IntlDateTimeFormat = globalThis.Intl.DateTimeFormat;
const IntlSupportedValuesOf: typeof globalThis.Intl.supportedValuesOf | undefined = globalThis.Intl.supportedValuesOf;
const MapCtor = Map;
const MapPrototypeSet = Map.prototype.set;
const MathAbs = Math.abs;
const MathFloor = Math.floor;
const MathMax = Math.max;
const MathMin = Math.min;
const MathSign = Math.sign;
const MathTrunc = Math.trunc;
const NumberIsFinite = Number.isFinite;
const NumberCtor = Number;
const NumberIsNaN = Number.isNaN;
const NumberIsSafeInteger = Number.isSafeInteger;
const NumberMaxSafeInteger = Number.MAX_SAFE_INTEGER;
const ObjectCreate = Object.create;
const ObjectDefineProperty = Object.defineProperty;
const ReflectApply = Reflect.apply;
const ReflectOwnKeys = Reflect.ownKeys;
const SetPrototypeHas = Set.prototype.has;
const StringCtor = String;
const StringFromCharCode = String.fromCharCode;
const StringPrototypeCharCodeAt = String.prototype.charCodeAt;
const StringPrototypeSlice = String.prototype.slice;

import { DEBUG, ENABLE_ASSERTS } from './debug';
import JSBI from 'jsbi';

import type { Temporal } from '..';
import {
  abs,
  compare,
  DAY_NANOS_JSBI,
  divmod,
  ensureJSBI,
  isEven,
  MILLION,
  NonNegativeBigIntDivmod,
  ONE,
  SIXTY,
  THOUSAND,
  TWENTY_FOUR,
  TWO,
  ZERO
} from './bigintmath';
import type {
  AnyTemporalLikeType,
  UnitSmallerThanOrEqualTo,
  InstantParams,
  PlainMonthDayParams,
  ZonedDateTimeParams,
  PlainDateParams,
  PlainTimeParams,
  DurationParams,
  PlainDateTimeParams,
  PlainYearMonthParams,
  BuiltinCalendarId,
  Keys,
  AnyTemporalKey,
  FieldKey,
  InternalDuration,
  ISODateTime,
  ISODate,
  TimeRecord,
  ISODateToFieldsType,
  DateDuration,
  CalendarFieldsRecord,
  MonthDayFromFieldsObject,
  Overflow,
  Resolve
} from './internaltypes';
import { GetIntrinsic } from './intrinsicclass';
import { ApplyUnsignedRoundingMode, FMAPowerOf10, GetUnsignedRoundingMode, TruncatingDivModByPowerOf10 } from './math';
import { TimeDuration } from './timeduration';
import {
  CreateSlots,
  GetSlot,
  HasSlot,
  SetSlot,
  EPOCHNANOSECONDS,
  ISO_YEAR,
  ISO_MONTH,
  ISO_DAY,
  ISO_HOUR,
  ISO_MINUTE,
  ISO_SECOND,
  ISO_MILLISECOND,
  ISO_MICROSECOND,
  ISO_NANOSECOND,
  DATE_BRAND,
  YEAR_MONTH_BRAND,
  MONTH_DAY_BRAND,
  TIME_ZONE,
  CALENDAR,
  YEARS,
  MONTHS,
  WEEKS,
  DAYS,
  HOURS,
  MINUTES,
  SECONDS,
  MILLISECONDS,
  MICROSECONDS,
  NANOSECONDS
} from './slots';

const DAY_SECONDS = 86400;
const DAY_NANOS = DAY_SECONDS * 1e9;
const MINUTE_NANOS = 60e9;
// Instant range is 100 million days (inclusive) before or after epoch.
const NS_MIN = JSBI.multiply(DAY_NANOS_JSBI, JSBI.BigInt(-1e8));
const NS_MAX = JSBI.multiply(DAY_NANOS_JSBI, JSBI.BigInt(1e8));
// PlainDateTime range is 24 hours wider (exclusive) than the Instant range on
// both ends, to allow for valid Instant=>PlainDateTime conversion for all
// built-in time zones (whose offsets must have a magnitude less than 24 hours).
const DATETIME_NS_MIN = JSBI.add(JSBI.subtract(NS_MIN, DAY_NANOS_JSBI), ONE);
const DATETIME_NS_MAX = JSBI.subtract(JSBI.add(NS_MAX, DAY_NANOS_JSBI), ONE);
// The pattern of leap years in the ISO 8601 calendar repeats every 400 years.
// The constant below is the number of nanoseconds in 400 years. It is used to
// avoid overflows when dealing with values at the edge legacy Date's range.
const NS_IN_400_YEAR_CYCLE = JSBI.multiply(JSBI.BigInt(400 * 365 + 97), DAY_NANOS_JSBI);
const YEAR_MIN = -271821;
const YEAR_MAX = 275760;
const BEFORE_FIRST_OFFSET_TRANSITION = JSBI.multiply(JSBI.BigInt(-388152), JSBI.BigInt(1e13)); // 1847-01-01T00:00:00Z
const ABOUT_THREE_YEARS_NANOS = JSBI.multiply(DAY_NANOS_JSBI, JSBI.BigInt(366 * 3));
const TWO_WEEKS_NANOS = JSBI.multiply(DAY_NANOS_JSBI, JSBI.BigInt(2 * 7));

const BUILTIN_CALENDAR_IDS = [
  'iso8601',
  'hebrew',
  'islamic',
  'islamic-umalqura',
  'islamic-tbla',
  'islamic-civil',
  'islamic-rgsa',
  'islamicc',
  'persian',
  'ethiopic',
  'ethioaa',
  'ethiopic-amete-alem',
  'coptic',
  'chinese',
  'dangi',
  'roc',
  'indian',
  'buddhist',
  'japanese',
  'gregory'
];

const ICU_LEGACY_TIME_ZONE_IDS = new Set([
  'ACT',
  'AET',
  'AGT',
  'ART',
  'AST',
  'BET',
  'BST',
  'CAT',
  'CNT',
  'CST',
  'CTT',
  'EAT',
  'ECT',
  'IET',
  'IST',
  'JST',
  'MIT',
  'NET',
  'NST',
  'PLT',
  'PNT',
  'PRT',
  'PST',
  'SST',
  'VST'
]);

/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function */
/**
 * uncheckedAssertNarrowedType forces TypeScript to change the type of the argument to the one given in
 * the type parameter. This should only be used to help TS understand when variables change types,
 * but TS can't or won't infer this automatically. They should be used sparingly, because
 * if used incorrectly can lead to difficult-to-diagnose problems.
 * */
export function uncheckedAssertNarrowedType<T = unknown>(
  arg: unknown,
  justification: string
): asserts arg is T extends typeof arg ? T : never {}
/* eslint-enable */

/**
 * In debug builds, this function verifies that the given argument "exists" (is not
 * null or undefined). This function becomes a no-op in the final bundles distributed via NPM.
 * @param arg
 */
export function assertExists<A>(arg: A): asserts arg is NonNullable<A> {
  if (ENABLE_ASSERTS) {
    if (arg == null) {
      throw new Error('Expected arg to be set.');
    }
  }
}

/** Similar to assertExists, but returns the argument. */
function castExists<A>(arg: A): NonNullable<A> {
  assertExists(arg);
  return arg;
}

export function Call<T, A extends readonly any[], R>(
  target: (this: T, ...args: A) => R,
  thisArgument: T,
  argumentsList: Readonly<A>
): R {
  const args = arguments.length > 2 ? argumentsList : [];
  if (ENABLE_ASSERTS) {
    if (!Array.isArray(argumentsList)) {
      throw new TypeError('Assertion failed: optional `argumentsList`, if provided, must be an array');
    }
  }
  return ReflectApply(target, thisArgument, args);
}

// For unknown values, this narrows the result to a Record. But for union types
// like `Temporal.DurationLike | string`, it'll strip the primitive types while
// leaving the object type(s) unchanged.
export function IsObject<T>(
  value: T
): value is Exclude<T, string | null | undefined | number | bigint | symbol | boolean>;
export function IsObject(value: unknown): value is Record<string | number | symbol, unknown> {
  return (typeof value === 'object' && value !== null) || typeof value === 'function';
}

export function ToNumber(value: unknown): number {
  // ES 2022's es-abstract made minor changes to ToNumber, but polyfilling these
  // changes adds zero benefit to Temporal and brings in a lot of extra code. So
  // we'll leave ToNumber as-is.
  // See https://github.com/ljharb/es-abstract/blob/main/2022/ToNumber.js
  if (typeof value === 'bigint') throw new TypeError('Cannot convert BigInt to number');
  return NumberCtor(value);
}

function IsIntegralNumber(argument: unknown) {
  if (typeof argument !== 'number' || NumberIsNaN(argument) || !NumberIsFinite(argument)) {
    return false;
  }
  const absValue = MathAbs(argument);
  return MathFloor(absValue) === absValue;
}

export function ToString(value: unknown): string {
  if (typeof value === 'symbol') {
    throw new TypeError('Cannot convert a Symbol value to a String');
  }
  return StringCtor(value);
}

export function ToIntegerWithTruncation(value: unknown): number {
  const number = ToNumber(value);
  if (number === 0) return 0;
  if (NumberIsNaN(number) || !NumberIsFinite(number)) {
    throw new RangeError('invalid number value');
  }
  const integer = MathTrunc(number);
  if (integer === 0) return 0; // ℝ(value) in spec text; converts -0 to 0
  return integer;
}

function ToPositiveIntegerWithTruncation(valueParam: unknown, property?: string): number {
  const integer = ToIntegerWithTruncation(valueParam);
  if (integer <= 0) {
    if (property !== undefined) {
      throw new RangeError(`property '${property}' cannot be a a number less than one`);
    }
    throw new RangeError('Cannot convert a number less than one to a positive integer');
  }
  return integer;
}

export function ToIntegerIfIntegral(valueParam: unknown): number {
  const number = ToNumber(valueParam);
  if (!NumberIsFinite(number)) throw new RangeError('infinity is out of range');
  if (!IsIntegralNumber(number)) throw new RangeError(`unsupported fractional value ${valueParam}`);
  if (number === 0) return 0; // ℝ(value) in spec text; converts -0 to 0
  return number;
}

function ToZeroPaddedDecimalString(n: number, minLength: number) {
  if (DEBUG) {
    if (!IsIntegralNumber(n) || n < 0) {
      throw new RangeError('Assertion failed: `${n}` must be a non-negative integer');
    }
  }
  const s = String(n);
  return s.padStart(minLength, '0');
}

// This convenience function isn't in the spec, but is useful in the polyfill
// for DRY and better error messages.
export function RequireString(value: unknown): string {
  if (typeof value !== 'string') {
    // Use String() to ensure that Symbols won't throw
    throw new TypeError(`expected a string, not ${StringCtor(value)}`);
  }
  return value;
}

// This function is an enum in the spec, but it's helpful to make it a
// function in the polyfill.
function ToPrimitiveAndRequireString(valueParam: unknown): string {
  const value = ToPrimitive(valueParam, StringCtor);
  return RequireString(value);
}

// Limited implementation of ToPrimitive that only handles the string case,
// because that's all that's used in this polyfill.
function ToPrimitive(value: unknown, preferredType: typeof StringCtor): string | number {
  assertExists(preferredType === StringCtor);
  if (IsObject(value)) {
    const result = value?.toString();
    if (typeof result === 'string' || typeof result === 'number') return result;
    throw new TypeError('Cannot convert object to primitive value');
  }
  return value;
}

const CALENDAR_FIELD_KEYS: readonly FieldKey[] = [
  'era',
  'eraYear',
  'year',
  'month',
  'monthCode',
  'day',
  'hour',
  'minute',
  'second',
  'millisecond',
  'microsecond',
  'nanosecond',
  'offset',
  'timeZone'
] as const;

type BuiltinCastFunction = (v: unknown) => string | number;
const BUILTIN_CASTS = new Map<AnyTemporalKey, BuiltinCastFunction>([
  ['era', ToString],
  ['eraYear', ToIntegerWithTruncation],
  ['year', ToIntegerWithTruncation],
  ['month', ToPositiveIntegerWithTruncation],
  ['monthCode', ToPrimitiveAndRequireString],
  ['day', ToPositiveIntegerWithTruncation],
  ['hour', ToIntegerWithTruncation],
  ['minute', ToIntegerWithTruncation],
  ['second', ToIntegerWithTruncation],
  ['millisecond', ToIntegerWithTruncation],
  ['microsecond', ToIntegerWithTruncation],
  ['nanosecond', ToIntegerWithTruncation],
  ['offset', ToPrimitiveAndRequireString],
  ['timeZone', ToTemporalTimeZoneIdentifier]
]);

const BUILTIN_DEFAULTS = new Map([
  ['hour', 0],
  ['minute', 0],
  ['second', 0],
  ['millisecond', 0],
  ['microsecond', 0],
  ['nanosecond', 0]
]);

// each item is [plural, singular, category, (length in ns)]
const TEMPORAL_UNITS = [
  ['years', 'year', 'date'],
  ['months', 'month', 'date'],
  ['weeks', 'week', 'date'],
  ['days', 'day', 'date', DAY_NANOS],
  ['hours', 'hour', 'time', 3600e9],
  ['minutes', 'minute', 'time', 60e9],
  ['seconds', 'second', 'time', 1e9],
  ['milliseconds', 'millisecond', 'time', 1e6],
  ['microseconds', 'microsecond', 'time', 1e3],
  ['nanoseconds', 'nanosecond', 'time', 1]
] as const;
const SINGULAR_FOR = new Map(TEMPORAL_UNITS.map((e) => [e[0], e[1]] as const));
const PLURAL_FOR = new Map(TEMPORAL_UNITS.map(([p, s]) => [s, p]));
const UNITS_DESCENDING = TEMPORAL_UNITS.map(([, s]) => s);
type TimeUnitOrDay = Temporal.TimeUnit | 'day';
// Utility type whose `get` is only callable using valid keys, and that therefore
// omits `undefined` from its result.
type ConstMap<K, V> = Omit<ReadonlyMap<K, V>, 'get'> & { get(key: K): V };
const NS_PER_TIME_UNIT = new Map(TEMPORAL_UNITS.map(([, s, , l]) => [s, l] as const).filter(([, l]) => l)) as ConstMap<
  TimeUnitOrDay,
  number
>;

const DURATION_FIELDS = Array.from(SINGULAR_FOR.keys()).sort();

import * as PARSE from './regex';

const IntlDateTimeFormatEnUsCache = new Map<string, Intl.DateTimeFormat>();

function getIntlDateTimeFormatEnUsForTimeZone(timeZoneIdentifier: string) {
  const lowercaseIdentifier = ASCIILowercase(timeZoneIdentifier);
  let instance = IntlDateTimeFormatEnUsCache.get(lowercaseIdentifier);
  if (instance === undefined) {
    instance = new IntlDateTimeFormat('en-us', {
      timeZone: lowercaseIdentifier,
      hour12: false,
      era: 'short',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    });
    IntlDateTimeFormatEnUsCache.set(lowercaseIdentifier, instance);
  }
  return instance;
}

export function ToObject<T>(value: T): T extends Record<string, unknown> ? T : Record<PropertyKey, unknown> {
  if (typeof value === 'undefined' || value === null) {
    throw new TypeError(`Expected object not ${value}`);
  }
  return Object(value);
}

// Adapted from https://github.com/ljharb/es-abstract/blob/main/2022/CopyDataProperties.js
// but simplified (e.g. removed assertions) for this polyfill to reduce bundle size.
export function CopyDataProperties<K extends PropertyKey, T extends Record<K, unknown>>(
  target: T,
  source: T | undefined,
  excludedKeys: K[],
  excludedValues?: unknown[]
) {
  if (typeof source === 'undefined' || source === null) return;

  const keys = ReflectOwnKeys(source) as (keyof T)[];
  for (let index = 0; index < keys.length; index++) {
    const nextKey = keys[index];
    if (excludedKeys.some((e) => Object.is(e, nextKey))) continue;
    if (Object.prototype.propertyIsEnumerable.call(source, nextKey)) {
      const propValue = source[nextKey];
      if (excludedValues && excludedValues.some((e) => Object.is(e, propValue))) continue;

      target[nextKey] = propValue;
    }
  }
}

export function IsTemporalInstant(item: unknown): item is Temporal.Instant {
  return HasSlot(item, EPOCHNANOSECONDS) && !HasSlot(item, TIME_ZONE, CALENDAR);
}

export function IsTemporalDuration(item: unknown): item is Temporal.Duration {
  return HasSlot(item, YEARS, MONTHS, DAYS, HOURS, MINUTES, SECONDS, MILLISECONDS, MICROSECONDS, NANOSECONDS);
}
export function IsTemporalDate(item: unknown): item is Temporal.PlainDate {
  return HasSlot(item, DATE_BRAND);
}
export function IsTemporalTime(item: unknown): item is Temporal.PlainTime {
  return (
    HasSlot(item, ISO_HOUR, ISO_MINUTE, ISO_SECOND, ISO_MILLISECOND, ISO_MICROSECOND, ISO_NANOSECOND) &&
    !HasSlot(item, ISO_YEAR, ISO_MONTH, ISO_DAY)
  );
}
export function IsTemporalDateTime(item: unknown): item is Temporal.PlainDateTime {
  return HasSlot(
    item,
    ISO_YEAR,
    ISO_MONTH,
    ISO_DAY,
    ISO_HOUR,
    ISO_MINUTE,
    ISO_SECOND,
    ISO_MILLISECOND,
    ISO_MICROSECOND,
    ISO_NANOSECOND
  );
}
export function IsTemporalYearMonth(item: unknown): item is Temporal.PlainYearMonth {
  return HasSlot(item, YEAR_MONTH_BRAND);
}
export function IsTemporalMonthDay(item: unknown): item is Temporal.PlainMonthDay {
  return HasSlot(item, MONTH_DAY_BRAND);
}
export function IsTemporalZonedDateTime(item: unknown): item is Temporal.ZonedDateTime {
  return HasSlot(item, EPOCHNANOSECONDS, TIME_ZONE, CALENDAR);
}
export function RejectTemporalLikeObject(item: AnyTemporalLikeType) {
  if (HasSlot(item, CALENDAR) || HasSlot(item, TIME_ZONE)) {
    throw new TypeError('with() does not support a calendar or timeZone property');
  }
  if (IsTemporalTime(item)) {
    throw new TypeError('with() does not accept Temporal.PlainTime, use withPlainTime() instead');
  }
  if ((item as { calendar: unknown }).calendar !== undefined) {
    throw new TypeError('with() does not support a calendar property');
  }
  if ((item as { timeZone: unknown }).timeZone !== undefined) {
    throw new TypeError('with() does not support a timeZone property');
  }
}

function MaybeFormatCalendarAnnotation(
  calendar: BuiltinCalendarId,
  showCalendar: Temporal.ShowCalendarOption['calendarName']
): string {
  if (showCalendar === 'never') return '';
  return FormatCalendarAnnotation(calendar, showCalendar);
}

function FormatCalendarAnnotation(id: BuiltinCalendarId, showCalendar: Temporal.ShowCalendarOption['calendarName']) {
  if (showCalendar === 'never') return '';
  if (showCalendar === 'auto' && id === 'iso8601') return '';
  const flag = showCalendar === 'critical' ? '!' : '';
  return `[${flag}u-ca=${id}]`;
}

// Not a separate abstract operation in the spec, because it only occurs in one
// place: ParseISODateTime. In the code it's more convenient to split up
// ParseISODateTime for the YYYY-MM, MM-DD, and THH:MM:SS parse goals, so it's
// repeated four times.
function processAnnotations(annotations: string) {
  let calendar;
  let calendarWasCritical = false;
  for (const [, critical, key, value] of annotations.matchAll(PARSE.annotation)) {
    if (key === 'u-ca') {
      if (calendar === undefined) {
        calendar = value;
        calendarWasCritical = critical === '!';
      } else if (critical === '!' || calendarWasCritical) {
        throw new RangeError(`Invalid annotations in ${annotations}: more than one u-ca present with critical flag`);
      }
    } else if (critical === '!') {
      throw new RangeError(`Unrecognized annotation: !${key}=${value}`);
    }
  }
  return calendar;
}

function ParseISODateTime(isoString: string) {
  // ZDT is the superset of fields for every other Temporal type
  const match = PARSE.zoneddatetime.exec(isoString);
  if (!match) throw new RangeError(`invalid ISO 8601 string: ${isoString}`);
  const calendar = processAnnotations(match[16]);
  let yearString = match[1];
  if (yearString === '-000000') throw new RangeError(`invalid ISO 8601 string: ${isoString}`);
  const year = +yearString;
  const month = +(match[2] ?? match[4] ?? 1);
  const day = +(match[3] ?? match[5] ?? 1);
  const hasTime = match[6] !== undefined;
  const hour = +(match[6] ?? 0);
  const minute = +(match[7] ?? match[10] ?? 0);
  let second = +(match[8] ?? match[11] ?? 0);
  if (second === 60) second = 59;
  const fraction = (match[9] ?? match[12] ?? '') + '000000000';
  const millisecond = +fraction.slice(0, 3);
  const microsecond = +fraction.slice(3, 6);
  const nanosecond = +fraction.slice(6, 9);
  let offset;
  let z = false;
  if (match[13]) {
    offset = undefined;
    z = true;
  } else if (match[14]) {
    offset = match[14];
  }
  const tzAnnotation = match[15];
  RejectDateTime(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond);
  return {
    year,
    month,
    day,
    time: hasTime ? { hour, minute, second, millisecond, microsecond, nanosecond } : ('start-of-day' as const),
    tzAnnotation,
    offset,
    z,
    calendar
  };
}

// ts-prune-ignore-next TODO: remove if test/validStrings is converted to TS.
export function ParseTemporalInstantString(isoString: string) {
  const result = ParseISODateTime(isoString);
  if (!result.z && !result.offset) throw new RangeError('Temporal.Instant requires a time zone offset');
  return result;
}

// ts-prune-ignore-next TODO: remove if test/validStrings is converted to TS.
export function ParseTemporalZonedDateTimeString(isoString: string) {
  const result = ParseISODateTime(isoString);
  if (!result.tzAnnotation) throw new RangeError('Temporal.ZonedDateTime requires a time zone ID in brackets');
  return result;
}

// ts-prune-ignore-next TODO: remove if test/validStrings is converted to TS.
export function ParseTemporalDateTimeString(isoString: string) {
  return ParseISODateTime(isoString);
}

// ts-prune-ignore-next TODO: remove if test/validStrings is converted to TS.
export function ParseTemporalDateString(isoString: string) {
  return ParseISODateTime(isoString);
}

// ts-prune-ignore-next TODO: remove if test/validStrings is converted to TS.
export function ParseTemporalTimeString(isoString: string) {
  const match = PARSE.time.exec(isoString);
  let hour, minute, second, millisecond, microsecond, nanosecond;
  if (match) {
    processAnnotations(match[10]); // ignore found calendar
    hour = +(match[1] ?? 0);
    minute = +(match[2] ?? match[5] ?? 0);
    second = +(match[3] ?? match[6] ?? 0);
    if (second === 60) second = 59;
    const fraction = (match[4] ?? match[7] ?? '') + '000000000';
    millisecond = +fraction.slice(0, 3);
    microsecond = +fraction.slice(3, 6);
    nanosecond = +fraction.slice(6, 9);
    if (match[8]) throw new RangeError('Z designator not supported for PlainTime');
  } else {
    const { time, z } = ParseISODateTime(isoString);
    if (time === 'start-of-day') throw new RangeError(`time is missing in string: ${isoString}`);
    if (z) throw new RangeError('Z designator not supported for PlainTime');
    ({ hour, minute, second, millisecond, microsecond, nanosecond } = time);
  }
  // if it's a date-time string, OK
  if (/[tT ][0-9][0-9]/.test(isoString)) {
    return { hour, minute, second, millisecond, microsecond, nanosecond };
  }
  try {
    const { month, day } = ParseTemporalMonthDayString(isoString);
    RejectISODate(1972, month, day);
  } catch {
    try {
      const { year, month } = ParseTemporalYearMonthString(isoString);
      RejectISODate(year, month, 1);
    } catch {
      return { hour, minute, second, millisecond, microsecond, nanosecond };
    }
  }
  throw new RangeError(`invalid ISO 8601 time-only string ${isoString}; may need a T prefix`);
}

// ts-prune-ignore-next TODO: remove if test/validStrings is converted to TS.
export function ParseTemporalYearMonthString(isoString: string) {
  const match = PARSE.yearmonth.exec(isoString);
  let year, month, calendar, referenceISODay;
  if (match) {
    calendar = processAnnotations(match[3]);
    let yearString = match[1];
    if (yearString === '-000000') throw new RangeError(`invalid ISO 8601 string: ${isoString}`);
    year = +yearString;
    month = +match[2];
    referenceISODay = 1;
    if (calendar !== undefined && calendar !== 'iso8601') {
      throw new RangeError('YYYY-MM format is only valid with iso8601 calendar');
    }
  } else {
    let z;
    ({ year, month, calendar, day: referenceISODay, z } = ParseISODateTime(isoString));
    if (z) throw new RangeError('Z designator not supported for PlainYearMonth');
  }
  return { year, month, calendar, referenceISODay };
}

// ts-prune-ignore-next TODO: remove if test/validStrings is converted to TS.
export function ParseTemporalMonthDayString(isoString: string) {
  const match = PARSE.monthday.exec(isoString);
  let month, day, calendar, referenceISOYear;
  if (match) {
    calendar = processAnnotations(match[3]);
    month = +match[1];
    day = +match[2];
    if (calendar !== undefined && calendar !== 'iso8601') {
      throw new RangeError('MM-DD format is only valid with iso8601 calendar');
    }
  } else {
    let z;
    ({ month, day, calendar, year: referenceISOYear, z } = ParseISODateTime(isoString));
    if (z) throw new RangeError('Z designator not supported for PlainMonthDay');
  }
  return { month, day, calendar, referenceISOYear };
}

const TIMEZONE_IDENTIFIER = new RegExp(`^${PARSE.timeZoneID.source}$`, 'i');
const OFFSET_IDENTIFIER = new RegExp(`^${PARSE.offsetIdentifier.source}$`);

function throwBadTimeZoneStringError(timeZoneString: string): never {
  // Offset identifiers only support minute precision, but offsets in ISO
  // strings support nanosecond precision. If the identifier is invalid but
  // it's a valid ISO offset, then it has sub-minute precision. Show a clearer
  // error message in that case.
  const msg = OFFSET.test(timeZoneString) ? 'Seconds not allowed in offset time zone' : 'Invalid time zone';
  throw new RangeError(`${msg}: ${timeZoneString}`);
}

export function ParseTimeZoneIdentifier(
  identifier: string
): { tzName: string; offsetMinutes?: undefined } | { tzName?: undefined; offsetMinutes: number } {
  if (!TIMEZONE_IDENTIFIER.test(identifier)) {
    throwBadTimeZoneStringError(identifier);
  }
  if (OFFSET_IDENTIFIER.test(identifier)) {
    const offsetNanoseconds = ParseDateTimeUTCOffset(identifier);
    // The regex limits the input to minutes precision, so we know that the
    // division below will result in an integer.
    return { offsetMinutes: offsetNanoseconds / 60e9 };
  }
  return { tzName: identifier };
}

// This operation doesn't exist in the spec, but in the polyfill it's split from
// ParseTemporalTimeZoneString so that parsing can be tested separately from the
// logic of converting parsed values into a named or offset identifier.
// ts-prune-ignore-next TODO: remove if test/validStrings is converted to TS.
export function ParseTemporalTimeZoneStringRaw(timeZoneString: string): {
  tzAnnotation: string;
  offset: string | undefined;
  z: boolean;
} {
  if (TIMEZONE_IDENTIFIER.test(timeZoneString)) {
    return { tzAnnotation: timeZoneString, offset: undefined, z: false };
  }
  try {
    // Try parsing ISO string instead
    const { tzAnnotation, offset, z } = ParseISODateTime(timeZoneString);
    if (z || tzAnnotation || offset) {
      return { tzAnnotation, offset, z };
    }
  } catch {
    // fall through
  }
  throwBadTimeZoneStringError(timeZoneString);
}

function ParseTemporalTimeZoneString(stringIdent: string): ReturnType<typeof ParseTimeZoneIdentifier> {
  const { tzAnnotation, offset, z } = ParseTemporalTimeZoneStringRaw(stringIdent);
  if (tzAnnotation) return ParseTimeZoneIdentifier(tzAnnotation);
  if (z) return ParseTimeZoneIdentifier('UTC');
  if (offset) return ParseTimeZoneIdentifier(offset);
  throw new Error('this line should not be reached');
}

// ts-prune-ignore-next TODO: remove if test/validStrings is converted to TS.
export function ParseTemporalDurationString(isoString: string) {
  const match = PARSE.duration.exec(isoString);
  if (!match) throw new RangeError(`invalid duration: ${isoString}`);
  if (match.slice(2).every((element) => element === undefined)) {
    throw new RangeError(`invalid duration: ${isoString}`);
  }
  const sign = match[1] === '-' ? -1 : 1;
  const years = match[2] === undefined ? 0 : ToIntegerWithTruncation(match[2]) * sign;
  const months = match[3] === undefined ? 0 : ToIntegerWithTruncation(match[3]) * sign;
  const weeks = match[4] === undefined ? 0 : ToIntegerWithTruncation(match[4]) * sign;
  const days = match[5] === undefined ? 0 : ToIntegerWithTruncation(match[5]) * sign;
  const hours = match[6] === undefined ? 0 : ToIntegerWithTruncation(match[6]) * sign;
  const fHours = match[7];
  const minutesStr = match[8];
  const fMinutes = match[9];
  const secondsStr = match[10];
  const fSeconds = match[11];
  let minutes = 0;
  let seconds = 0;
  // fractional hours, minutes, or seconds, expressed in whole nanoseconds:
  let excessNanoseconds = 0;

  if (fHours !== undefined) {
    if (minutesStr ?? fMinutes ?? secondsStr ?? fSeconds ?? false) {
      throw new RangeError('only the smallest unit can be fractional');
    }
    excessNanoseconds = ToIntegerWithTruncation((fHours + '000000000').slice(0, 9)) * 3600 * sign;
  } else {
    minutes = minutesStr === undefined ? 0 : ToIntegerWithTruncation(minutesStr) * sign;
    if (fMinutes !== undefined) {
      if (secondsStr ?? fSeconds ?? false) {
        throw new RangeError('only the smallest unit can be fractional');
      }
      excessNanoseconds = ToIntegerWithTruncation((fMinutes + '000000000').slice(0, 9)) * 60 * sign;
    } else {
      seconds = secondsStr === undefined ? 0 : ToIntegerWithTruncation(secondsStr) * sign;
      if (fSeconds !== undefined) {
        excessNanoseconds = ToIntegerWithTruncation((fSeconds + '000000000').slice(0, 9)) * sign;
      }
    }
  }

  const nanoseconds = excessNanoseconds % 1000;
  const microseconds = MathTrunc(excessNanoseconds / 1000) % 1000;
  const milliseconds = MathTrunc(excessNanoseconds / 1e6) % 1000;
  seconds += MathTrunc(excessNanoseconds / 1e9) % 60;
  minutes += MathTrunc(excessNanoseconds / 60e9);

  RejectDuration(years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
  return { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
}

export function RegulateISODate(yearParam: number, monthParam: number, dayParam: number, overflow: Overflow) {
  let year = yearParam;
  let month = monthParam;
  let day = dayParam;
  switch (overflow) {
    case 'reject':
      RejectISODate(year, month, day);
      break;
    case 'constrain':
      ({ year, month, day } = ConstrainISODate(year, month, day));
      break;
  }
  return { year, month, day };
}

export function RegulateTime(
  hourParam: number,
  minuteParam: number,
  secondParam: number,
  millisecondParam: number,
  microsecondParam: number,
  nanosecondParam: number,
  overflow: Overflow
) {
  let hour = hourParam;
  let minute = minuteParam;
  let second = secondParam;
  let millisecond = millisecondParam;
  let microsecond = microsecondParam;
  let nanosecond = nanosecondParam;

  switch (overflow) {
    case 'reject':
      RejectTime(hour, minute, second, millisecond, microsecond, nanosecond);
      break;
    case 'constrain':
      ({ hour, minute, second, millisecond, microsecond, nanosecond } = ConstrainTime(
        hour,
        minute,
        second,
        millisecond,
        microsecond,
        nanosecond
      ));
      break;
  }
  return { hour, minute, second, millisecond, microsecond, nanosecond };
}

export function RegulateISOYearMonth(yearParam: number, monthParam: number, overflow: Overflow) {
  let year = yearParam;
  let month = monthParam;
  const referenceISODay = 1;
  switch (overflow) {
    case 'reject':
      RejectISODate(year, month, referenceISODay);
      break;
    case 'constrain':
      ({ year, month } = ConstrainISODate(year, month));
      break;
  }
  return { year, month };
}

function ToTemporalDurationRecord(item: Temporal.DurationLike | string) {
  if (!IsObject(item)) {
    return ParseTemporalDurationString(RequireString(item));
  }
  if (IsTemporalDuration(item)) {
    return {
      years: GetSlot(item, YEARS),
      months: GetSlot(item, MONTHS),
      weeks: GetSlot(item, WEEKS),
      days: GetSlot(item, DAYS),
      hours: GetSlot(item, HOURS),
      minutes: GetSlot(item, MINUTES),
      seconds: GetSlot(item, SECONDS),
      milliseconds: GetSlot(item, MILLISECONDS),
      microseconds: GetSlot(item, MICROSECONDS),
      nanoseconds: GetSlot(item, NANOSECONDS)
    };
  }
  const result = {
    years: 0,
    months: 0,
    weeks: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    milliseconds: 0,
    microseconds: 0,
    nanoseconds: 0
  };
  let partial = ToTemporalPartialDurationRecord(item);
  for (let index = 0; index < DURATION_FIELDS.length; index++) {
    const property = DURATION_FIELDS[index];
    const value = partial[property];
    if (value !== undefined) {
      result[property] = value;
    }
  }
  let { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = result;
  RejectDuration(years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
  return { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
}

export function ToTemporalPartialDurationRecord(temporalDurationLike: Temporal.DurationLike | string) {
  if (!IsObject(temporalDurationLike)) {
    throw new TypeError('invalid duration-like');
  }
  const result: Record<(typeof DURATION_FIELDS)[number], number | undefined> = {
    years: undefined,
    months: undefined,
    weeks: undefined,
    days: undefined,
    hours: undefined,
    minutes: undefined,
    seconds: undefined,
    milliseconds: undefined,
    microseconds: undefined,
    nanoseconds: undefined
  };
  let any = false;
  for (let index = 0; index < DURATION_FIELDS.length; index++) {
    const property = DURATION_FIELDS[index];
    const value = temporalDurationLike[property];
    if (value !== undefined) {
      any = true;
      result[property] = ToIntegerIfIntegral(value);
    }
  }
  if (!any) {
    throw new TypeError('invalid duration-like');
  }
  return result;
}

export function TemporalObjectToISODateRecord(
  temporalObject: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.PlainYearMonth | Temporal.PlainMonthDay
) {
  return {
    year: GetSlot(temporalObject, ISO_YEAR),
    month: GetSlot(temporalObject, ISO_MONTH),
    day: GetSlot(temporalObject, ISO_DAY)
  };
}

export function PlainDateTimeToISODateTimeRecord(plainDateTime: Temporal.PlainDateTime) {
  return {
    year: GetSlot(plainDateTime, ISO_YEAR),
    month: GetSlot(plainDateTime, ISO_MONTH),
    day: GetSlot(plainDateTime, ISO_DAY),
    hour: GetSlot(plainDateTime, ISO_HOUR),
    minute: GetSlot(plainDateTime, ISO_MINUTE),
    second: GetSlot(plainDateTime, ISO_SECOND),
    millisecond: GetSlot(plainDateTime, ISO_MILLISECOND),
    microsecond: GetSlot(plainDateTime, ISO_MICROSECOND),
    nanosecond: GetSlot(plainDateTime, ISO_NANOSECOND)
  };
}

function ISODateTimeToDateRecord({ year, month, day }: ISODateTime) {
  return { year, month, day };
}

export function CombineISODateAndTimeRecord(date: ISODate, time: TimeRecord) {
  const { year, month, day } = date;
  const { hour, minute, second, millisecond, microsecond, nanosecond } = time;
  return { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond };
}

export function GetTemporalOverflowOption(options: Temporal.AssignmentOptions | undefined) {
  if (options === undefined) return 'constrain';
  return GetOption(options, 'overflow', ['constrain', 'reject'], 'constrain');
}

export function GetTemporalDisambiguationOption(options: Temporal.ToInstantOptions | undefined) {
  if (options === undefined) return 'compatible';
  return GetOption(options, 'disambiguation', ['compatible', 'earlier', 'later', 'reject'], 'compatible');
}

export function GetRoundingModeOption(
  options: { roundingMode?: Temporal.RoundingMode },
  fallback: Temporal.RoundingMode
) {
  return GetOption(
    options,
    'roundingMode',
    ['ceil', 'floor', 'expand', 'trunc', 'halfCeil', 'halfFloor', 'halfExpand', 'halfTrunc', 'halfEven'],
    fallback
  );
}

function NegateRoundingMode(roundingMode: Temporal.RoundingMode) {
  switch (roundingMode) {
    case 'ceil':
      return 'floor';
    case 'floor':
      return 'ceil';
    case 'halfCeil':
      return 'halfFloor';
    case 'halfFloor':
      return 'halfCeil';
    default:
      return roundingMode;
  }
}

export function GetTemporalOffsetOption(
  options: Temporal.OffsetDisambiguationOptions | undefined,
  fallback: Required<Temporal.OffsetDisambiguationOptions>['offset']
) {
  if (options === undefined) return fallback;
  return GetOption(options, 'offset', ['prefer', 'use', 'ignore', 'reject'], fallback);
}

export function GetTemporalShowCalendarNameOption(options: Temporal.ShowCalendarOption) {
  return GetOption(options, 'calendarName', ['auto', 'always', 'never', 'critical'], 'auto');
}

export function GetTemporalShowTimeZoneNameOption(options: Temporal.ZonedDateTimeToStringOptions) {
  return GetOption(options, 'timeZoneName', ['auto', 'never', 'critical'], 'auto');
}

export function GetTemporalShowOffsetOption(options: Temporal.ZonedDateTimeToStringOptions) {
  return GetOption(options, 'offset', ['auto', 'never'], 'auto');
}

export function GetDirectionOption(options: { direction?: 'next' | 'previous' }) {
  return GetOption(options, 'direction', ['next', 'previous'], REQUIRED);
}

export function GetTemporalRoundingIncrementOption(options: { roundingIncrement?: number }) {
  let increment = options.roundingIncrement;
  if (increment === undefined) return 1;
  const integerIncrement = ToIntegerWithTruncation(increment);
  if (integerIncrement < 1 || integerIncrement > 1e9) {
    throw new RangeError(`roundingIncrement must be at least 1 and at most 1e9, not ${increment}`);
  }
  return integerIncrement;
}
export function ValidateTemporalRoundingIncrement(increment: number, dividend: number, inclusive: boolean) {
  const maximum = inclusive ? dividend : dividend - 1;
  if (increment > maximum) {
    throw new RangeError(`roundingIncrement must be at least 1 and less than ${maximum}, not ${increment}`);
  }
  if (dividend % increment !== 0) {
    throw new RangeError(`Rounding increment must divide evenly into ${dividend}`);
  }
}

export function GetTemporalFractionalSecondDigitsOption(
  normalizedOptions: Temporal.ToStringPrecisionOptions
): Temporal.ToStringPrecisionOptions['fractionalSecondDigits'] {
  const digitsValue = normalizedOptions.fractionalSecondDigits;
  if (digitsValue === undefined) return 'auto';
  if (typeof digitsValue !== 'number') {
    if (ToString(digitsValue) !== 'auto') {
      throw new RangeError(`fractionalSecondDigits must be 'auto' or 0 through 9, not ${digitsValue}`);
    }
    return 'auto';
  }
  const digitCount = MathFloor(digitsValue);
  if (!NumberIsFinite(digitCount) || digitCount < 0 || digitCount > 9) {
    throw new RangeError(`fractionalSecondDigits must be 'auto' or 0 through 9, not ${digitsValue}`);
  }
  return digitCount as Exclude<Temporal.ToStringPrecisionOptions['fractionalSecondDigits'], 'auto'>;
}

interface SecondsStringPrecisionRecord {
  precision: Temporal.ToStringPrecisionOptions['fractionalSecondDigits'] | 'minute';
  unit: UnitSmallerThanOrEqualTo<'minute'>;
  increment: number;
}

export function ToSecondsStringPrecisionRecord(
  smallestUnit: Temporal.ToStringPrecisionOptions['smallestUnit'],
  precision: Temporal.ToStringPrecisionOptions['fractionalSecondDigits']
): SecondsStringPrecisionRecord {
  switch (smallestUnit) {
    case 'minute':
      return { precision: 'minute', unit: 'minute', increment: 1 };
    case 'second':
      return { precision: 0, unit: 'second', increment: 1 };
    case 'millisecond':
      return { precision: 3, unit: 'millisecond', increment: 1 };
    case 'microsecond':
      return { precision: 6, unit: 'microsecond', increment: 1 };
    case 'nanosecond':
      return { precision: 9, unit: 'nanosecond', increment: 1 };
    default: // fall through if option not given
  }
  switch (precision) {
    case 'auto':
      return { precision, unit: 'nanosecond', increment: 1 };
    case 0:
      return { precision, unit: 'second', increment: 1 };
    case 1:
    case 2:
    case 3:
      return { precision, unit: 'millisecond', increment: 10 ** (3 - precision) };
    case 4:
    case 5:
    case 6:
      return { precision, unit: 'microsecond', increment: 10 ** (6 - precision) };
    case 7:
    case 8:
    case 9:
      return { precision, unit: 'nanosecond', increment: 10 ** (9 - precision) };
    default:
      throw new RangeError(`fractionalSecondDigits must be 'auto' or 0 through 9, not ${precision}`);
  }
}

export const REQUIRED = Symbol('~required~');

interface TemporalUnitOptionsBag {
  smallestUnit?: Temporal.PluralUnit<Temporal.DateTimeUnit> | Temporal.DateTimeUnit;
  largestUnit?: Temporal.PluralUnit<Temporal.DateTimeUnit> | Temporal.DateTimeUnit | 'auto';
  unit?: Temporal.PluralUnit<Temporal.DateTimeUnit> | Temporal.DateTimeUnit;
}
type UnitTypeMapping = {
  date: Temporal.DateUnit;
  time: Temporal.TimeUnit;
  datetime: Temporal.DateTimeUnit;
};
// This type specifies the allowed defaults for each unit key type.
type AllowedGetTemporalUnitDefaultValues = {
  smallestUnit: undefined;
  largestUnit: 'auto' | undefined;
  unit: undefined;
};

export function GetTemporalUnitValuedOption<
  U extends keyof TemporalUnitOptionsBag,
  T extends keyof UnitTypeMapping,
  D extends typeof REQUIRED | UnitTypeMapping[T] | AllowedGetTemporalUnitDefaultValues[U],
  R extends Exclude<D, typeof REQUIRED> | UnitTypeMapping[T]
>(options: TemporalUnitOptionsBag, key: U, unitGroup: T, requiredOrDefault: D): R;
export function GetTemporalUnitValuedOption<
  U extends keyof TemporalUnitOptionsBag,
  T extends keyof UnitTypeMapping,
  D extends typeof REQUIRED | UnitTypeMapping[T] | AllowedGetTemporalUnitDefaultValues[U],
  E extends 'auto' | Temporal.DateTimeUnit,
  R extends UnitTypeMapping[T] | Exclude<D, typeof REQUIRED> | E
>(options: TemporalUnitOptionsBag, key: U, unitGroup: T, requiredOrDefault: D, extraValues: ReadonlyArray<E>): R;
// This signature of the function is NOT used in type-checking, so restricting
// the default value via generic binding like the other overloads isn't
// necessary.
export function GetTemporalUnitValuedOption<
  T extends keyof UnitTypeMapping,
  D extends typeof REQUIRED | UnitTypeMapping[T] | 'auto' | undefined,
  E extends 'auto' | Temporal.DateTimeUnit,
  R extends UnitTypeMapping[T] | Exclude<D, typeof REQUIRED> | E
>(
  options: TemporalUnitOptionsBag,
  key: keyof typeof options,
  unitGroup: T,
  requiredOrDefault: D,
  extraValues: ReadonlyArray<E> | never[] = []
): R {
  const allowedSingular: Array<Temporal.DateTimeUnit | 'auto'> = [];
  for (let index = 0; index < TEMPORAL_UNITS.length; index++) {
    const unitInfo = TEMPORAL_UNITS[index];
    const singular = unitInfo[1];
    const category = unitInfo[2];
    if (unitGroup === 'datetime' || unitGroup === category) {
      allowedSingular.push(singular);
    }
  }
  Call(ArrayPrototypePush, allowedSingular, extraValues);
  let defaultVal: typeof REQUIRED | Temporal.DateTimeUnit | 'auto' | undefined = requiredOrDefault;
  if (defaultVal === REQUIRED) {
    defaultVal = undefined;
  } else if (defaultVal !== undefined) {
    allowedSingular.push(defaultVal);
  }
  const allowedValues: Array<Temporal.DateTimeUnit | Temporal.PluralUnit<Temporal.DateTimeUnit> | 'auto'> = Call(
    ArrayPrototypeSlice,
    allowedSingular,
    []
  );
  for (let ix = 0; ix < allowedSingular.length; ix++) {
    const singular = allowedSingular[ix];
    const plural = PLURAL_FOR.get(singular as Parameters<typeof PLURAL_FOR.get>[0]);
    if (plural !== undefined) allowedValues.push(plural);
  }
  let retval = GetOption(options, key, allowedValues, defaultVal);
  if (retval === undefined && requiredOrDefault === REQUIRED) {
    throw new RangeError(`${key} is required`);
  }
  // Coerce any plural units into their singular form
  if (SINGULAR_FOR.has(retval as Temporal.PluralUnit<Temporal.DateTimeUnit>)) {
    // We just has-checked this, but tsc doesn't understand that.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return SINGULAR_FOR.get(retval as Temporal.PluralUnit<Temporal.DateTimeUnit>)! as R;
  }
  return retval as R;
}

export function GetTemporalRelativeToOption(options: {
  relativeTo?:
    | Temporal.ZonedDateTime
    | Temporal.PlainDateTime
    | Temporal.ZonedDateTimeLike
    | Temporal.PlainDateTimeLike
    | string
    | undefined;
}):
  | { zonedRelativeTo?: Temporal.ZonedDateTime; plainRelativeTo?: never }
  | { plainRelativeTo?: Temporal.PlainDate; zonedRelativeTo?: never } {
  const relativeTo = options.relativeTo;
  if (relativeTo === undefined) return {};

  let offsetBehaviour: OffsetBehaviour = 'option';
  let matchMinutes = false;
  let year, month, day, time, calendar, timeZone, offset;
  if (IsObject(relativeTo)) {
    if (IsTemporalZonedDateTime(relativeTo)) {
      return { zonedRelativeTo: relativeTo };
    }
    if (IsTemporalDate(relativeTo)) return { plainRelativeTo: relativeTo };
    if (IsTemporalDateTime(relativeTo)) return { plainRelativeTo: TemporalDateTimeToDate(relativeTo) };
    calendar = GetTemporalCalendarIdentifierWithISODefault(relativeTo);
    const fields = PrepareCalendarFields(
      calendar,
      relativeTo,
      ['day', 'month', 'monthCode', 'year'],
      ['hour', 'microsecond', 'millisecond', 'minute', 'nanosecond', 'offset', 'second', 'timeZone'],
      []
    );
    ({ year, month, day, time } = InterpretTemporalDateTimeFields(calendar, fields, 'constrain'));
    offset = fields.offset;
    if (offset === undefined) offsetBehaviour = 'wall';
    timeZone = fields.timeZone;
    if (timeZone !== undefined) timeZone = ToTemporalTimeZoneIdentifier(timeZone);
  } else {
    let tzAnnotation, z;
    ({ year, month, day, time, calendar, tzAnnotation, offset, z } = ParseISODateTime(RequireString(relativeTo)));
    if (tzAnnotation) {
      timeZone = ToTemporalTimeZoneIdentifier(tzAnnotation);
      if (z) {
        offsetBehaviour = 'exact';
      } else if (!offset) {
        offsetBehaviour = 'wall';
      }
      matchMinutes = true;
    } else if (z) {
      throw new RangeError(
        'Z designator not supported for PlainDate relativeTo; either remove the Z or add a bracketed time zone'
      );
    }
    if (!calendar) calendar = 'iso8601';
    if (!IsBuiltinCalendar(calendar)) throw new RangeError(`invalid calendar identifier ${calendar}`);
    calendar = CanonicalizeCalendar(calendar);
  }
  if (timeZone === undefined) return { plainRelativeTo: CreateTemporalDate(year, month, day, calendar) };
  const offsetNs = offsetBehaviour === 'option' ? ParseDateTimeUTCOffset(castExists(offset)) : 0;
  const epochNanoseconds = InterpretISODateTimeOffset(
    year,
    month,
    day,
    time,
    offsetBehaviour,
    offsetNs,
    timeZone,
    'compatible',
    'reject',
    matchMinutes
  );
  return { zonedRelativeTo: CreateTemporalZonedDateTime(epochNanoseconds, timeZone, calendar) };
}

export function DefaultTemporalLargestUnit(duration: Temporal.Duration) {
  if (GetSlot(duration, YEARS) !== 0) return 'year';
  if (GetSlot(duration, MONTHS) !== 0) return 'month';
  if (GetSlot(duration, WEEKS) !== 0) return 'week';
  if (GetSlot(duration, DAYS) !== 0) return 'day';
  if (GetSlot(duration, HOURS) !== 0) return 'hour';
  if (GetSlot(duration, MINUTES) !== 0) return 'minute';
  if (GetSlot(duration, SECONDS) !== 0) return 'second';
  if (GetSlot(duration, MILLISECONDS) !== 0) return 'millisecond';
  if (GetSlot(duration, MICROSECONDS) !== 0) return 'microsecond';
  return 'nanosecond';
}

export function LargerOfTwoTemporalUnits<T1 extends Temporal.DateTimeUnit, T2 extends Temporal.DateTimeUnit>(
  unit1: T1,
  unit2: T2
) {
  if (UNITS_DESCENDING.indexOf(unit1) > UNITS_DESCENDING.indexOf(unit2)) return unit2;
  return unit1;
}

export function IsCalendarUnit(unit: Temporal.DateTimeUnit): unit is Exclude<Temporal.DateUnit, 'day'> {
  return unit === 'year' || unit === 'month' || unit === 'week';
}

export function TemporalObjectToFields(
  temporalObject: Temporal.PlainDate | Temporal.PlainDateTime
): ISODateToFieldsReturn<'date'>;
export function TemporalObjectToFields(temporalObject: Temporal.PlainMonthDay): ISODateToFieldsReturn<'month-day'>;
export function TemporalObjectToFields(temporalObject: Temporal.PlainYearMonth): ISODateToFieldsReturn<'year-month'>;
export function TemporalObjectToFields(
  temporalObject: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.PlainYearMonth | Temporal.PlainMonthDay
) {
  const calendar = GetSlot(temporalObject, CALENDAR);
  const isoDate = TemporalObjectToISODateRecord(temporalObject);
  let type: ISODateToFieldsType = 'date';
  if (IsTemporalYearMonth(temporalObject)) {
    type = 'year-month';
  } else if (IsTemporalMonthDay(temporalObject)) {
    type = 'month-day';
  }
  return ISODateToFields(calendar, isoDate, type);
}

type ISODateToFieldsReturn<Type extends ISODateToFieldsType> = Resolve<{
  year: Type extends 'date' | 'year-month' ? number : never;
  monthCode: string;
  day: Type extends 'date' | 'month-day' ? number : never;
}>;

export function ISODateToFields(calendar: BuiltinCalendarId, isoDate: ISODate): ISODateToFieldsReturn<'date'>;
export function ISODateToFields<T extends ISODateToFieldsType>(
  calendar: BuiltinCalendarId,
  isoDate: ISODate,
  type: T
): ISODateToFieldsReturn<T>;
export function ISODateToFields(calendar: BuiltinCalendarId, isoDate: ISODate, type = 'date') {
  const fields = ObjectCreate(null);
  fields.monthCode = CalendarMonthCode(calendar, isoDate);
  if (type === 'month-day' || type === 'date') {
    fields.day = CalendarDay(calendar, isoDate);
  }
  if (type === 'year-month' || type === 'date') {
    fields.year = CalendarYear(calendar, isoDate);
  }
  return fields;
}

type Prop<T, K> = T extends unknown ? (K extends keyof T ? T[K] : undefined) : 'ThisShouldNeverHappen';

type FieldObjectWithRequired<FieldKeys extends FieldKey> = Resolve<
  // The resulting object type contains:
  // - All keys in FieldKeys, which are required properties and their values
  //   don't include undefined.
  // - All the other keys in CalendarFieldsRecord that aren't in FieldKeys,
  //   which are optional properties and their value types explicitly include
  //   undefined.
  {
    -readonly [k in FieldKeys]: Exclude<Prop<CalendarFieldsRecord, k>, undefined>;
  } & {
    -readonly [k in Exclude<Keys<CalendarFieldsRecord>, FieldKeys>]?: Prop<CalendarFieldsRecord, k> | undefined;
  }
>;

type PrepareCalendarFieldsReturn<
  FieldKeys extends FieldKey,
  RequiredFieldsOpt extends ReadonlyArray<FieldKey> | 'partial'
> = RequiredFieldsOpt extends 'partial' ? Partial<CalendarFieldsRecord> : FieldObjectWithRequired<FieldKeys>;

export function PrepareCalendarFields<
  FieldKeys extends FieldKey,
  RequiredFields extends ReadonlyArray<FieldKey> | 'partial'
>(
  calendar: BuiltinCalendarId,
  bag: Partial<Record<FieldKeys, unknown>>,
  calendarFieldNames: Array<FieldKeys>,
  nonCalendarFieldNames: Array<FieldKeys>,
  requiredFields: RequiredFields
): PrepareCalendarFieldsReturn<FieldKeys, RequiredFields> {
  const extraFieldNames = GetIntrinsic('%calendarImpl%')(calendar).extraFields();
  const fields: FieldKeys[] = Call(ArrayPrototypeConcat, calendarFieldNames, [nonCalendarFieldNames, extraFieldNames]);
  const result: Partial<Record<AnyTemporalKey, unknown>> = ObjectCreate(null);
  let any = false;
  Call(ArrayPrototypeSort, fields, []);
  for (let index = 0; index < fields.length; index++) {
    const property = fields[index];
    const value = bag[property];
    if (value !== undefined) {
      any = true;
      result[property] = castExists(BUILTIN_CASTS.get(property))(value);
    } else if (requiredFields !== 'partial') {
      if (Call(ArrayIncludes, requiredFields, [property])) {
        throw new TypeError(`required property '${property}' missing or undefined`);
      }
      result[property] = BUILTIN_DEFAULTS.get(property);
    }
  }
  if (requiredFields === 'partial' && !any) {
    throw new TypeError('no supported properties found');
  }
  return result as unknown as PrepareCalendarFieldsReturn<FieldKeys, RequiredFields>;
}

type FieldCompleteness = 'complete' | 'partial';

export function ToTemporalTimeRecord(bag: Partial<Record<keyof TimeRecord, string | number>>): TimeRecord;
export function ToTemporalTimeRecord(
  bag: Partial<Record<keyof TimeRecord, string | number | undefined>>,
  completeness: 'partial'
): Partial<TimeRecord>;
export function ToTemporalTimeRecord(
  bag: Partial<Record<keyof TimeRecord, string | number>>,
  completeness: 'complete'
): TimeRecord;
export function ToTemporalTimeRecord(
  bag: Partial<Record<keyof TimeRecord, string | number | undefined>>,
  completeness: FieldCompleteness = 'complete'
): Partial<TimeRecord> {
  // NOTE: Field order is sorted to make the sort in PrepareTemporalFields more efficient.
  const fields: (keyof TimeRecord)[] = ['hour', 'microsecond', 'millisecond', 'minute', 'nanosecond', 'second'];
  let any = false;
  const result: Partial<TimeRecord> = ObjectCreate(null);
  for (let index = 0; index < fields.length; index++) {
    const field = fields[index];
    const value = bag[field];
    if (value !== undefined) {
      result[field] = ToIntegerWithTruncation(value);
      any = true;
    } else if (completeness === 'complete') {
      result[field] = 0;
    }
  }
  if (!any) throw new TypeError('invalid time-like');
  return result;
}

export function ToTemporalDate(
  item: PlainDateParams['from'][0],
  options?: PlainDateParams['from'][1]
): Temporal.PlainDate {
  if (IsObject(item)) {
    if (IsTemporalDate(item)) {
      GetTemporalOverflowOption(GetOptionsObject(options));
      return item;
    }
    if (IsTemporalZonedDateTime(item)) {
      const isoDateTime = GetISODateTimeFor(GetSlot(item, TIME_ZONE), GetSlot(item, EPOCHNANOSECONDS));
      GetTemporalOverflowOption(GetOptionsObject(options)); // validate and ignore
      return CreateTemporalDate(isoDateTime.year, isoDateTime.month, isoDateTime.day, GetSlot(item, CALENDAR));
    }
    if (IsTemporalDateTime(item)) {
      GetTemporalOverflowOption(GetOptionsObject(options)); // validate and ignore
      return CreateTemporalDate(
        GetSlot(item, ISO_YEAR),
        GetSlot(item, ISO_MONTH),
        GetSlot(item, ISO_DAY),
        GetSlot(item, CALENDAR)
      );
    }
    const calendar = GetTemporalCalendarIdentifierWithISODefault(item);
    const fields = PrepareCalendarFields(calendar, item, ['day', 'month', 'monthCode', 'year'], [], []);
    const overflow = GetTemporalOverflowOption(GetOptionsObject(options));
    const { year, month, day } = CalendarDateFromFields(calendar, fields, overflow);
    return CreateTemporalDate(year, month, day, calendar);
  }
  let { year, month, day, calendar, z } = ParseTemporalDateString(RequireString(item));
  if (z) throw new RangeError('Z designator not supported for PlainDate');
  if (!calendar) calendar = 'iso8601';
  if (!IsBuiltinCalendar(calendar)) throw new RangeError(`invalid calendar identifier ${calendar}`);
  calendar = CanonicalizeCalendar(calendar);
  uncheckedAssertNarrowedType<BuiltinCalendarId>(calendar, 'lowercased and canonicalized');
  GetTemporalOverflowOption(GetOptionsObject(options)); // validate and ignore
  return CreateTemporalDate(year, month, day, calendar);
}

export function InterpretTemporalDateTimeFields(
  calendar: BuiltinCalendarId,
  fields: CalendarFieldsRecord & TimeRecord,
  overflow: Overflow
) {
  const isoDate = CalendarDateFromFields(calendar, fields, overflow);
  const time = RegulateTime(
    fields.hour,
    fields.minute,
    fields.second,
    fields.millisecond,
    fields.microsecond,
    fields.nanosecond,
    overflow
  );
  return { ...isoDate, time };
}

export function ToTemporalDateTime(item: PlainDateTimeParams['from'][0], options?: PlainDateTimeParams['from'][1]) {
  let year, month, day, time, calendar;

  if (IsObject(item)) {
    if (IsTemporalDateTime(item)) {
      GetTemporalOverflowOption(GetOptionsObject(options));
      return item;
    }
    if (IsTemporalZonedDateTime(item)) {
      const isoDateTime = GetISODateTimeFor(GetSlot(item, TIME_ZONE), GetSlot(item, EPOCHNANOSECONDS));
      GetTemporalOverflowOption(GetOptionsObject(options));
      return CreateTemporalDateTime(
        isoDateTime.year,
        isoDateTime.month,
        isoDateTime.day,
        isoDateTime.hour,
        isoDateTime.minute,
        isoDateTime.second,
        isoDateTime.millisecond,
        isoDateTime.microsecond,
        isoDateTime.nanosecond,
        GetSlot(item, CALENDAR)
      );
    }
    if (IsTemporalDate(item)) {
      GetTemporalOverflowOption(GetOptionsObject(options));
      return CreateTemporalDateTime(
        GetSlot(item, ISO_YEAR),
        GetSlot(item, ISO_MONTH),
        GetSlot(item, ISO_DAY),
        0,
        0,
        0,
        0,
        0,
        0,
        GetSlot(item, CALENDAR)
      );
    }

    calendar = GetTemporalCalendarIdentifierWithISODefault(item);
    const fields = PrepareCalendarFields(
      calendar,
      item,
      ['day', 'month', 'monthCode', 'year'],
      ['hour', 'microsecond', 'millisecond', 'minute', 'nanosecond', 'second'],
      []
    );
    const overflow = GetTemporalOverflowOption(GetOptionsObject(options));
    ({ year, month, day, time } = InterpretTemporalDateTimeFields(calendar, fields, overflow));
  } else {
    let z;
    ({ year, month, day, time, calendar, z } = ParseTemporalDateTimeString(RequireString(item)));
    if (z) throw new RangeError('Z designator not supported for PlainDateTime');
    if (time === 'start-of-day') {
      time = { hour: 0, minute: 0, second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 };
    }
    RejectDateTime(
      year,
      month,
      day,
      time.hour,
      time.minute,
      time.second,
      time.millisecond,
      time.microsecond,
      time.nanosecond
    );
    if (!calendar) calendar = 'iso8601';
    if (!IsBuiltinCalendar(calendar)) throw new RangeError(`invalid calendar identifier ${calendar}`);
    calendar = CanonicalizeCalendar(calendar);
    GetTemporalOverflowOption(GetOptionsObject(options));
  }
  const { hour, minute, second, millisecond, microsecond, nanosecond } = time;
  return CreateTemporalDateTime(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond, calendar);
}

export function ToTemporalDuration(item: DurationParams['from'][0]) {
  if (IsTemporalDuration(item)) return item;
  let { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } =
    ToTemporalDurationRecord(item);
  const TemporalDuration = GetIntrinsic('%Temporal.Duration%');
  return new TemporalDuration(
    years,
    months,
    weeks,
    days,
    hours,
    minutes,
    seconds,
    milliseconds,
    microseconds,
    nanoseconds
  );
}

export function ToTemporalInstant(itemParam: InstantParams['from'][0]) {
  let item: string | number;
  if (IsObject(itemParam)) {
    if (IsTemporalInstant(itemParam)) return itemParam;
    if (IsTemporalZonedDateTime(itemParam)) {
      const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
      return new TemporalInstant(GetSlot(itemParam, EPOCHNANOSECONDS));
    }
    item = ToPrimitive(itemParam, StringCtor);
  } else {
    item = itemParam;
  }
  const { year, month, day, time, offset, z } = ParseTemporalInstantString(RequireString(item));
  const {
    hour = 0,
    minute = 0,
    second = 0,
    millisecond = 0,
    microsecond = 0,
    nanosecond = 0
  } = time === 'start-of-day' ? {} : time;

  // ParseTemporalInstantString ensures that either `z` is true or or `offset` is non-undefined
  const offsetNanoseconds = z ? 0 : ParseDateTimeUTCOffset((assertExists(offset), offset));
  const epochNanoseconds = GetUTCEpochNanoseconds(
    year,
    month,
    day,
    hour,
    minute,
    second,
    millisecond,
    microsecond,
    nanosecond,
    offsetNanoseconds
  );
  ValidateEpochNanoseconds(epochNanoseconds);

  const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
  return new TemporalInstant(epochNanoseconds);
}

export function ToTemporalMonthDay(item: PlainMonthDayParams['from'][0], options?: PlainMonthDayParams['from'][1]) {
  if (IsObject(item)) {
    if (IsTemporalMonthDay(item)) {
      GetTemporalOverflowOption(GetOptionsObject(options));
      return item;
    }
    let calendar;
    if (HasSlot(item, CALENDAR)) {
      calendar = GetSlot(item, CALENDAR);
    } else {
      calendar = item.calendar;
      if (calendar === undefined) calendar = 'iso8601';
      calendar = ToTemporalCalendarIdentifier(calendar);
    }
    const fields = PrepareCalendarFields(calendar, item, ['day', 'month', 'monthCode', 'year'], [], []);
    const overflow = GetTemporalOverflowOption(GetOptionsObject(options));
    const { year, month, day } = CalendarMonthDayFromFields(calendar, fields, overflow);
    return CreateTemporalMonthDay(month, day, calendar, year);
  }

  let { month, day, referenceISOYear, calendar } = ParseTemporalMonthDayString(RequireString(item));
  if (calendar === undefined) calendar = 'iso8601';
  if (!IsBuiltinCalendar(calendar)) throw new RangeError(`invalid calendar identifier ${calendar}`);
  calendar = CanonicalizeCalendar(calendar);
  uncheckedAssertNarrowedType<BuiltinCalendarId>(calendar, 'lowercased and canonicalized');

  GetTemporalOverflowOption(GetOptionsObject(options));
  if (referenceISOYear === undefined) {
    if (calendar !== 'iso8601') {
      throw new Error(`assertion failed: missing year with non-"iso8601" calendar identifier ${calendar}`);
    }
    const isoCalendarReferenceYear = 1972; // First leap year after Unix epoch
    return CreateTemporalMonthDay(month, day, calendar, isoCalendarReferenceYear);
  }
  const isoDate = { year: referenceISOYear, month, day };
  const result = ISODateToFields(calendar, isoDate, 'month-day');
  ({ year: referenceISOYear, month, day } = CalendarMonthDayFromFields(calendar, result, 'constrain'));
  return CreateTemporalMonthDay(month, day, calendar, referenceISOYear);
}

export function ToTemporalTime(item: PlainTimeParams['from'][0], options?: PlainTimeParams['from'][1]) {
  let hour, minute, second, millisecond, microsecond, nanosecond;
  const TemporalPlainTime = GetIntrinsic('%Temporal.PlainTime%');
  if (IsObject(item)) {
    if (IsTemporalTime(item)) {
      GetTemporalOverflowOption(GetOptionsObject(options));
      return item;
    }
    if (IsTemporalZonedDateTime(item)) {
      const isoDateTime = GetISODateTimeFor(GetSlot(item, TIME_ZONE), GetSlot(item, EPOCHNANOSECONDS));
      GetTemporalOverflowOption(GetOptionsObject(options));
      return new TemporalPlainTime(
        isoDateTime.hour,
        isoDateTime.minute,
        isoDateTime.second,
        isoDateTime.millisecond,
        isoDateTime.microsecond,
        isoDateTime.nanosecond
      );
    }
    if (IsTemporalDateTime(item)) {
      GetTemporalOverflowOption(GetOptionsObject(options));
      return new TemporalPlainTime(
        GetSlot(item, ISO_HOUR),
        GetSlot(item, ISO_MINUTE),
        GetSlot(item, ISO_SECOND),
        GetSlot(item, ISO_MILLISECOND),
        GetSlot(item, ISO_MICROSECOND),
        GetSlot(item, ISO_NANOSECOND)
      );
    }
    ({ hour, minute, second, millisecond, microsecond, nanosecond } = ToTemporalTimeRecord(item));
    const overflow = GetTemporalOverflowOption(GetOptionsObject(options));
    ({ hour, minute, second, millisecond, microsecond, nanosecond } = RegulateTime(
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond,
      overflow
    ));
  } else {
    ({ hour, minute, second, millisecond, microsecond, nanosecond } = ParseTemporalTimeString(RequireString(item)));
    RejectTime(hour, minute, second, millisecond, microsecond, nanosecond);
    GetTemporalOverflowOption(GetOptionsObject(options));
  }
  return new TemporalPlainTime(hour, minute, second, millisecond, microsecond, nanosecond);
}

export function ToTemporalTimeOrMidnight(item: string | Temporal.PlainTime | Temporal.PlainTimeLike | undefined) {
  const TemporalPlainTime = GetIntrinsic('%Temporal.PlainTime%');
  if (item === undefined) return new TemporalPlainTime();
  return ToTemporalTime(item);
}

export function ToTemporalYearMonth(
  item: PlainYearMonthParams['from'][0],
  options?: PlainYearMonthParams['from'][1]
): Temporal.PlainYearMonth {
  if (IsObject(item)) {
    if (IsTemporalYearMonth(item)) {
      GetTemporalOverflowOption(GetOptionsObject(options));
      return item;
    }
    const calendar = GetTemporalCalendarIdentifierWithISODefault(item);
    const fields = PrepareCalendarFields(calendar, item, ['month', 'monthCode', 'year'], [], []);
    const overflow = GetTemporalOverflowOption(GetOptionsObject(options));
    const { year, month, day } = CalendarYearMonthFromFields(calendar, fields, overflow);
    return CreateTemporalYearMonth(year, month, calendar, day);
  }

  let { year, month, referenceISODay, calendar } = ParseTemporalYearMonthString(RequireString(item));
  if (calendar === undefined) calendar = 'iso8601';
  if (!IsBuiltinCalendar(calendar)) throw new RangeError(`invalid calendar identifier ${calendar}`);
  calendar = CanonicalizeCalendar(calendar);
  uncheckedAssertNarrowedType<BuiltinCalendarId>(calendar, 'lowercased and canonicalized');

  const result = ISODateToFields(calendar, { year, month, day: referenceISODay }, 'year-month');
  GetTemporalOverflowOption(GetOptionsObject(options));
  ({ year, month, day: referenceISODay } = CalendarYearMonthFromFields(calendar, result, 'constrain'));
  return CreateTemporalYearMonth(year, month, calendar, referenceISODay);
}

type OffsetBehaviour = 'wall' | 'exact' | 'option';

export function InterpretISODateTimeOffset(
  year: number,
  month: number,
  day: number,
  time: 'start-of-day' | TimeRecord,
  offsetBehaviour: OffsetBehaviour,
  offsetNs: number,
  timeZone: string,
  disambiguation: NonNullable<Temporal.ToInstantOptions['disambiguation']>,
  offsetOpt: Temporal.OffsetDisambiguationOptions['offset'],
  matchMinute: boolean
) {
  // start-of-day signifies that we had a string such as YYYY-MM-DD[Zone]. It is
  // grammatically not possible to specify a UTC offset in that string, so the
  // behaviour collapses into ~WALL~, which is equivalent to offset: "ignore".
  if (time === 'start-of-day') {
    if (offsetBehaviour !== 'wall' || offsetNs !== 0) {
      throw new Error('assertion failure: offset cannot be provided in YYYY-MM-DD[Zone] string');
    }
    return GetStartOfDay(timeZone, { year, month, day });
  }

  const dt = CombineISODateAndTimeRecord({ year, month, day }, time);

  if (offsetBehaviour === 'wall' || offsetOpt === 'ignore') {
    // Simple case: ISO string without a TZ offset (or caller wants to ignore
    // the offset), so just convert DateTime to Instant in the given time zone
    return GetEpochNanosecondsFor(timeZone, dt, disambiguation);
  }

  // The caller wants the offset to always win ('use') OR the caller is OK
  // with the offset winning ('prefer' or 'reject') as long as it's valid
  // for this timezone and date/time.
  if (offsetBehaviour === 'exact' || offsetOpt === 'use') {
    // Calculate the instant for the input's date/time and offset
    const epochNs = GetUTCEpochNanoseconds(
      year,
      month,
      day,
      time.hour,
      time.minute,
      time.second,
      time.millisecond,
      time.microsecond,
      time.nanosecond,
      offsetNs
    );
    ValidateEpochNanoseconds(epochNs);
    return epochNs;
  }

  // "prefer" or "reject"
  const possibleEpochNs = GetPossibleEpochNanoseconds(timeZone, dt);
  if (possibleEpochNs.length > 0) {
    const utcEpochNs = GetUTCEpochNanoseconds(
      year,
      month,
      day,
      time.hour,
      time.minute,
      time.second,
      time.millisecond,
      time.microsecond,
      time.nanosecond
    );
    for (let index = 0; index < possibleEpochNs.length; index++) {
      const candidate = possibleEpochNs[index];
      const candidateOffset = JSBI.toNumber(JSBI.subtract(utcEpochNs, candidate));
      const roundedCandidateOffset = RoundNumberToIncrement(candidateOffset, 60e9, 'halfExpand');
      if (candidateOffset === offsetNs || (matchMinute && roundedCandidateOffset === offsetNs)) {
        return candidate;
      }
    }
  }

  // the user-provided offset doesn't match any instants for this time
  // zone and date/time.
  if (offsetOpt === 'reject') {
    const offsetStr = FormatUTCOffsetNanoseconds(offsetNs);
    const dtStr = TemporalDateTimeToString(dt, 'iso8601', 'auto');
    throw new RangeError(`Offset ${offsetStr} is invalid for ${dtStr} in ${timeZone}`);
  }
  // fall through: offsetOpt === 'prefer', but the offset doesn't match
  // so fall back to use the time zone instead.
  return DisambiguatePossibleEpochNanoseconds(possibleEpochNs, timeZone, dt, disambiguation);
}

export function ToTemporalZonedDateTime(
  item: ZonedDateTimeParams['from'][0],
  optionsParam?: ZonedDateTimeParams['from'][1]
) {
  let year, month, day, time, timeZone, offset, calendar;
  let matchMinute = false;
  let offsetBehaviour: OffsetBehaviour = 'option';
  let disambiguation, offsetOpt;
  if (IsObject(item)) {
    if (IsTemporalZonedDateTime(item)) {
      const options = GetOptionsObject(optionsParam);
      GetTemporalDisambiguationOption(options); // validate and ignore
      GetTemporalOffsetOption(options, 'reject');
      GetTemporalOverflowOption(options);
      return item;
    }
    calendar = GetTemporalCalendarIdentifierWithISODefault(item);
    const fields = PrepareCalendarFields(
      calendar,
      item,
      ['day', 'month', 'monthCode', 'year'],
      ['hour', 'microsecond', 'millisecond', 'minute', 'nanosecond', 'offset', 'second', 'timeZone'],
      ['timeZone']
    );
    timeZone = ToTemporalTimeZoneIdentifier(fields.timeZone);
    offset = fields.offset;
    if (offset === undefined) {
      offsetBehaviour = 'wall';
    }
    const options = GetOptionsObject(optionsParam);
    disambiguation = GetTemporalDisambiguationOption(options);
    offsetOpt = GetTemporalOffsetOption(options, 'reject');
    const overflow = GetTemporalOverflowOption(options);
    ({ year, month, day, time } = InterpretTemporalDateTimeFields(calendar, fields, overflow));
  } else {
    let tzAnnotation, z;
    ({ year, month, day, time, tzAnnotation, offset, z, calendar } = ParseTemporalZonedDateTimeString(
      RequireString(item)
    ));
    timeZone = ToTemporalTimeZoneIdentifier(tzAnnotation);
    if (z) {
      offsetBehaviour = 'exact';
    } else if (!offset) {
      offsetBehaviour = 'wall';
    }
    if (!calendar) calendar = 'iso8601';
    if (!IsBuiltinCalendar(calendar)) throw new RangeError(`invalid calendar identifier ${calendar}`);
    calendar = CanonicalizeCalendar(calendar);
    matchMinute = true; // ISO strings may specify offset with less precision
    const options = GetOptionsObject(optionsParam);
    disambiguation = GetTemporalDisambiguationOption(options);
    offsetOpt = GetTemporalOffsetOption(options, 'reject');
    GetTemporalOverflowOption(options); // validate and ignore
  }
  let offsetNs = 0;
  if (offsetBehaviour === 'option') offsetNs = ParseDateTimeUTCOffset(castExists(offset));
  const epochNanoseconds = InterpretISODateTimeOffset(
    year,
    month,
    day,
    time,
    offsetBehaviour,
    offsetNs,
    timeZone,
    disambiguation,
    offsetOpt,
    matchMinute
  );
  return CreateTemporalZonedDateTime(epochNanoseconds, timeZone, calendar);
}

export function CreateTemporalDateSlots(
  result: Temporal.PlainDate,
  isoYear: number,
  isoMonth: number,
  isoDay: number,
  calendar: BuiltinCalendarId
) {
  RejectISODate(isoYear, isoMonth, isoDay);
  RejectDateRange(isoYear, isoMonth, isoDay);

  CreateSlots(result);
  SetSlot(result, ISO_YEAR, isoYear);
  SetSlot(result, ISO_MONTH, isoMonth);
  SetSlot(result, ISO_DAY, isoDay);
  SetSlot(result, CALENDAR, calendar);
  SetSlot(result, DATE_BRAND, true);

  if (DEBUG) {
    const repr = TemporalDateToString(result, 'auto');
    ObjectDefineProperty(result, '_repr_', {
      value: `Temporal.PlainDate <${repr}>`,
      writable: false,
      enumerable: false,
      configurable: false
    });
  }
}

export function CreateTemporalDate(isoYear: number, isoMonth: number, isoDay: number, calendar: BuiltinCalendarId) {
  const TemporalPlainDate = GetIntrinsic('%Temporal.PlainDate%');
  const result: Temporal.PlainDate = ObjectCreate(TemporalPlainDate.prototype);
  CreateTemporalDateSlots(result, isoYear, isoMonth, isoDay, calendar);
  return result;
}

export function CreateTemporalDateTimeSlots(
  result: Temporal.PlainDateTime,
  isoYear: number,
  isoMonth: number,
  isoDay: number,
  h: number,
  min: number,
  s: number,
  ms: number,
  µs: number,
  ns: number,
  calendar: BuiltinCalendarId
) {
  RejectDateTime(isoYear, isoMonth, isoDay, h, min, s, ms, µs, ns);
  RejectDateTimeRange(isoYear, isoMonth, isoDay, h, min, s, ms, µs, ns);

  CreateSlots(result);
  SetSlot(result, ISO_YEAR, isoYear);
  SetSlot(result, ISO_MONTH, isoMonth);
  SetSlot(result, ISO_DAY, isoDay);
  SetSlot(result, ISO_HOUR, h);
  SetSlot(result, ISO_MINUTE, min);
  SetSlot(result, ISO_SECOND, s);
  SetSlot(result, ISO_MILLISECOND, ms);
  SetSlot(result, ISO_MICROSECOND, µs);
  SetSlot(result, ISO_NANOSECOND, ns);
  SetSlot(result, CALENDAR, calendar);

  if (DEBUG) {
    const iso = {
      year: isoYear,
      month: isoMonth,
      day: isoDay,
      hour: h,
      minute: min,
      second: s,
      millisecond: ms,
      microsecond: µs,
      nanosecond: ns
    };
    let repr = TemporalDateTimeToString(iso, calendar, 'auto');
    Object.defineProperty(result, '_repr_', {
      value: `Temporal.PlainDateTime <${repr}>`,
      writable: false,
      enumerable: false,
      configurable: false
    });
  }
}

export function CreateTemporalDateTime(
  isoYear: number,
  isoMonth: number,
  isoDay: number,
  h: number,
  min: number,
  s: number,
  ms: number,
  µs: number,
  ns: number,
  calendar: BuiltinCalendarId = 'iso8601'
) {
  const TemporalPlainDateTime = GetIntrinsic('%Temporal.PlainDateTime%');
  const result = ObjectCreate(TemporalPlainDateTime.prototype);
  CreateTemporalDateTimeSlots(result, isoYear, isoMonth, isoDay, h, min, s, ms, µs, ns, calendar);
  return result as Temporal.PlainDateTime;
}

export function CreateTemporalMonthDaySlots(
  result: Temporal.PlainMonthDay,
  isoMonth: number,
  isoDay: number,
  calendar: BuiltinCalendarId,
  referenceISOYear: number
) {
  RejectISODate(referenceISOYear, isoMonth, isoDay);
  RejectDateRange(referenceISOYear, isoMonth, isoDay);

  CreateSlots(result);
  SetSlot(result, ISO_MONTH, isoMonth);
  SetSlot(result, ISO_DAY, isoDay);
  SetSlot(result, ISO_YEAR, referenceISOYear);
  SetSlot(result, CALENDAR, calendar);
  SetSlot(result, MONTH_DAY_BRAND, true);

  if (DEBUG) {
    const repr = TemporalMonthDayToString(result, 'auto');
    Object.defineProperty(result, '_repr_', {
      value: `Temporal.PlainMonthDay <${repr}>`,
      writable: false,
      enumerable: false,
      configurable: false
    });
  }
}

export function CreateTemporalMonthDay(
  isoMonth: number,
  isoDay: number,
  calendar: BuiltinCalendarId,
  referenceISOYear: number
) {
  const TemporalPlainMonthDay = GetIntrinsic('%Temporal.PlainMonthDay%');
  const result: Temporal.PlainMonthDay = ObjectCreate(TemporalPlainMonthDay.prototype);
  CreateTemporalMonthDaySlots(result, isoMonth, isoDay, calendar, referenceISOYear);
  return result;
}

export function CreateTemporalYearMonthSlots(
  result: Temporal.PlainYearMonth,
  isoYear: number,
  isoMonth: number,
  calendar: BuiltinCalendarId,
  referenceISODay: number
) {
  RejectISODate(isoYear, isoMonth, referenceISODay);
  RejectYearMonthRange(isoYear, isoMonth);

  CreateSlots(result);
  SetSlot(result, ISO_YEAR, isoYear);
  SetSlot(result, ISO_MONTH, isoMonth);
  SetSlot(result, ISO_DAY, referenceISODay);
  SetSlot(result, CALENDAR, calendar);
  SetSlot(result, YEAR_MONTH_BRAND, true);

  if (DEBUG) {
    const repr = TemporalYearMonthToString(result, 'auto');
    Object.defineProperty(result, '_repr_', {
      value: `Temporal.PlainYearMonth <${repr}>`,
      writable: false,
      enumerable: false,
      configurable: false
    });
  }
}

export function CreateTemporalYearMonth(
  isoYear: number,
  isoMonth: number,
  calendar: BuiltinCalendarId,
  referenceISODay: number
) {
  const TemporalPlainYearMonth = GetIntrinsic('%Temporal.PlainYearMonth%');
  const result = ObjectCreate(TemporalPlainYearMonth.prototype);
  CreateTemporalYearMonthSlots(result, isoYear, isoMonth, calendar, referenceISODay);
  return result;
}

export function CreateTemporalZonedDateTimeSlots(
  result: Temporal.ZonedDateTime,
  epochNanoseconds: JSBI,
  timeZone: string,
  calendar: BuiltinCalendarId
) {
  ValidateEpochNanoseconds(epochNanoseconds);

  CreateSlots(result);
  SetSlot(result, EPOCHNANOSECONDS, epochNanoseconds);
  SetSlot(result, TIME_ZONE, timeZone);
  SetSlot(result, CALENDAR, calendar);

  if (DEBUG) {
    const repr = TemporalZonedDateTimeToString(result, 'auto');
    Object.defineProperty(result, '_repr_', {
      value: `Temporal.ZonedDateTime <${repr}>`,
      writable: false,
      enumerable: false,
      configurable: false
    });
  }
}

export function CreateTemporalZonedDateTime(
  epochNanoseconds: JSBI,
  timeZone: string,
  calendar: BuiltinCalendarId = 'iso8601'
) {
  const TemporalZonedDateTime = GetIntrinsic('%Temporal.ZonedDateTime%');
  const result: Temporal.ZonedDateTime = ObjectCreate(TemporalZonedDateTime.prototype);
  CreateTemporalZonedDateTimeSlots(result, epochNanoseconds, timeZone, calendar);
  return result;
}

function CalendarFieldKeysPresent(fields: Record<FieldKey, unknown>) {
  return Call(ArrayPrototypeFilter, CALENDAR_FIELD_KEYS, [(key: FieldKey) => fields[key] !== undefined]);
}

export function CalendarMergeFields<Base extends Record<string, unknown>, ToAdd extends Record<string, unknown>>(
  calendar: BuiltinCalendarId,
  fields: Base,
  additionalFields: ToAdd
) {
  const additionalKeys = CalendarFieldKeysPresent(additionalFields);
  const overriddenKeys = GetIntrinsic('%calendarImpl%')(calendar).fieldKeysToIgnore(additionalKeys);
  const merged = ObjectCreate(null);
  const fieldsKeys = CalendarFieldKeysPresent(fields);
  for (let ix = 0; ix < CALENDAR_FIELD_KEYS.length; ix++) {
    let propValue = undefined;
    const key = CALENDAR_FIELD_KEYS[ix];
    if (Call(ArrayIncludes, fieldsKeys, [key]) && !Call(ArrayIncludes, overriddenKeys, [key])) {
      propValue = fields[key];
    }
    if (Call(ArrayIncludes, additionalKeys, [key])) {
      propValue = additionalFields[key];
    }
    if (propValue !== undefined) merged[key] = propValue;
  }
  return merged as Base & ToAdd;
}

export function CalendarDateAdd(
  calendar: BuiltinCalendarId,
  isoDate: ISODate,
  dateDuration: Partial<DateDuration>,
  overflow: Overflow
) {
  return GetIntrinsic('%calendarImpl%')(calendar).dateAdd(isoDate, dateDuration, overflow);
}

function CalendarDateUntil(
  calendar: BuiltinCalendarId,
  isoDate: ISODate,
  isoOtherDate: ISODate,
  largestUnit: Temporal.DateUnit
) {
  return GetIntrinsic('%calendarImpl%')(calendar).dateUntil(isoDate, isoOtherDate, largestUnit);
}

export function CalendarYear(calendar: BuiltinCalendarId, isoDate: ISODate) {
  return GetIntrinsic('%calendarImpl%')(calendar).year(isoDate);
}

export function CalendarMonth(calendar: BuiltinCalendarId, isoDate: ISODate) {
  return GetIntrinsic('%calendarImpl%')(calendar).month(isoDate);
}

export function CalendarMonthCode(calendar: BuiltinCalendarId, isoDate: ISODate) {
  return GetIntrinsic('%calendarImpl%')(calendar).monthCode(isoDate);
}

export function CalendarDay(calendar: BuiltinCalendarId, isoDate: ISODate) {
  return GetIntrinsic('%calendarImpl%')(calendar).day(isoDate);
}

export function CalendarEra(calendar: BuiltinCalendarId, isoDate: ISODate) {
  return GetIntrinsic('%calendarImpl%')(calendar).era(isoDate);
}

export function CalendarEraYear(calendar: BuiltinCalendarId, isoDate: ISODate) {
  return GetIntrinsic('%calendarImpl%')(calendar).eraYear(isoDate);
}

export function CalendarDayOfWeek(calendar: BuiltinCalendarId, isoDate: ISODate) {
  return GetIntrinsic('%calendarImpl%')(calendar).dayOfWeek(isoDate);
}

export function CalendarDayOfYear(calendar: BuiltinCalendarId, isoDate: ISODate) {
  return GetIntrinsic('%calendarImpl%')(calendar).dayOfYear(isoDate);
}

export function CalendarWeekOfYear(calendar: BuiltinCalendarId, isoDate: ISODate) {
  return GetIntrinsic('%calendarDateWeekOfYear%')(calendar, isoDate).week;
}

export function CalendarYearOfWeek(calendar: BuiltinCalendarId, isoDate: ISODate) {
  return GetIntrinsic('%calendarDateWeekOfYear%')(calendar, isoDate).year;
}

export function CalendarDaysInWeek(calendar: BuiltinCalendarId, isoDate: ISODate) {
  return GetIntrinsic('%calendarImpl%')(calendar).daysInWeek(isoDate);
}

export function CalendarDaysInMonth(calendar: BuiltinCalendarId, isoDate: ISODate) {
  return GetIntrinsic('%calendarImpl%')(calendar).daysInMonth(isoDate);
}

export function CalendarDaysInYear(calendar: BuiltinCalendarId, isoDate: ISODate) {
  return GetIntrinsic('%calendarImpl%')(calendar).daysInYear(isoDate);
}

export function CalendarMonthsInYear(calendar: BuiltinCalendarId, isoDate: ISODate) {
  return GetIntrinsic('%calendarImpl%')(calendar).monthsInYear(isoDate);
}

export function CalendarInLeapYear(calendar: BuiltinCalendarId, isoDate: ISODate) {
  return GetIntrinsic('%calendarImpl%')(calendar).inLeapYear(isoDate);
}

export function ToTemporalCalendarIdentifier(calendarLike: Temporal.CalendarLike): BuiltinCalendarId {
  if (IsObject(calendarLike)) {
    if (HasSlot(calendarLike, CALENDAR)) return GetSlot(calendarLike, CALENDAR);
  }
  const identifier = RequireString(calendarLike);
  if (IsBuiltinCalendar(identifier)) return CanonicalizeCalendar(identifier);
  let calendar;
  try {
    ({ calendar } = ParseISODateTime(identifier));
  } catch {
    try {
      ({ calendar } = ParseTemporalYearMonthString(identifier));
    } catch {
      ({ calendar } = ParseTemporalMonthDayString(identifier));
    }
  }
  if (!calendar) calendar = 'iso8601';
  if (!IsBuiltinCalendar(calendar)) throw new RangeError(`invalid calendar identifier ${calendar}`);
  return CanonicalizeCalendar(calendar);
}

function GetTemporalCalendarIdentifierWithISODefault(item: { calendar?: Temporal.CalendarLike }) {
  if (HasSlot(item, CALENDAR)) return GetSlot(item, CALENDAR);
  const { calendar } = item;
  if (calendar === undefined) return 'iso8601';
  return ToTemporalCalendarIdentifier(calendar);
}

export function CalendarEquals(one: BuiltinCalendarId, two: BuiltinCalendarId) {
  return CanonicalizeCalendar(one) === CanonicalizeCalendar(two);
}

export function CalendarDateFromFields(calendar: BuiltinCalendarId, fields: CalendarFieldsRecord, overflow: Overflow) {
  return GetIntrinsic('%calendarImpl%')(calendar).dateFromFields(fields, overflow);
}

export function CalendarYearMonthFromFields(
  calendar: BuiltinCalendarId,
  fields: CalendarFieldsRecord,
  overflow: Overflow
) {
  return GetIntrinsic('%calendarImpl%')(calendar).yearMonthFromFields(fields, overflow);
}

export function CalendarMonthDayFromFields(
  calendar: BuiltinCalendarId,
  fields: MonthDayFromFieldsObject,
  overflow: Overflow
) {
  return GetIntrinsic('%calendarImpl%')(calendar).monthDayFromFields(fields, overflow);
}

export function ToTemporalTimeZoneIdentifier(temporalTimeZoneLike: unknown): string {
  if (IsObject(temporalTimeZoneLike)) {
    if (IsTemporalZonedDateTime(temporalTimeZoneLike)) return GetSlot(temporalTimeZoneLike, TIME_ZONE);
  }
  const timeZoneString = RequireString(temporalTimeZoneLike);

  const { tzName, offsetMinutes } = ParseTemporalTimeZoneString(timeZoneString);
  if (offsetMinutes !== undefined) {
    return FormatOffsetTimeZoneIdentifier(offsetMinutes);
  }
  // if offsetMinutes is undefined, then tzName must be present
  const record = GetAvailableNamedTimeZoneIdentifier(castExists(tzName));
  if (!record) throw new RangeError(`Unrecognized time zone ${tzName}`);
  return record.identifier;
}

export function TimeZoneEquals(one: string, two: string) {
  if (one === two) return true;
  const offsetMinutes1 = ParseTimeZoneIdentifier(one).offsetMinutes;
  const offsetMinutes2 = ParseTimeZoneIdentifier(two).offsetMinutes;
  if (offsetMinutes1 === undefined && offsetMinutes2 === undefined) {
    // Calling GetAvailableNamedTimeZoneIdentifier is costly, so (unlike the
    // spec) the polyfill will early-return if one of them isn't recognized. Try
    // the second ID first because it's more likely to be unknown, because it
    // can come from the argument of TimeZone.p.equals as opposed to the first
    // ID which comes from the receiver.
    const idRecord2 = GetAvailableNamedTimeZoneIdentifier(two);
    if (!idRecord2) return false;
    const idRecord1 = GetAvailableNamedTimeZoneIdentifier(one);
    if (!idRecord1) return false;
    return idRecord1.primaryIdentifier === idRecord2.primaryIdentifier;
  } else {
    return offsetMinutes1 === offsetMinutes2;
  }
}

export function TemporalDateTimeToDate(dateTime: Temporal.PlainDateTime) {
  return CreateTemporalDate(
    GetSlot(dateTime, ISO_YEAR),
    GetSlot(dateTime, ISO_MONTH),
    GetSlot(dateTime, ISO_DAY),
    GetSlot(dateTime, CALENDAR)
  );
}

export function TemporalDateTimeToTime(dateTime: Temporal.PlainDateTime) {
  const Time = GetIntrinsic('%Temporal.PlainTime%');
  return new Time(
    GetSlot(dateTime, ISO_HOUR),
    GetSlot(dateTime, ISO_MINUTE),
    GetSlot(dateTime, ISO_SECOND),
    GetSlot(dateTime, ISO_MILLISECOND),
    GetSlot(dateTime, ISO_MICROSECOND),
    GetSlot(dateTime, ISO_NANOSECOND)
  );
}

export function GetOffsetNanosecondsFor(timeZone: string, epochNs: JSBI) {
  const offsetMinutes = ParseTimeZoneIdentifier(timeZone).offsetMinutes;
  if (offsetMinutes !== undefined) return offsetMinutes * 60e9;

  return GetNamedTimeZoneOffsetNanoseconds(timeZone, epochNs);
}

export function FormatUTCOffsetNanoseconds(offsetNs: number): string {
  const sign = offsetNs < 0 ? '-' : '+';
  const absoluteNs = MathAbs(offsetNs);
  const hour = MathFloor(absoluteNs / 3600e9);
  const minute = MathFloor(absoluteNs / 60e9) % 60;
  const second = MathFloor(absoluteNs / 1e9) % 60;
  const subSecondNs = absoluteNs % 1e9;
  const precision = second === 0 && subSecondNs === 0 ? 'minute' : 'auto';
  const timeString = FormatTimeString(hour, minute, second, subSecondNs, precision);
  return `${sign}${timeString}`;
}

export function GetISODateTimeFor(timeZone: string, epochNs: JSBI) {
  const offsetNs = GetOffsetNanosecondsFor(timeZone, epochNs);
  let { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } = GetISOPartsFromEpoch(epochNs);
  return BalanceISODateTime(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond + offsetNs);
}

export function GetEpochNanosecondsFor(
  timeZone: string,
  isoDateTime: ISODateTime,
  disambiguation: NonNullable<Temporal.ToInstantOptions['disambiguation']>
) {
  const possibleEpochNs = GetPossibleEpochNanoseconds(timeZone, isoDateTime);
  return DisambiguatePossibleEpochNanoseconds(possibleEpochNs, timeZone, isoDateTime, disambiguation);
}

// TODO: See if this logic can be removed in favour of GetNamedTimeZoneEpochNanoseconds
function DisambiguatePossibleEpochNanoseconds(
  possibleEpochNs: JSBI[],
  timeZone: string,
  isoDateTime: ISODate & Partial<ISODateTime>,
  disambiguation: NonNullable<Temporal.ToInstantOptions['disambiguation']>
) {
  const numInstants = possibleEpochNs.length;

  if (numInstants === 1) return possibleEpochNs[0];
  if (numInstants) {
    switch (disambiguation) {
      case 'compatible':
      // fall through because 'compatible' means 'earlier' for "fall back" transitions
      case 'earlier':
        return possibleEpochNs[0];
      case 'later':
        return possibleEpochNs[numInstants - 1];
      case 'reject': {
        throw new RangeError('multiple instants found');
      }
    }
  }

  if (disambiguation === 'reject') throw new RangeError('multiple instants found');
  const {
    year,
    month,
    day,
    hour = 0,
    minute = 0,
    second = 0,
    millisecond = 0,
    microsecond = 0,
    nanosecond = 0
  } = isoDateTime;
  const utcns = GetUTCEpochNanoseconds(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond);

  const dayBefore = JSBI.subtract(utcns, DAY_NANOS_JSBI);
  ValidateEpochNanoseconds(dayBefore);
  const offsetBefore = GetOffsetNanosecondsFor(timeZone, dayBefore);
  const dayAfter = JSBI.add(utcns, DAY_NANOS_JSBI);
  ValidateEpochNanoseconds(dayAfter);
  const offsetAfter = GetOffsetNanosecondsFor(timeZone, dayAfter);
  const nanoseconds = offsetAfter - offsetBefore;
  if (MathAbs(nanoseconds) > DAY_NANOS) {
    throw new Error('assertion failure: UTC offset shift longer than 24 hours');
  }

  switch (disambiguation) {
    case 'earlier': {
      const norm = TimeDuration.normalize(0, 0, 0, 0, 0, -nanoseconds);
      const earlierTime = AddTime(hour, minute, second, millisecond, microsecond, nanosecond, norm);
      const earlierDate = BalanceISODate(year, month, day + earlierTime.deltaDays);
      return GetPossibleEpochNanoseconds(timeZone, { ...earlierTime, ...earlierDate })[0];
    }
    case 'compatible':
    // fall through because 'compatible' means 'later' for "spring forward" transitions
    case 'later': {
      const norm = TimeDuration.normalize(0, 0, 0, 0, 0, nanoseconds);
      const laterTime = AddTime(hour, minute, second, millisecond, microsecond, nanosecond, norm);
      const laterDate = BalanceISODate(year, month, day + laterTime.deltaDays);
      const possible = GetPossibleEpochNanoseconds(timeZone, { ...laterTime, ...laterDate });
      return possible[possible.length - 1];
    }
  }
}

function GetPossibleEpochNanoseconds(timeZone: string, isoDateTime: ISODateTime) {
  const { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } = isoDateTime;
  const offsetMinutes = ParseTimeZoneIdentifier(timeZone).offsetMinutes;
  if (offsetMinutes !== undefined) {
    return [
      GetUTCEpochNanoseconds(
        year,
        month,
        day,
        hour,
        minute,
        second,
        millisecond,
        microsecond,
        nanosecond,
        offsetMinutes * 60e9
      )
    ];
  }

  return GetNamedTimeZoneEpochNanoseconds(
    timeZone,
    year,
    month,
    day,
    hour,
    minute,
    second,
    millisecond,
    microsecond,
    nanosecond
  );
}

export function GetStartOfDay(timeZone: string, isoDate: ISODate) {
  const isoDateTime = { ...isoDate, hour: 0, minute: 0, second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 };
  const possibleEpochNs = GetPossibleEpochNanoseconds(timeZone, isoDateTime);
  // If not a DST gap, return the single or earlier epochNs
  if (possibleEpochNs.length) return possibleEpochNs[0];

  // Otherwise, 00:00:00 lies within a DST gap. Compute an epochNs that's
  // guaranteed to be before the transition
  if (IsOffsetTimeZoneIdentifier(timeZone)) {
    throw new Error('assertion failure: should only be reached with named time zone');
  }

  const utcns = GetUTCEpochNanoseconds(isoDate.year, isoDate.month, isoDate.day, 0, 0, 0, 0, 0, 0);
  const dayBefore = JSBI.subtract(utcns, DAY_NANOS_JSBI);
  ValidateEpochNanoseconds(dayBefore);
  return castExists(GetNamedTimeZoneNextTransition(timeZone, dayBefore));
}

export function ISOYearString(year: number) {
  let yearString;
  if (year < 0 || year > 9999) {
    const sign = year < 0 ? '-' : '+';
    const yearNumber = MathAbs(year);
    yearString = sign + ToZeroPaddedDecimalString(yearNumber, 6);
  } else {
    yearString = ToZeroPaddedDecimalString(year, 4);
  }
  return yearString;
}

export function ISODateTimePartString(part: number) {
  return ToZeroPaddedDecimalString(part, 2);
}

function FormatFractionalSeconds(
  subSecondNanoseconds: number,
  precision: Exclude<SecondsStringPrecisionRecord['precision'], 'minute'>
): string {
  let fraction;
  if (precision === 'auto') {
    if (subSecondNanoseconds === 0) return '';
    const fractionFullPrecision = ToZeroPaddedDecimalString(subSecondNanoseconds, 9);
    // now remove any trailing zeroes
    fraction = fractionFullPrecision.replace(/0+$/, '');
  } else {
    if (precision === 0) return '';
    const fractionFullPrecision = ToZeroPaddedDecimalString(subSecondNanoseconds, 9);
    fraction = Call(StringPrototypeSlice, fractionFullPrecision, [0, precision]);
  }
  return `.${fraction}`;
}

export function FormatTimeString(
  hour: number,
  minute: number,
  second: number,
  subSecondNanoseconds: number,
  precision: SecondsStringPrecisionRecord['precision']
): string {
  let result = `${ISODateTimePartString(hour)}:${ISODateTimePartString(minute)}`;
  if (precision === 'minute') return result;

  result += `:${ISODateTimePartString(second)}`;
  result += FormatFractionalSeconds(subSecondNanoseconds, precision);
  return result;
}

export function TemporalInstantToString(
  instant: Temporal.Instant,
  timeZone: string | undefined,
  precision: SecondsStringPrecisionRecord['precision']
) {
  let outputTimeZone = timeZone;
  if (outputTimeZone === undefined) outputTimeZone = 'UTC';
  const epochNs = GetSlot(instant, EPOCHNANOSECONDS);
  const iso = GetISODateTimeFor(outputTimeZone, epochNs);
  const dateTimeString = TemporalDateTimeToString(iso, 'iso8601', precision, 'never');
  let timeZoneString = 'Z';
  if (timeZone !== undefined) {
    const offsetNs = GetOffsetNanosecondsFor(outputTimeZone, epochNs);
    timeZoneString = FormatDateTimeUTCOffsetRounded(offsetNs);
  }
  return `${dateTimeString}${timeZoneString}`;
}

interface ToStringOptions {
  unit: SecondsStringPrecisionRecord['unit'];
  increment: number;
  roundingMode: ReturnType<typeof GetRoundingModeOption>;
}

function formatAsDecimalNumber(num: number | JSBI): string {
  if (typeof num === 'number' && num <= NumberMaxSafeInteger) return num.toString(10);
  return JSBI.BigInt(num).toString();
}

export function TemporalDurationToString(
  years: number,
  months: number,
  weeks: number,
  days: number,
  hours: number,
  minutes: number,
  normSeconds: TimeDuration,
  precision: Exclude<SecondsStringPrecisionRecord['precision'], 'minute'> = 'auto'
) {
  const sign = DurationSign(years, months, weeks, days, hours, minutes, normSeconds.sec, 0, 0, normSeconds.subsec);

  let datePart = '';
  if (years !== 0) datePart += `${formatAsDecimalNumber(MathAbs(years))}Y`;
  if (months !== 0) datePart += `${formatAsDecimalNumber(MathAbs(months))}M`;
  if (weeks !== 0) datePart += `${formatAsDecimalNumber(MathAbs(weeks))}W`;
  if (days !== 0) datePart += `${formatAsDecimalNumber(MathAbs(days))}D`;

  let timePart = '';
  if (hours !== 0) timePart += `${formatAsDecimalNumber(MathAbs(hours))}H`;
  if (minutes !== 0) timePart += `${formatAsDecimalNumber(MathAbs(minutes))}M`;

  if (
    !normSeconds.isZero() ||
    (years === 0 && months === 0 && weeks === 0 && days === 0 && hours === 0 && minutes === 0) ||
    precision !== 'auto'
  ) {
    const secondsPart = formatAsDecimalNumber(MathAbs(normSeconds.sec));
    const subSecondsPart = FormatFractionalSeconds(MathAbs(normSeconds.subsec), precision);
    timePart += `${secondsPart}${subSecondsPart}S`;
  }
  let result = `${sign < 0 ? '-' : ''}P${datePart}`;
  if (timePart) result = `${result}T${timePart}`;
  return result;
}

export function TemporalDateToString(
  date: Temporal.PlainDate,
  showCalendar: Temporal.ShowCalendarOption['calendarName'] = 'auto'
) {
  const year = ISOYearString(GetSlot(date, ISO_YEAR));
  const month = ISODateTimePartString(GetSlot(date, ISO_MONTH));
  const day = ISODateTimePartString(GetSlot(date, ISO_DAY));
  const calendar = MaybeFormatCalendarAnnotation(GetSlot(date, CALENDAR), showCalendar);
  return `${year}-${month}-${day}${calendar}`;
}

export function TemporalDateTimeToString(
  isoDateTime: ISODateTime,
  calendar: BuiltinCalendarId,
  precision: SecondsStringPrecisionRecord['precision'],
  showCalendar: ReturnType<typeof GetTemporalShowCalendarNameOption> = 'auto'
) {
  let { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } = isoDateTime;
  const yearString = ISOYearString(year);
  const monthString = ISODateTimePartString(month);
  const dayString = ISODateTimePartString(day);
  const subSecondNanoseconds = millisecond * 1e6 + microsecond * 1e3 + nanosecond;
  const timeString = FormatTimeString(hour, minute, second, subSecondNanoseconds, precision);
  const calendarString = MaybeFormatCalendarAnnotation(calendar, showCalendar);
  return `${yearString}-${monthString}-${dayString}T${timeString}${calendarString}`;
}

export function TemporalMonthDayToString(
  monthDay: Temporal.PlainMonthDay,
  showCalendar: Temporal.ShowCalendarOption['calendarName'] = 'auto'
) {
  const month = ISODateTimePartString(GetSlot(monthDay, ISO_MONTH));
  const day = ISODateTimePartString(GetSlot(monthDay, ISO_DAY));
  let resultString = `${month}-${day}`;
  const calendar = GetSlot(monthDay, CALENDAR);
  if (showCalendar === 'always' || showCalendar === 'critical' || calendar !== 'iso8601') {
    const year = ISOYearString(GetSlot(monthDay, ISO_YEAR));
    resultString = `${year}-${resultString}`;
  }
  const calendarString = FormatCalendarAnnotation(calendar, showCalendar);
  if (calendarString) resultString += calendarString;
  return resultString;
}

export function TemporalYearMonthToString(
  yearMonth: Temporal.PlainYearMonth,
  showCalendar: Temporal.ShowCalendarOption['calendarName'] = 'auto'
) {
  const year = ISOYearString(GetSlot(yearMonth, ISO_YEAR));
  const month = ISODateTimePartString(GetSlot(yearMonth, ISO_MONTH));
  let resultString = `${year}-${month}`;
  const calendar = GetSlot(yearMonth, CALENDAR);
  if (showCalendar === 'always' || showCalendar === 'critical' || calendar !== 'iso8601') {
    const day = ISODateTimePartString(GetSlot(yearMonth, ISO_DAY));
    resultString += `-${day}`;
  }
  const calendarString = FormatCalendarAnnotation(calendar, showCalendar);
  if (calendarString) resultString += calendarString;
  return resultString;
}

export function TemporalZonedDateTimeToString(
  zdt: Temporal.ZonedDateTime,
  precision: SecondsStringPrecisionRecord['precision'],
  showCalendar: ReturnType<typeof GetTemporalShowCalendarNameOption> = 'auto',
  showTimeZone: ReturnType<typeof GetTemporalShowTimeZoneNameOption> = 'auto',
  showOffset: ReturnType<typeof GetTemporalShowOffsetOption> = 'auto',
  options: ToStringOptions | undefined = undefined
) {
  let epochNs = GetSlot(zdt, EPOCHNANOSECONDS);

  if (options) {
    const { unit, increment, roundingMode } = options;
    epochNs = RoundTemporalInstant(epochNs, increment, unit, roundingMode);
  }

  const tz = GetSlot(zdt, TIME_ZONE);
  const offsetNs = GetOffsetNanosecondsFor(tz, epochNs);
  const iso = GetISODateTimeFor(tz, epochNs);
  let dateTimeString = TemporalDateTimeToString(iso, 'iso8601', precision, 'never');
  if (showOffset !== 'never') {
    dateTimeString += FormatDateTimeUTCOffsetRounded(offsetNs);
  }
  if (showTimeZone !== 'never') {
    const flag = showTimeZone === 'critical' ? '!' : '';
    dateTimeString += `[${flag}${tz}]`;
  }
  dateTimeString += MaybeFormatCalendarAnnotation(GetSlot(zdt, CALENDAR), showCalendar);
  return dateTimeString;
}

export function IsOffsetTimeZoneIdentifier(string: string): boolean {
  return OFFSET.test(string);
}

export function ParseDateTimeUTCOffset(string: string): number {
  const match = OFFSET_WITH_PARTS.exec(string);
  if (!match) {
    throw new RangeError(`invalid time zone offset: ${string}`);
  }
  const sign = match[1] === '-' ? -1 : +1;
  const hours = +match[2];
  const minutes = +(match[3] || 0);
  const seconds = +(match[4] || 0);
  const nanoseconds = +((match[5] || 0) + '000000000').slice(0, 9);
  const offsetNanoseconds = sign * (((hours * 60 + minutes) * 60 + seconds) * 1e9 + nanoseconds);
  return offsetNanoseconds;
}

let canonicalTimeZoneIdsCache: Map<string, string> | undefined | null = undefined;

export function GetAvailableNamedTimeZoneIdentifier(
  identifier: string
): { identifier: string; primaryIdentifier: string } | undefined {
  // The most common case is when the identifier is a canonical time zone ID.
  // Fast-path that case by caching all canonical IDs. For old ECMAScript
  // implementations lacking this API, set the cache to `null` to avoid retries.
  if (canonicalTimeZoneIdsCache === undefined) {
    const canonicalTimeZoneIds = IntlSupportedValuesOf?.('timeZone');
    if (canonicalTimeZoneIds) {
      canonicalTimeZoneIdsCache = new MapCtor();
      for (let ix = 0; ix < canonicalTimeZoneIds.length; ix++) {
        const id = canonicalTimeZoneIds[ix];
        Call(MapPrototypeSet, canonicalTimeZoneIdsCache, [ASCIILowercase(id), id]);
      }
    } else {
      canonicalTimeZoneIdsCache = null;
    }
  }

  const lower = ASCIILowercase(identifier);
  let primaryIdentifier = canonicalTimeZoneIdsCache?.get(lower);
  if (primaryIdentifier) return { identifier: primaryIdentifier, primaryIdentifier };

  // It's not already a primary identifier, so get its primary identifier (or
  // return if it's not an available named time zone ID).
  try {
    const formatter = getIntlDateTimeFormatEnUsForTimeZone(identifier);
    primaryIdentifier = formatter.resolvedOptions().timeZone;
  } catch {
    return undefined;
  }

  // Some legacy identifiers are aliases in ICU but not legal IANA identifiers.
  // Reject them even if the implementation's Intl supports them, as they are
  // not present in the IANA time zone database.
  if (Call(SetPrototypeHas, ICU_LEGACY_TIME_ZONE_IDS, [identifier])) {
    throw new RangeError(`${identifier} is a legacy time zone identifier from ICU. Use ${primaryIdentifier} instead`);
  }

  // The identifier is an alias (a deprecated identifier that's a synonym for a
  // primary identifier), so we need to case-normalize the identifier to match
  // the IANA TZDB, e.g. america/new_york => America/New_York. There's no
  // built-in way to do this using Intl.DateTimeFormat, but the we can normalize
  // almost all aliases (modulo a few special cases) using the TZDB's basic
  // capitalization pattern:
  // 1. capitalize the first letter of the identifier
  // 2. capitalize the letter after every slash, dash, or underscore delimiter
  const standardCase = [...lower]
    .map((c, i) => (i === 0 || '/-_'.includes(lower[i - 1]) ? c.toUpperCase() : c))
    .join('');
  const segments = standardCase.split('/');

  if (segments.length === 1) {
    // If a single-segment legacy ID is 2-3 chars or contains a number or dash, then
    // (except for the "GB-Eire" special case) the case-normalized form is uppercase.
    // These are: GMT+0, GMT-0, GB, NZ, PRC, ROC, ROK, UCT, GMT, GMT0, CET, CST6CDT,
    // EET, EST, HST, MET, MST, MST7MDT, PST8PDT, WET, NZ-CHAT, and W-SU.
    // Otherwise it's standard form: first letter capitalized, e.g. Iran, Egypt, Hongkong
    if (lower === 'gb-eire') return { identifier: 'GB-Eire', primaryIdentifier };
    return {
      identifier: lower.length <= 3 || /[-0-9]/.test(lower) ? lower.toUpperCase() : segments[0],
      primaryIdentifier
    };
  }

  // All Etc zone names are uppercase except three exceptions.
  if (segments[0] === 'Etc') {
    const etcName = ['Zulu', 'Greenwich', 'Universal'].includes(segments[1]) ? segments[1] : segments[1].toUpperCase();
    return { identifier: `Etc/${etcName}`, primaryIdentifier };
  }

  // Legacy US identifiers like US/Alaska or US/Indiana-Starke are 2 segments and use standard form.
  if (segments[0] === 'Us') return { identifier: `US/${segments[1]}`, primaryIdentifier };

  // For multi-segment IDs, there's a few special cases in the second/third segments
  const specialCases = new Map([
    ['Act', 'ACT'],
    ['Lhi', 'LHI'],
    ['Nsw', 'NSW'],
    ['Dar_Es_Salaam', 'Dar_es_Salaam'],
    ['Port_Of_Spain', 'Port_of_Spain'],
    ['Port-Au-Prince', 'Port-au-Prince'],
    ['Isle_Of_Man', 'Isle_of_Man'],
    ['Comodrivadavia', 'ComodRivadavia'],
    ['Knox_In', 'Knox_IN'],
    ['Dumontdurville', 'DumontDUrville'],
    ['Mcmurdo', 'McMurdo'],
    ['Denoronha', 'DeNoronha'],
    ['Easterisland', 'EasterIsland'],
    ['Bajanorte', 'BajaNorte'],
    ['Bajasur', 'BajaSur']
  ]);
  segments[1] = specialCases.get(segments[1]) ?? segments[1];
  if (segments.length > 2) segments[2] = specialCases.get(segments[2]) ?? segments[2];
  return { identifier: segments.join('/'), primaryIdentifier };
}

function GetNamedTimeZoneOffsetNanoseconds(id: string, epochNanoseconds: JSBI) {
  const { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } =
    GetNamedTimeZoneDateTimeParts(id, epochNanoseconds);
  const utc = GetUTCEpochNanoseconds(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond);
  return JSBI.toNumber(JSBI.subtract(utc, epochNanoseconds));
}

export function FormatOffsetTimeZoneIdentifier(offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? '-' : '+';
  const absoluteMinutes = MathAbs(offsetMinutes);
  const hour = MathFloor(absoluteMinutes / 60);
  const minute = absoluteMinutes % 60;
  const timeString = FormatTimeString(hour, minute, 0, 0, 'minute');
  return `${sign}${timeString}`;
}

function FormatDateTimeUTCOffsetRounded(offsetNanosecondsParam: number): string {
  const offsetNanoseconds = RoundNumberToIncrement(offsetNanosecondsParam, MINUTE_NANOS, 'halfExpand');
  return FormatOffsetTimeZoneIdentifier(offsetNanoseconds / 60e9);
}

function GetUTCEpochNanoseconds(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
  microsecond: number,
  nanosecond: number,
  offsetNs = 0
) {
  // The pattern of leap years in the ISO 8601 calendar repeats every 400
  // years. To avoid overflowing at the edges of the range, we reduce the year
  // to the remainder after dividing by 400, and then add back all the
  // nanoseconds from the multiples of 400 years at the end.
  const reducedYear = year % 400;
  const yearCycles = (year - reducedYear) / 400;

  // Note: Date.UTC() interprets one and two-digit years as being in the
  // 20th century, so don't use it
  const legacyDate = new Date();
  legacyDate.setUTCHours(hour, minute, second, millisecond);
  legacyDate.setUTCFullYear(reducedYear, month - 1, day);
  const ms = legacyDate.getTime();
  let ns = JSBI.multiply(JSBI.BigInt(ms), MILLION);
  ns = JSBI.add(ns, JSBI.multiply(JSBI.BigInt(microsecond), THOUSAND));
  ns = JSBI.add(ns, JSBI.BigInt(nanosecond));

  let result = JSBI.add(ns, JSBI.multiply(NS_IN_400_YEAR_CYCLE, JSBI.BigInt(yearCycles)));
  if (offsetNs) result = JSBI.subtract(result, JSBI.BigInt(offsetNs));
  return result;
}

export function GetISOPartsFromEpoch(epochNanoseconds: JSBI) {
  const { quotient, remainder } = divmod(epochNanoseconds, MILLION);
  let epochMilliseconds = JSBI.toNumber(quotient);
  let nanos = JSBI.toNumber(remainder);
  if (nanos < 0) {
    nanos += 1e6;
    epochMilliseconds -= 1;
  }
  const microsecond = MathFloor(nanos / 1e3) % 1e3;
  const nanosecond = nanos % 1e3;

  const item = new Date(epochMilliseconds);
  const year = item.getUTCFullYear();
  const month = item.getUTCMonth() + 1;
  const day = item.getUTCDate();
  const hour = item.getUTCHours();
  const minute = item.getUTCMinutes();
  const second = item.getUTCSeconds();
  const millisecond = item.getUTCMilliseconds();

  return { epochMilliseconds, year, month, day, hour, minute, second, millisecond, microsecond, nanosecond };
}

// ts-prune-ignore-next TODO: remove this after tests are converted to TS
export function GetNamedTimeZoneDateTimeParts(id: string, epochNanoseconds: JSBI) {
  const { epochMilliseconds, millisecond, microsecond, nanosecond } = GetISOPartsFromEpoch(epochNanoseconds);
  const { year, month, day, hour, minute, second } = GetFormatterParts(id, epochMilliseconds);
  return BalanceISODateTime(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond);
}

export function GetNamedTimeZoneNextTransition(id: string, epochNanoseconds: JSBI): JSBI | null {
  if (JSBI.lessThan(epochNanoseconds, BEFORE_FIRST_OFFSET_TRANSITION)) {
    return GetNamedTimeZoneNextTransition(id, BEFORE_FIRST_OFFSET_TRANSITION);
  }
  // Optimization: the farthest that we'll look for a next transition is 3 years
  // after the later of epochNanoseconds or the current time. If there are no
  // transitions found before then, we'll assume that there will not be any more
  // transitions after that.
  const now = SystemUTCEpochNanoSeconds();
  const base = JSBI.GT(epochNanoseconds, now) ? epochNanoseconds : now;
  const uppercap = JSBI.add(base, ABOUT_THREE_YEARS_NANOS);
  let leftNanos = epochNanoseconds;
  let leftOffsetNs = GetNamedTimeZoneOffsetNanoseconds(id, leftNanos);
  let rightNanos = leftNanos;
  let rightOffsetNs = leftOffsetNs;
  while (leftOffsetNs === rightOffsetNs && JSBI.lessThan(JSBI.BigInt(leftNanos), uppercap)) {
    rightNanos = JSBI.add(leftNanos, TWO_WEEKS_NANOS);
    if (JSBI.greaterThan(rightNanos, NS_MAX)) return null;
    rightOffsetNs = GetNamedTimeZoneOffsetNanoseconds(id, rightNanos);
    if (leftOffsetNs === rightOffsetNs) {
      leftNanos = rightNanos;
    }
  }
  if (leftOffsetNs === rightOffsetNs) return null;
  const result = bisect(
    (epochNs: JSBI) => GetNamedTimeZoneOffsetNanoseconds(id, epochNs),
    leftNanos,
    rightNanos,
    leftOffsetNs,
    rightOffsetNs
  );
  return result;
}

export function GetNamedTimeZonePreviousTransition(id: string, epochNanoseconds: JSBI): JSBI | null {
  // Optimization: if the instant is more than 3 years in the future and there
  // are no transitions between the present day and 3 years from now, assume
  // there are none after.
  const now = SystemUTCEpochNanoSeconds();
  const lookahead = JSBI.add(now, ABOUT_THREE_YEARS_NANOS);
  if (JSBI.greaterThan(epochNanoseconds, lookahead)) {
    const prevBeforeLookahead = GetNamedTimeZonePreviousTransition(id, lookahead);
    if (prevBeforeLookahead === null || JSBI.lessThan(prevBeforeLookahead, now)) {
      return prevBeforeLookahead;
    }
  }

  // We assume most time zones either have regular DST rules that extend
  // indefinitely into the future, or they have no DST transitions between now
  // and next year. Africa/Casablanca and Africa/El_Aaiun are unique cases
  // that fit neither of these. Their irregular DST transitions are
  // precomputed until 2087 in the current time zone database, so requesting
  // the previous transition for an instant far in the future may take an
  // extremely long time as it loops backward 2 weeks at a time.
  if (id === 'Africa/Casablanca' || id === 'Africa/El_Aaiun') {
    const lastPrecomputed = GetSlot(ToTemporalInstant('2088-01-01T00Z'), EPOCHNANOSECONDS);
    if (JSBI.lessThan(lastPrecomputed, epochNanoseconds)) {
      return GetNamedTimeZonePreviousTransition(id, lastPrecomputed);
    }
  }

  let rightNanos = JSBI.subtract(epochNanoseconds, ONE);
  if (JSBI.lessThan(rightNanos, BEFORE_FIRST_OFFSET_TRANSITION)) return null;
  const rightOffsetNs = GetNamedTimeZoneOffsetNanoseconds(id, rightNanos);
  let leftNanos = rightNanos;
  let leftOffsetNs = rightOffsetNs;
  while (rightOffsetNs === leftOffsetNs && JSBI.greaterThan(rightNanos, BEFORE_FIRST_OFFSET_TRANSITION)) {
    leftNanos = JSBI.subtract(rightNanos, TWO_WEEKS_NANOS);
    if (JSBI.lessThan(leftNanos, BEFORE_FIRST_OFFSET_TRANSITION)) return null;
    leftOffsetNs = GetNamedTimeZoneOffsetNanoseconds(id, leftNanos);
    if (rightOffsetNs === leftOffsetNs) {
      rightNanos = leftNanos;
    }
  }
  if (rightOffsetNs === leftOffsetNs) return null;
  const result = bisect(
    (epochNs: JSBI) => GetNamedTimeZoneOffsetNanoseconds(id, epochNs),
    leftNanos,
    rightNanos,
    leftOffsetNs,
    rightOffsetNs
  );
  return result;
}

// ts-prune-ignore-next TODO: remove this after tests are converted to TS
export function parseFromEnUsFormat(datetime: string) {
  const parts = datetime.split(/[^\w]+/);

  if (parts.length !== 7) {
    throw new RangeError(`expected 7 parts in "${datetime}`);
  }

  const month = +parts[0];
  const day = +parts[1];
  let year = +parts[2];
  const era = parts[3].toUpperCase();
  if (era === 'B' || era === 'BC') {
    year = -year + 1;
  } else if (era !== 'A' && era !== 'AD') {
    throw new RangeError(`Unknown era ${era} in "${datetime}`);
  }
  let hour = +parts[4];
  if (hour === 24) {
    // bugs.chromium.org/p/chromium/issues/detail?id=1045791
    hour = 0;
  }
  const minute = +parts[5];
  const second = +parts[6];

  if (
    !NumberIsFinite(year) ||
    !NumberIsFinite(month) ||
    !NumberIsFinite(day) ||
    !NumberIsFinite(hour) ||
    !NumberIsFinite(minute) ||
    !NumberIsFinite(second)
  ) {
    throw new RangeError(`Invalid number in "${datetime}`);
  }

  return { year, month, day, hour, minute, second };
}

// ts-prune-ignore-next TODO: remove this after tests are converted to TS
export function GetFormatterParts(timeZone: string, epochMilliseconds: number) {
  const formatter = getIntlDateTimeFormatEnUsForTimeZone(timeZone);
  // Using `format` instead of `formatToParts` for compatibility with older clients
  const datetime = formatter.format(new Date(epochMilliseconds));
  return parseFromEnUsFormat(datetime);
}

// The goal of this function is to find the exact time(s) that correspond to a
// calendar date and clock time in a particular time zone. Normally there will
// be only one match. But for repeated clock times after backwards transitions
// (like when DST ends) there may be two matches. And for skipped clock times
// after forward transitions, there will be no matches.
function GetNamedTimeZoneEpochNanoseconds(
  id: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
  microsecond: number,
  nanosecond: number
) {
  // Get the offset of one day before and after the requested calendar date and
  // clock time, avoiding overflows if near the edge of the Instant range.
  const ns = GetUTCEpochNanoseconds(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond);
  let nsEarlier = JSBI.subtract(ns, DAY_NANOS_JSBI);
  if (JSBI.lessThan(nsEarlier, NS_MIN)) nsEarlier = ns;
  let nsLater = JSBI.add(ns, DAY_NANOS_JSBI);
  if (JSBI.greaterThan(nsLater, NS_MAX)) nsLater = ns;
  const earlierOffsetNs = GetNamedTimeZoneOffsetNanoseconds(id, nsEarlier);
  const laterOffsetNs = GetNamedTimeZoneOffsetNanoseconds(id, nsLater);

  // If before and after offsets are the same, then we assume there was no
  // offset transition in between, and therefore only one exact time can
  // correspond to the provided calendar date and clock time. But if they're
  // different, then there was an offset transition in between, so test both
  // offsets to see which one(s) will yield a matching exact time.
  const found = earlierOffsetNs === laterOffsetNs ? [earlierOffsetNs] : [earlierOffsetNs, laterOffsetNs];
  return found
    .map((offsetNanoseconds) => {
      const epochNanoseconds = JSBI.subtract(ns, JSBI.BigInt(offsetNanoseconds));
      const parts = GetNamedTimeZoneDateTimeParts(id, epochNanoseconds);
      if (
        year !== parts.year ||
        month !== parts.month ||
        day !== parts.day ||
        hour !== parts.hour ||
        minute !== parts.minute ||
        second !== parts.second ||
        millisecond !== parts.millisecond ||
        microsecond !== parts.microsecond ||
        nanosecond !== parts.nanosecond
      ) {
        return undefined;
      }
      return epochNanoseconds;
    })
    .filter((x) => x !== undefined) as JSBI[];
}

export function LeapYear(year: number) {
  if (undefined === year) return false;
  const isDiv4 = year % 4 === 0;
  const isDiv100 = year % 100 === 0;
  const isDiv400 = year % 400 === 0;
  return isDiv4 && (!isDiv100 || isDiv400);
}

export function ISODaysInMonth(year: number, month: number) {
  const DoM = {
    standard: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
    leapyear: [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  };
  return DoM[LeapYear(year) ? 'leapyear' : 'standard'][month - 1];
}

export function DurationSign(
  y: number,
  mon: number,
  w: number,
  d: number,
  h: number,
  min: number,
  s: number,
  ms: number,
  µs: number,
  ns: number
) {
  const fields = [y, mon, w, d, h, min, s, ms, µs, ns];
  for (let index = 0; index < fields.length; index++) {
    const prop = fields[index];
    if (prop !== 0) return prop < 0 ? -1 : 1;
  }
  return 0;
}

function BalanceISOYearMonth(yearParam: number, monthParam: number) {
  let year = yearParam;
  let month = monthParam;
  if (!NumberIsFinite(year) || !NumberIsFinite(month)) throw new RangeError('infinity is out of range');
  month -= 1;
  year += MathFloor(month / 12);
  month %= 12;
  if (month < 0) month += 12;
  month += 1;
  return { year, month };
}

export function BalanceISODate(yearParam: number, monthParam: number, dayParam: number) {
  let year = yearParam;
  let month = monthParam;
  let day = dayParam;
  if (!NumberIsFinite(day)) throw new RangeError('infinity is out of range');
  ({ year, month } = BalanceISOYearMonth(year, month));

  // The pattern of leap years in the ISO 8601 calendar repeats every 400
  // years. So if we have more than 400 years in days, there's no need to
  // convert days to a year 400 times. We can convert a multiple of 400 all at
  // once.
  const daysIn400YearCycle = 400 * 365 + 97;
  if (MathAbs(day) > daysIn400YearCycle) {
    const nCycles = MathTrunc(day / daysIn400YearCycle);
    year += 400 * nCycles;
    day -= nCycles * daysIn400YearCycle;
  }

  let daysInYear = 0;
  let testYear = month > 2 ? year : year - 1;
  while (((daysInYear = LeapYear(testYear) ? 366 : 365), day < -daysInYear)) {
    year -= 1;
    testYear -= 1;
    day += daysInYear;
  }
  testYear += 1;
  while (((daysInYear = LeapYear(testYear) ? 366 : 365), day > daysInYear)) {
    year += 1;
    testYear += 1;
    day -= daysInYear;
  }

  while (day < 1) {
    ({ year, month } = BalanceISOYearMonth(year, month - 1));
    day += ISODaysInMonth(year, month);
  }
  while (day > ISODaysInMonth(year, month)) {
    day -= ISODaysInMonth(year, month);
    ({ year, month } = BalanceISOYearMonth(year, month + 1));
  }

  return { year, month, day };
}

function BalanceISODateTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
  microsecond: number,
  nanosecond: number
) {
  const time = BalanceTime(hour, minute, second, millisecond, microsecond, nanosecond);
  const isoDate = BalanceISODate(year, month, day + time.deltaDays);
  return CombineISODateAndTimeRecord(isoDate, time);
}

function BalanceTime(
  hourParam: number,
  minuteParam: number,
  secondParam: number,
  millisecondParam: number,
  microsecondParam: number,
  nanosecondParam: number
) {
  let hour = JSBI.BigInt(hourParam);
  let minute = JSBI.BigInt(minuteParam);
  let second = JSBI.BigInt(secondParam);
  let millisecond = JSBI.BigInt(millisecondParam);
  let microsecond = JSBI.BigInt(microsecondParam);
  let nanosecond = JSBI.BigInt(nanosecondParam);
  let quotient;

  ({ quotient, remainder: nanosecond } = NonNegativeBigIntDivmod(nanosecond, THOUSAND));
  microsecond = JSBI.add(microsecond, quotient);

  ({ quotient, remainder: microsecond } = NonNegativeBigIntDivmod(microsecond, THOUSAND));
  millisecond = JSBI.add(millisecond, quotient);

  ({ quotient, remainder: millisecond } = NonNegativeBigIntDivmod(millisecond, THOUSAND));
  second = JSBI.add(second, quotient);

  ({ quotient, remainder: second } = NonNegativeBigIntDivmod(second, SIXTY));
  minute = JSBI.add(minute, quotient);

  ({ quotient, remainder: minute } = NonNegativeBigIntDivmod(minute, SIXTY));
  hour = JSBI.add(hour, quotient);

  ({ quotient, remainder: hour } = NonNegativeBigIntDivmod(hour, TWENTY_FOUR));

  return {
    deltaDays: JSBI.toNumber(quotient),
    hour: JSBI.toNumber(hour),
    minute: JSBI.toNumber(minute),
    second: JSBI.toNumber(second),
    millisecond: JSBI.toNumber(millisecond),
    microsecond: JSBI.toNumber(microsecond),
    nanosecond: JSBI.toNumber(nanosecond)
  };
}

export function BalanceTimeDuration(norm: TimeDuration, largestUnit: Temporal.DateTimeUnit) {
  const sign = norm.sign();
  let nanoseconds = norm.abs().subsec;
  let microseconds = 0;
  let milliseconds = 0;
  let seconds = norm.abs().sec;
  let minutes = 0;
  let hours = 0;
  let days = 0;

  switch (largestUnit) {
    case 'year':
    case 'month':
    case 'week':
    case 'day':
      microseconds = MathTrunc(nanoseconds / 1000);
      nanoseconds %= 1000;
      milliseconds = MathTrunc(microseconds / 1000);
      microseconds %= 1000;
      seconds += MathTrunc(milliseconds / 1000);
      milliseconds %= 1000;
      minutes = MathTrunc(seconds / 60);
      seconds %= 60;
      hours = MathTrunc(minutes / 60);
      minutes %= 60;
      days = MathTrunc(hours / 24);
      hours %= 24;
      break;
    case 'hour':
      microseconds = MathTrunc(nanoseconds / 1000);
      nanoseconds %= 1000;
      milliseconds = MathTrunc(microseconds / 1000);
      microseconds %= 1000;
      seconds += MathTrunc(milliseconds / 1000);
      milliseconds %= 1000;
      minutes = MathTrunc(seconds / 60);
      seconds %= 60;
      hours = MathTrunc(minutes / 60);
      minutes %= 60;
      break;
    case 'minute':
      microseconds = MathTrunc(nanoseconds / 1000);
      nanoseconds %= 1000;
      milliseconds = MathTrunc(microseconds / 1000);
      microseconds %= 1000;
      seconds += MathTrunc(milliseconds / 1000);
      milliseconds %= 1000;
      minutes = MathTrunc(seconds / 60);
      seconds %= 60;
      break;
    case 'second':
      microseconds = MathTrunc(nanoseconds / 1000);
      nanoseconds %= 1000;
      milliseconds = MathTrunc(microseconds / 1000);
      microseconds %= 1000;
      seconds += MathTrunc(milliseconds / 1000);
      milliseconds %= 1000;
      break;
    case 'millisecond':
      microseconds = MathTrunc(nanoseconds / 1000);
      nanoseconds %= 1000;
      milliseconds = FMAPowerOf10(seconds, 3, MathTrunc(microseconds / 1000));
      microseconds %= 1000;
      seconds = 0;
      break;
    case 'microsecond':
      microseconds = FMAPowerOf10(seconds, 6, MathTrunc(nanoseconds / 1000));
      nanoseconds %= 1000;
      seconds = 0;
      break;
    case 'nanosecond':
      nanoseconds = FMAPowerOf10(seconds, 9, nanoseconds);
      seconds = 0;
      break;
    default:
      throw new Error('assert not reached');
  }

  days *= sign;
  hours *= sign;
  minutes *= sign;
  seconds *= sign;
  milliseconds *= sign;
  microseconds *= sign;
  nanoseconds *= sign;

  RejectDuration(0, 0, 0, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
  return { days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
}

export function UnbalanceDateDurationRelative(
  years: number,
  months: number,
  weeks: number,
  days: number,
  plainRelativeTo: Temporal.PlainDate
) {
  if (years === 0 && months === 0 && weeks === 0) return days;

  // balance years, months, and weeks down to days
  const isoDate = TemporalObjectToISODateRecord(plainRelativeTo);
  const later = CalendarDateAdd(GetSlot(plainRelativeTo, CALENDAR), isoDate, { years, months, weeks }, 'constrain');
  const epochDaysEarlier = ISODateToEpochDays(isoDate.year, isoDate.month, isoDate.day);
  const epochDaysLater = ISODateToEpochDays(later.year, later.month, later.day);
  const yearsMonthsWeeksInDays = epochDaysLater - epochDaysEarlier;
  return days + yearsMonthsWeeksInDays;
}

export function CreateNegatedTemporalDuration(duration: Temporal.Duration) {
  const TemporalDuration = GetIntrinsic('%Temporal.Duration%');
  return new TemporalDuration(
    -GetSlot(duration, YEARS),
    -GetSlot(duration, MONTHS),
    -GetSlot(duration, WEEKS),
    -GetSlot(duration, DAYS),
    -GetSlot(duration, HOURS),
    -GetSlot(duration, MINUTES),
    -GetSlot(duration, SECONDS),
    -GetSlot(duration, MILLISECONDS),
    -GetSlot(duration, MICROSECONDS),
    -GetSlot(duration, NANOSECONDS)
  );
}

export function ConstrainToRange(value: number | undefined, min: number, max: number) {
  // Math.Max accepts undefined values and returns NaN. Undefined values are
  // used for optional params in the method below.
  return MathMin(max, MathMax(min, value as number));
}
function ConstrainISODate(year: number, monthParam: number, dayParam?: number) {
  const month = ConstrainToRange(monthParam, 1, 12);
  const day = ConstrainToRange(dayParam, 1, ISODaysInMonth(year, month));
  return { year, month, day };
}

function ConstrainTime(
  hourParam: number,
  minuteParam: number,
  secondParam: number,
  millisecondParam: number,
  microsecondParam: number,
  nanosecondParam: number
) {
  const hour = ConstrainToRange(hourParam, 0, 23);
  const minute = ConstrainToRange(minuteParam, 0, 59);
  const second = ConstrainToRange(secondParam, 0, 59);
  const millisecond = ConstrainToRange(millisecondParam, 0, 999);
  const microsecond = ConstrainToRange(microsecondParam, 0, 999);
  const nanosecond = ConstrainToRange(nanosecondParam, 0, 999);
  return { hour, minute, second, millisecond, microsecond, nanosecond };
}

export function RejectToRange(value: number, min: number, max: number) {
  if (value < min || value > max) throw new RangeError(`value out of range: ${min} <= ${value} <= ${max}`);
}

function RejectISODate(year: number, month: number, day: number) {
  RejectToRange(month, 1, 12);
  RejectToRange(day, 1, ISODaysInMonth(year, month));
}

export function RejectDateRange(year: number, month: number, day: number) {
  // Noon avoids trouble at edges of DateTime range (excludes midnight)
  RejectDateTimeRange(year, month, day, 12, 0, 0, 0, 0, 0);
}

export function RejectTime(
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
  microsecond: number,
  nanosecond: number
) {
  RejectToRange(hour, 0, 23);
  RejectToRange(minute, 0, 59);
  RejectToRange(second, 0, 59);
  RejectToRange(millisecond, 0, 999);
  RejectToRange(microsecond, 0, 999);
  RejectToRange(nanosecond, 0, 999);
}

function RejectDateTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
  microsecond: number,
  nanosecond: number
) {
  RejectISODate(year, month, day);
  RejectTime(hour, minute, second, millisecond, microsecond, nanosecond);
}

export function RejectDateTimeRange(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
  microsecond: number,
  nanosecond: number
) {
  const ns = GetUTCEpochNanoseconds(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond);
  if (JSBI.lessThan(ns, DATETIME_NS_MIN) || JSBI.greaterThan(ns, DATETIME_NS_MAX)) {
    // Because PlainDateTime's range is wider than Instant's range, the line
    // below will always throw. Calling `ValidateEpochNanoseconds` avoids
    // repeating the same error message twice.
    ValidateEpochNanoseconds(ns);
  }
}

// In the spec, IsValidEpochNanoseconds returns a boolean and call sites are
// responsible for throwing. In the polyfill, ValidateEpochNanoseconds takes its
// place so that we can DRY the throwing code.
export function ValidateEpochNanoseconds(epochNanoseconds: JSBI) {
  if (JSBI.lessThan(epochNanoseconds, NS_MIN) || JSBI.greaterThan(epochNanoseconds, NS_MAX)) {
    throw new RangeError('date/time value is outside of supported range');
  }
}

export function RejectYearMonthRange(year: number, month: number) {
  RejectToRange(year, YEAR_MIN, YEAR_MAX);
  if (year === YEAR_MIN) {
    RejectToRange(month, 4, 12);
  } else if (year === YEAR_MAX) {
    RejectToRange(month, 1, 9);
  }
}

export function RejectDuration(
  y: number,
  mon: number,
  w: number,
  d: number,
  h: number,
  min: number,
  s: number,
  ms: number,
  µs: number,
  ns: number
) {
  const sign = DurationSign(y, mon, w, d, h, min, s, ms, µs, ns);
  const fields = [y, mon, w, d, h, min, s, ms, µs, ns];
  for (let index = 0; index < fields.length; index++) {
    const prop = fields[index];
    if (!NumberIsFinite(prop)) throw new RangeError('infinite values not allowed as duration fields');
    const propSign = MathSign(prop);
    if (propSign !== 0 && propSign !== sign) throw new RangeError('mixed-sign values not allowed as duration fields');
  }
  if (MathAbs(y) >= 2 ** 32 || MathAbs(mon) >= 2 ** 32 || MathAbs(w) >= 2 ** 32) {
    throw new RangeError('years, months, and weeks must be < 2³²');
  }
  const msResult = TruncatingDivModByPowerOf10(ms, 3);
  const µsResult = TruncatingDivModByPowerOf10(µs, 6);
  const nsResult = TruncatingDivModByPowerOf10(ns, 9);
  const remainderSec = TruncatingDivModByPowerOf10(msResult.mod * 1e6 + µsResult.mod * 1e3 + nsResult.mod, 9).div;
  const totalSec = d * 86400 + h * 3600 + min * 60 + s + msResult.div + µsResult.div + nsResult.div + remainderSec;
  if (!NumberIsSafeInteger(totalSec)) {
    throw new RangeError('total of duration time units cannot exceed 9007199254740991.999999999 s');
  }
}

function ISODateSurpasses(sign: -1 | 1, y1: number, m1: number, d1: number, y2: number, m2: number, d2: number) {
  const cmp = CompareISODate(y1, m1, d1, y2, m2, d2);
  return sign * cmp === 1;
}

function CombineDateAndNormalizedTimeDuration(y: number, m: number, w: number, d: number, norm: TimeDuration) {
  const dateSign = DurationSign(y, m, w, d, 0, 0, 0, 0, 0, 0);
  const timeSign = norm.sign();
  if (dateSign !== 0 && timeSign !== 0 && dateSign !== timeSign) {
    throw new RangeError('mixed-sign values not allowed as duration fields');
  }
}

function ISODateToEpochDays(y: number, m: number, d: number) {
  // This is inefficient, but we use GetUTCEpochNanoseconds to avoid duplicating
  // the workarounds for legacy Date. (see that function for explanation)
  return JSBI.toNumber(JSBI.divide(GetUTCEpochNanoseconds(y, m, d, 0, 0, 0, 0, 0, 0), DAY_NANOS_JSBI));
}

export function DifferenceISODate<Allowed extends Temporal.DateTimeUnit>(
  y1: number,
  m1: number,
  d1: number,
  y2: number,
  m2: number,
  d2: number,
  largestUnit: Allowed
) {
  const sign = -CompareISODate(y1, m1, d1, y2, m2, d2);
  if (sign === 0) return { years: 0, months: 0, weeks: 0, days: 0 };
  uncheckedAssertNarrowedType<-1 | 1>(sign, "the - operator's return type is number");

  let years = 0;
  let months = 0;
  let intermediate;
  if (largestUnit === 'year' || largestUnit === 'month') {
    // We can skip right to the neighbourhood of the correct number of years,
    // it'll be at least one less than y2 - y1 (unless it's zero)
    let candidateYears = y2 - y1;
    if (candidateYears !== 0) candidateYears -= sign;
    // loops at most twice
    while (!ISODateSurpasses(sign, y1 + candidateYears, m1, d1, y2, m2, d2)) {
      years = candidateYears;
      candidateYears += sign;
    }

    let candidateMonths = sign;
    intermediate = BalanceISOYearMonth(y1 + years, m1 + candidateMonths);
    // loops at most 12 times
    while (!ISODateSurpasses(sign, intermediate.year, intermediate.month, d1, y2, m2, d2)) {
      months = candidateMonths;
      candidateMonths += sign;
      intermediate = BalanceISOYearMonth(intermediate.year, intermediate.month + sign);
    }

    if (largestUnit === 'month') {
      months += years * 12;
      years = 0;
    }
  }

  intermediate = BalanceISOYearMonth(y1 + years, m1 + months);
  const constrained = ConstrainISODate(intermediate.year, intermediate.month, d1);

  let weeks = 0;
  let days = ISODateToEpochDays(y2, m2, d2) - ISODateToEpochDays(constrained.year, constrained.month, constrained.day);

  if (largestUnit === 'week') {
    weeks = MathTrunc(days / 7);
    days %= 7;
  }

  return { years, months, weeks, days };
}

function DifferenceTime(
  h1: number,
  min1: number,
  s1: number,
  ms1: number,
  µs1: number,
  ns1: number,
  h2: number,
  min2: number,
  s2: number,
  ms2: number,
  µs2: number,
  ns2: number
) {
  const hours = h2 - h1;
  const minutes = min2 - min1;
  const seconds = s2 - s1;
  const milliseconds = ms2 - ms1;
  const microseconds = µs2 - µs1;
  const nanoseconds = ns2 - ns1;
  const norm = TimeDuration.normalize(hours, minutes, seconds, milliseconds, microseconds, nanoseconds);

  if (norm.abs().sec >= 86400) throw new Error('assertion failure in DifferenceTime: _bt_.[[Days]] should be 0');

  return norm;
}

function DifferenceInstant(
  ns1: JSBI,
  ns2: JSBI,
  increment: number,
  smallestUnit: TimeUnitOrDay,
  roundingMode: Temporal.RoundingMode
) {
  const diff = TimeDuration.fromEpochNsDiff(ns2, ns1);
  return RoundTimeDuration(0, diff, increment, smallestUnit, roundingMode);
}

function DifferenceISODateTime(
  y1Param: number,
  mon1Param: number,
  d1Param: number,
  h1: number,
  min1: number,
  s1: number,
  ms1: number,
  µs1: number,
  ns1: number,
  y2Param: number,
  mon2Param: number,
  d2Param: number,
  h2: number,
  min2: number,
  s2: number,
  ms2: number,
  µs2: number,
  ns2: number,
  calendar: BuiltinCalendarId,
  largestUnit: Temporal.DateTimeUnit
) {
  let y1 = y1Param;
  let mon1 = mon1Param;
  let d1 = d1Param;
  let y2 = y2Param;
  let mon2 = mon2Param;
  let d2 = d2Param;

  let timeDuration = DifferenceTime(h1, min1, s1, ms1, µs1, ns1, h2, min2, s2, ms2, µs2, ns2);

  const timeSign = timeDuration.sign();
  const dateSign = CompareISODate(y2, mon2, d2, y1, mon1, d1);

  // back-off a day from date2 so that the signs of the date a time diff match
  if (dateSign === -timeSign) {
    ({ year: y2, month: mon2, day: d2 } = BalanceISODate(y2, mon2, d2 + timeSign));
    timeDuration = timeDuration.add24HourDays(-timeSign);
  }

  const date1 = { year: y1, month: mon1, day: d1 };
  const date2 = { year: y2, month: mon2, day: d2 };
  const dateLargestUnit = LargerOfTwoTemporalUnits('day', largestUnit) as Temporal.DateUnit;
  let { years, months, weeks, days } = CalendarDateUntil(calendar, date1, date2, dateLargestUnit);
  if (largestUnit !== dateLargestUnit) {
    // largestUnit < days, so add the days in to the normalized duration
    timeDuration = timeDuration.add24HourDays(days);
    days = 0;
  }
  CombineDateAndNormalizedTimeDuration(years, months, weeks, days, timeDuration);
  return { years, months, weeks, days, norm: timeDuration };
}

function DifferenceZonedDateTime(
  ns1: JSBI,
  ns2: JSBI,
  timeZone: string,
  calendar: BuiltinCalendarId,
  largestUnit: Temporal.DateTimeUnit
) {
  const nsDiff = JSBI.subtract(ns2, ns1);
  if (JSBI.equal(nsDiff, ZERO)) {
    return {
      years: 0,
      months: 0,
      weeks: 0,
      days: 0,
      norm: TimeDuration.ZERO
    };
  }
  const sign = JSBI.lessThan(nsDiff, ZERO) ? -1 : 1;

  // Convert start/end instants to datetimes
  const isoDtStart = GetISODateTimeFor(timeZone, ns1);
  const isoDtEnd = GetISODateTimeFor(timeZone, ns2);

  // Simulate moving ns1 as many years/months/weeks/days as possible without
  // surpassing ns2. This value is stored in intermediateDateTime/intermediateInstant/intermediateNs.
  // We do not literally move years/months/weeks/days with calendar arithmetic,
  // but rather assume intermediateDateTime will have the same time-parts as
  // dtStart and the date-parts from dtEnd, and move backward from there.
  // The number of days we move backward is stored in dayCorrection.
  // Credit to Adam Shaw for devising this algorithm.
  let dayCorrection = 0;
  let intermediateDateTime: ISODateTime | undefined;
  let norm;

  // The max number of allowed day corrections depends on the direction of travel.
  // Both directions allow for 1 day correction due to an ISO wall-clock overshoot (see below).
  // Only the forward direction allows for an additional 1 day correction caused by a push-forward
  // 'compatible' DST transition causing the wall-clock to overshoot again.
  // This max value is inclusive.
  let maxDayCorrection = sign === 1 ? 2 : 1;

  // Detect ISO wall-clock overshoot.
  // If the diff of the ISO wall-clock times is opposite to the overall diff's sign,
  // we are guaranteed to need at least one day correction.
  let timeDuration = DifferenceTime(
    isoDtStart.hour,
    isoDtStart.minute,
    isoDtStart.second,
    isoDtStart.millisecond,
    isoDtStart.microsecond,
    isoDtStart.nanosecond,
    isoDtEnd.hour,
    isoDtEnd.minute,
    isoDtEnd.second,
    isoDtEnd.millisecond,
    isoDtEnd.microsecond,
    isoDtEnd.nanosecond
  );
  if (timeDuration.sign() === -sign) {
    dayCorrection++;
  }

  for (; dayCorrection <= maxDayCorrection; dayCorrection++) {
    const intermediateDate = BalanceISODate(isoDtEnd.year, isoDtEnd.month, isoDtEnd.day - dayCorrection * sign);

    // Incorporate time parts from dtStart
    intermediateDateTime = {
      year: intermediateDate.year,
      month: intermediateDate.month,
      day: intermediateDate.day,
      hour: isoDtStart.hour,
      minute: isoDtStart.minute,
      second: isoDtStart.second,
      millisecond: isoDtStart.millisecond,
      microsecond: isoDtStart.microsecond,
      nanosecond: isoDtStart.nanosecond
    };

    // Convert intermediate datetime to epoch-nanoseconds (may disambiguate)
    const intermediateNs = GetEpochNanosecondsFor(timeZone, intermediateDateTime, 'compatible');

    // Compute the nanosecond diff between the intermediate instant and the final destination
    norm = TimeDuration.fromEpochNsDiff(ns2, intermediateNs);

    // Did intermediateNs NOT surpass ns2?
    // If so, exit the loop with success (without incrementing dayCorrection past maxDayCorrection)
    if (norm.sign() !== -sign) {
      break;
    }
  }

  if (dayCorrection > maxDayCorrection) {
    throw new Error(`assertion failed: more than ${maxDayCorrection} day correction needed`);
  }

  // Output of the above loop
  assertExists(intermediateDateTime);
  assertExists(norm);

  // Similar to what happens in DifferenceISODateTime with date parts only:
  const dateLargestUnit = LargerOfTwoTemporalUnits('day', largestUnit) as Temporal.DateUnit;
  const { years, months, weeks, days } = CalendarDateUntil(calendar, isoDtStart, intermediateDateTime, dateLargestUnit);

  CombineDateAndNormalizedTimeDuration(years, months, weeks, days, norm);
  return { years, months, weeks, days, norm };
}

// Epoch-nanosecond bounding technique where the start/end of the calendar-unit
// interval are converted to epoch-nanosecond times and destEpochNs is nudged to
// either one.
function NudgeToCalendarUnit(
  sign: -1 | 1,
  durationParam: InternalDuration,
  destEpochNs: JSBI,
  dateTime: ISODateTime,
  timeZone: string | null,
  calendar: BuiltinCalendarId,
  increment: number,
  unit: Temporal.DateUnit,
  roundingMode: Temporal.RoundingMode
) {
  // unit must be day, week, month, or year
  // timeZone may be undefined
  let duration = durationParam;

  // Create a duration with smallestUnit trunc'd towards zero
  // Create a separate duration that incorporates roundingIncrement
  let r1, r2, startDuration, endDuration;
  switch (unit) {
    case 'year': {
      const years = RoundNumberToIncrement(duration.years, increment, 'trunc');
      r1 = years;
      r2 = years + increment * sign;
      startDuration = { years: r1, months: 0, weeks: 0, days: 0 };
      endDuration = { ...startDuration, years: r2 };
      break;
    }
    case 'month': {
      const months = RoundNumberToIncrement(duration.months, increment, 'trunc');
      r1 = months;
      r2 = months + increment * sign;
      startDuration = { years: duration.years, months: r1, weeks: 0, days: 0 };
      endDuration = { ...startDuration, months: r2 };
      break;
    }
    case 'week': {
      const yearsMonths = { years: duration.years, months: duration.months };
      const weeksStart = CalendarDateAdd(calendar, dateTime, yearsMonths, 'constrain');
      const weeksEnd = BalanceISODate(weeksStart.year, weeksStart.month, weeksStart.day + duration.days);
      const untilResult = CalendarDateUntil(calendar, weeksStart, weeksEnd, 'week');
      const weeks = RoundNumberToIncrement(duration.weeks + untilResult.weeks, increment, 'trunc');
      r1 = weeks;
      r2 = weeks + increment * sign;
      startDuration = { years: duration.years, months: duration.months, weeks: r1, days: 0 };
      endDuration = { ...startDuration, weeks: r2 };
      break;
    }
    case 'day': {
      const days = RoundNumberToIncrement(duration.days, increment, 'trunc');
      r1 = days;
      r2 = days + increment * sign;
      startDuration = { years: duration.years, months: duration.months, weeks: duration.weeks, days: r1 };
      endDuration = { ...startDuration, days: r2 };
      break;
    }
    default:
      throw new Error('assert not reached');
  }

  if ((sign === 1 && (r1 < 0 || r1 >= r2)) || (sign === -1 && (r1 > 0 || r1 <= r2))) {
    throw new Error('assertion failed: ordering of r1, r2 according to sign');
  }

  // Apply to origin, output PlainDateTimes
  const startDate = ISODateTimeToDateRecord(dateTime);
  const start = CalendarDateAdd(calendar, startDate, startDuration, 'constrain');
  const end = CalendarDateAdd(calendar, startDate, endDuration, 'constrain');

  // Convert to epoch-nanoseconds
  let startEpochNs, endEpochNs;
  if (timeZone) {
    const startDateTime = CombineISODateAndTimeRecord(start, dateTime);
    startEpochNs = GetEpochNanosecondsFor(timeZone, startDateTime, 'compatible');
    const endDateTime = CombineISODateAndTimeRecord(end, dateTime);
    endEpochNs = GetEpochNanosecondsFor(timeZone, endDateTime, 'compatible');
  } else {
    startEpochNs = GetUTCEpochNanoseconds(
      start.year,
      start.month,
      start.day,
      dateTime.hour,
      dateTime.minute,
      dateTime.second,
      dateTime.millisecond,
      dateTime.microsecond,
      dateTime.nanosecond
    );
    endEpochNs = GetUTCEpochNanoseconds(
      end.year,
      end.month,
      end.day,
      dateTime.hour,
      dateTime.minute,
      dateTime.second,
      dateTime.millisecond,
      dateTime.microsecond,
      dateTime.nanosecond
    );
  }

  // Round the smallestUnit within the epoch-nanosecond span
  if (
    (sign === 1 && (JSBI.greaterThan(startEpochNs, destEpochNs) || JSBI.greaterThan(destEpochNs, endEpochNs))) ||
    (sign === -1 && (JSBI.greaterThan(endEpochNs, destEpochNs) || JSBI.greaterThan(destEpochNs, startEpochNs)))
  ) {
    throw new RangeError(`custom calendar reported a ${unit} that is 0 days long`);
  }
  if (JSBI.equal(endEpochNs, startEpochNs)) {
    throw new Error('assertion failed: startEpochNs ≠ endEpochNs');
  }
  const numerator = TimeDuration.fromEpochNsDiff(destEpochNs, startEpochNs);
  const denominator = TimeDuration.fromEpochNsDiff(endEpochNs, startEpochNs);
  const unsignedRoundingMode = GetUnsignedRoundingMode(roundingMode, sign < 0 ? 'negative' : 'positive');
  const cmp = numerator.add(numerator).abs().subtract(denominator.abs()).sign();
  const even = (MathAbs(r1) / increment) % 2 === 0;
  // prettier-ignore
  const roundedUnit = numerator.isZero()
    ? MathAbs(r1)
    : !numerator.cmp(denominator) // equal?
      ? MathAbs(r2)
      : ApplyUnsignedRoundingMode(MathAbs(r1), MathAbs(r2), cmp, even, unsignedRoundingMode);

  // Trick to minimize rounding error, due to the lack of fma() in JS
  const fakeNumerator = new TimeDuration(
    JSBI.add(
      JSBI.multiply(denominator.totalNs, JSBI.BigInt(r1)),
      JSBI.multiply(numerator.totalNs, JSBI.BigInt(increment * sign))
    )
  );
  const total = fakeNumerator.fdiv(denominator.totalNs);
  if (MathAbs(total) < MathAbs(r1) || MathAbs(total) > MathAbs(r2)) {
    throw new Error('assertion failed: r1 ≤ total ≤ r2');
  }

  // Determine whether expanded or contracted
  const didExpandCalendarUnit = roundedUnit === MathAbs(r2);
  duration = { ...(didExpandCalendarUnit ? endDuration : startDuration), norm: TimeDuration.ZERO };

  return {
    duration,
    total,
    nudgedEpochNs: didExpandCalendarUnit ? endEpochNs : startEpochNs,
    didExpandCalendarUnit
  };
}

// Attempts rounding of time units within a time zone's day, but if the rounding
// causes time to exceed the total time within the day, rerun rounding in next
// day.
function NudgeToZonedTime(
  sign: -1 | 1,
  durationParam: InternalDuration,
  dateTime: ISODateTime,
  timeZone: string,
  calendar: BuiltinCalendarId,
  increment: number,
  unit: Temporal.TimeUnit,
  roundingMode: Temporal.RoundingMode
) {
  // unit must be hour or smaller
  let duration = durationParam;

  // Apply to origin, output start/end of the day as PlainDateTimes
  const date = ISODateTimeToDateRecord(dateTime);
  const dateDuration = {
    years: duration.years,
    months: duration.months,
    weeks: duration.weeks,
    days: duration.days
  };
  const start = CalendarDateAdd(calendar, date, dateDuration, 'constrain');
  const startDateTime = CombineISODateAndTimeRecord(start, dateTime);
  const endDate = BalanceISODate(start.year, start.month, start.day + sign);
  const endDateTime = CombineISODateAndTimeRecord(endDate, dateTime);

  // Compute the epoch-nanosecond start/end of the final whole-day interval
  // If duration has negative sign, startEpochNs will be after endEpochNs
  const startEpochNs = GetEpochNanosecondsFor(timeZone, startDateTime, 'compatible');
  const endEpochNs = GetEpochNanosecondsFor(timeZone, endDateTime, 'compatible');

  // The signed amount of time from the start of the whole-day interval to the end
  const daySpan = TimeDuration.fromEpochNsDiff(endEpochNs, startEpochNs);
  if (daySpan.sign() !== sign) throw new RangeError('time zone returned inconsistent Instants');

  // Compute time parts of the duration to nanoseconds and round
  // Result could be negative
  let roundedNorm = duration.norm.round(JSBI.BigInt(castExists(NS_PER_TIME_UNIT.get(unit)) * increment), roundingMode);

  // Does the rounded time exceed the time-in-day?
  const beyondDaySpan = roundedNorm.subtract(daySpan);
  const didRoundBeyondDay = beyondDaySpan.sign() !== -sign;

  let dayDelta, nudgedEpochNs;
  if (didRoundBeyondDay) {
    // If rounded into next day, use the day-end as the local origin and rerun
    // the rounding
    dayDelta = sign;
    roundedNorm = beyondDaySpan.round(JSBI.BigInt(castExists(NS_PER_TIME_UNIT.get(unit)) * increment), roundingMode);
    nudgedEpochNs = roundedNorm.addToEpochNs(endEpochNs);
  } else {
    // Otherwise, if time not rounded beyond day, use the day-start as the local
    // origin
    dayDelta = 0;
    nudgedEpochNs = roundedNorm.addToEpochNs(startEpochNs);
  }

  duration = {
    years: duration.years,
    months: duration.months,
    weeks: duration.weeks,
    days: duration.days + dayDelta,
    norm: roundedNorm
  };
  return {
    duration,
    total: NaN, // Not computed in this path, so we assert that it is not NaN later on
    nudgedEpochNs,
    didExpandCalendarUnit: didRoundBeyondDay
  };
}

// Converts all fields to nanoseconds and does integer rounding.
function NudgeToDayOrTime(
  durationParam: InternalDuration,
  destEpochNs: JSBI,
  largestUnit: Temporal.DateTimeUnit,
  increment: number,
  smallestUnit: Temporal.TimeUnit | 'day',
  roundingMode: Temporal.RoundingMode
) {
  // unit must be day or smaller
  let duration = durationParam;

  const norm = duration.norm.add24HourDays(duration.days);
  // Convert to nanoseconds and round
  const unitLength = castExists(NS_PER_TIME_UNIT.get(smallestUnit));
  const total = norm.fdiv(JSBI.BigInt(unitLength));
  const roundedNorm = norm.round(JSBI.BigInt(increment * unitLength), roundingMode);
  const diffNorm = roundedNorm.subtract(norm);

  // Determine if whole days expanded
  const { quotient: wholeDays } = norm.divmod(DAY_NANOS);
  const { quotient: roundedWholeDays } = roundedNorm.divmod(DAY_NANOS);
  const didExpandDays = MathSign(roundedWholeDays - wholeDays) === norm.sign();

  const nudgedEpochNs = diffNorm.addToEpochNs(destEpochNs);

  let days = 0;
  let remainder = roundedNorm;
  if (LargerOfTwoTemporalUnits(largestUnit, 'day') === largestUnit) {
    days = roundedWholeDays;
    remainder = roundedNorm.subtract(TimeDuration.normalize(roundedWholeDays * 24, 0, 0, 0, 0, 0));
  }

  duration = { ...duration, days, norm: remainder };
  return {
    duration,
    total,
    nudgedEpochNs,
    didExpandCalendarUnit: didExpandDays
  };
}

// Given a potentially bottom-heavy duration, bubble up smaller units to larger
// units. Any units smaller than smallestUnit are already zeroed-out.
function BubbleRelativeDuration(
  sign: -1 | 1,
  durationParam: InternalDuration,
  nudgedEpochNs: JSBI,
  plainDateTime: ISODateTime,
  timeZone: string | null,
  calendar: BuiltinCalendarId,
  largestUnit: Temporal.DateUnit,
  smallestUnit: Temporal.DateUnit
) {
  // smallestUnit is day or larger
  let duration = durationParam;

  if (smallestUnit === largestUnit) return duration;

  // Check to see if nudgedEpochNs has hit the boundary of any units higher than
  // smallestUnit, in which case increment the higher unit and clear smaller
  // units.
  const largestUnitIndex = UNITS_DESCENDING.indexOf(largestUnit);
  const smallestUnitIndex = UNITS_DESCENDING.indexOf(smallestUnit);
  for (let unitIndex = smallestUnitIndex - 1; unitIndex >= largestUnitIndex; unitIndex--) {
    // The only situation where days and smaller bubble-up into weeks is when
    // largestUnit is 'week' (not to be confused with the situation where
    // smallestUnit is 'week', in which case days and smaller are ROUNDED-up
    // into weeks, but that has already happened by the time this function
    // executes)
    // So, if days and smaller are NOT bubbled-up into weeks, and the current
    // unit is weeks, skip.
    const unit = UNITS_DESCENDING[unitIndex];
    if (unit === 'week' && largestUnit !== 'week') {
      continue;
    }

    let endDuration;
    switch (unit) {
      case 'year': {
        const years = duration.years + sign;
        endDuration = { years, months: 0, weeks: 0, days: 0 };
        break;
      }
      case 'month': {
        const months = duration.months + sign;
        endDuration = { years: duration.years, months, weeks: 0, days: 0 };
        break;
      }
      case 'week': {
        const weeks = duration.weeks + sign;
        endDuration = { years: duration.years, months: duration.months, weeks, days: 0 };
        break;
      }
      default:
        throw new Error('assert not reached');
    }

    // Compute end-of-unit in epoch-nanoseconds
    const date = ISODateTimeToDateRecord(plainDateTime);
    const end = CalendarDateAdd(calendar, date, endDuration, 'constrain');
    let endEpochNs;
    if (timeZone) {
      const endDateTime = CombineISODateAndTimeRecord(end, plainDateTime);
      endEpochNs = GetEpochNanosecondsFor(timeZone, endDateTime, 'compatible');
    } else {
      endEpochNs = GetUTCEpochNanoseconds(
        end.year,
        end.month,
        end.day,
        plainDateTime.hour,
        plainDateTime.minute,
        plainDateTime.second,
        plainDateTime.millisecond,
        plainDateTime.microsecond,
        plainDateTime.nanosecond
      );
    }

    const didExpandToEnd = compare(nudgedEpochNs, endEpochNs) !== -sign;

    // Is nudgedEpochNs at the end-of-unit? This means it should bubble-up to
    // the next highest unit (and possibly further...)
    if (didExpandToEnd) {
      duration = { ...endDuration, norm: TimeDuration.ZERO };
    } else {
      // NOT at end-of-unit. Stop looking for bubbling
      break;
    }
  }

  return duration;
}

function RoundRelativeDuration(
  durationParam: InternalDuration,
  destEpochNs: JSBI,
  dateTime: ISODateTime,
  timeZone: string | null,
  calendar: BuiltinCalendarId,
  largestUnitParam: Temporal.DateTimeUnit,
  increment: number,
  smallestUnit: Temporal.DateTimeUnit,
  roundingMode: Temporal.RoundingMode
) {
  let duration = durationParam;
  // The duration must already be balanced. This should be achieved by calling
  // one of the non-rounding since/until internal methods prior. It's okay to
  // have a bottom-heavy weeks because weeks don't bubble-up into months. It's
  // okay to have >24 hour day assuming the final day of relativeTo+duration has
  // >24 hours in its timezone. (should automatically end up like this if using
  // non-rounding since/until internal methods prior)
  const irregularLengthUnit = IsCalendarUnit(smallestUnit) || (timeZone && smallestUnit === 'day');
  const sign =
    DurationSign(duration.years, duration.months, duration.weeks, duration.days, duration.norm.sign(), 0, 0, 0, 0, 0) <
    0
      ? -1
      : 1;

  let nudgeResult;
  if (irregularLengthUnit) {
    // Rounding an irregular-length unit? Use epoch-nanosecond-bounding technique
    nudgeResult = NudgeToCalendarUnit(
      sign,
      duration,
      destEpochNs,
      dateTime,
      timeZone,
      calendar,
      increment,
      smallestUnit,
      roundingMode
    );
  } else if (timeZone) {
    // Special-case for rounding time units within a zoned day. total() never
    // takes this path because largestUnit is then also a time unit, so
    // DifferenceZonedDateTimeWithRounding uses Instant math
    uncheckedAssertNarrowedType<Temporal.TimeUnit>(
      smallestUnit,
      'other values handled in irregularLengthUnit clause above'
    );
    nudgeResult = NudgeToZonedTime(sign, duration, dateTime, timeZone, calendar, increment, smallestUnit, roundingMode);
  } else {
    // Rounding uniform-length days/hours/minutes/etc units. Simple nanosecond
    // math. years/months/weeks unchanged
    nudgeResult = NudgeToDayOrTime(duration, destEpochNs, largestUnitParam, increment, smallestUnit, roundingMode);
  }

  duration = nudgeResult.duration;
  // Did nudging cause the duration to expand to the next day or larger?
  // Bubble-up smaller calendar units into higher ones, except for weeks, which
  // don't balance up into months
  if (nudgeResult.didExpandCalendarUnit && smallestUnit !== 'week') {
    uncheckedAssertNarrowedType<Temporal.DateUnit>(
      largestUnitParam,
      'if we expanded to a calendar unit, then largestUnit is a calendar unit'
    );
    duration = BubbleRelativeDuration(
      sign,
      duration,
      nudgeResult.nudgedEpochNs, // The destEpochNs after expanding/contracting
      dateTime,
      timeZone,
      calendar,
      largestUnitParam, // where to STOP bubbling
      LargerOfTwoTemporalUnits(smallestUnit, 'day') as Temporal.DateUnit // where to START bubbling-up from
    );
  }

  let largestUnit: Temporal.TimeUnit =
    IsCalendarUnit(largestUnitParam) || largestUnitParam === 'day' ? 'hour' : largestUnitParam;
  const { hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = BalanceTimeDuration(
    duration.norm,
    largestUnit
  );
  return {
    years: duration.years,
    months: duration.months,
    weeks: duration.weeks,
    days: duration.days,
    hours,
    minutes,
    seconds,
    milliseconds,
    microseconds,
    nanoseconds,
    total: nudgeResult.total
  };
}

export function DifferencePlainDateTimeWithRounding(
  y1: number,
  mon1: number,
  d1: number,
  h1: number,
  min1: number,
  s1: number,
  ms1: number,
  µs1: number,
  ns1: number,
  y2: number,
  mon2: number,
  d2: number,
  h2: number,
  min2: number,
  s2: number,
  ms2: number,
  µs2: number,
  ns2: number,
  calendar: BuiltinCalendarId,
  largestUnit: Temporal.DateTimeUnit,
  roundingIncrement: number,
  smallestUnit: Temporal.DateTimeUnit,
  roundingMode: Temporal.RoundingMode
) {
  if (CompareISODateTime(y1, mon1, d1, h1, min1, s1, ms1, µs1, ns1, y2, mon2, d2, h2, min2, s2, ms2, µs2, ns2) == 0) {
    return {
      years: 0,
      months: 0,
      weeks: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      milliseconds: 0,
      microseconds: 0,
      nanoseconds: 0,
      total: 0
    };
  }

  let { years, months, weeks, days, norm } = DifferenceISODateTime(
    y1,
    mon1,
    d1,
    h1,
    min1,
    s1,
    ms1,
    µs1,
    ns1,
    y2,
    mon2,
    d2,
    h2,
    min2,
    s2,
    ms2,
    µs2,
    ns2,
    calendar,
    largestUnit
  );

  const roundingIsNoop = smallestUnit === 'nanosecond' && roundingIncrement === 1;
  if (roundingIsNoop) {
    const normWithDays = norm.add24HourDays(days);
    let hours, minutes, seconds, milliseconds, microseconds, nanoseconds;
    ({ days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = BalanceTimeDuration(
      normWithDays,
      largestUnit
    ));
    const total = JSBI.toNumber(norm.totalNs);
    return { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds, total };
  }

  const dateTime = {
    year: y1,
    month: mon1,
    day: d1,
    hour: h1,
    minute: min1,
    second: s1,
    millisecond: ms1,
    microsecond: µs1,
    nanosecond: ns1
  };
  const destEpochNs = GetUTCEpochNanoseconds(y2, mon2, d2, h2, min2, s2, ms2, µs2, ns2);
  return RoundRelativeDuration(
    { years, months, weeks, days, norm },
    destEpochNs,
    dateTime,
    null,
    calendar,
    largestUnit,
    roundingIncrement,
    smallestUnit,
    roundingMode
  );
}

export function DifferenceZonedDateTimeWithRounding(
  ns1: JSBI,
  ns2: JSBI,
  timeZone: string,
  calendar: BuiltinCalendarId,
  largestUnit: Temporal.DateTimeUnit,
  roundingIncrement: number,
  smallestUnit: Temporal.DateTimeUnit,
  roundingMode: Temporal.RoundingMode
) {
  if (!IsCalendarUnit(largestUnit) && largestUnit !== 'day') {
    // The user is only asking for a time difference, so return difference of instants.
    const { norm, total } = DifferenceInstant(
      ns1,
      ns2,
      roundingIncrement,
      smallestUnit as Temporal.TimeUnit,
      roundingMode
    );
    const { hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = BalanceTimeDuration(norm, largestUnit);
    return {
      years: 0,
      months: 0,
      weeks: 0,
      days: 0,
      hours,
      minutes,
      seconds,
      milliseconds,
      microseconds,
      nanoseconds,
      total
    };
  }

  let { years, months, weeks, days, norm } = DifferenceZonedDateTime(ns1, ns2, timeZone, calendar, largestUnit);

  if (smallestUnit === 'nanosecond' && roundingIncrement === 1) {
    const { hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = BalanceTimeDuration(norm, 'hour');
    const total = JSBI.toNumber(norm.totalNs);
    return { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds, total };
  }

  const dateTime = GetISODateTimeFor(timeZone, ns1);
  return RoundRelativeDuration(
    { years, months, weeks, days, norm },
    ns2,
    dateTime,
    timeZone,
    calendar,
    largestUnit,
    roundingIncrement,
    smallestUnit,
    roundingMode
  );
}

type DifferenceOperation = 'since' | 'until';

function GetDifferenceSettings<T extends Temporal.DateTimeUnit>(
  op: DifferenceOperation,
  options: Temporal.DifferenceOptions<T>,
  group: 'datetime' | 'date' | 'time',
  disallowed: (Temporal.DateTimeUnit | 'auto')[],
  fallbackSmallest: T,
  smallestLargestDefaultUnit: T
) {
  const ALLOWED_UNITS = TEMPORAL_UNITS.reduce((allowed, unitInfo) => {
    const p = unitInfo[0];
    const s = unitInfo[1];
    const c = unitInfo[2];
    if ((group === 'datetime' || c === group) && !disallowed.includes(s)) {
      allowed.push(s, p);
    }
    return allowed;
  }, [] as (Temporal.DateTimeUnit | Temporal.PluralUnit<Temporal.DateTimeUnit>)[]);

  let largestUnit = GetTemporalUnitValuedOption(options, 'largestUnit', group, 'auto');
  if (disallowed.includes(largestUnit)) {
    throw new RangeError(`largestUnit must be one of ${ALLOWED_UNITS.join(', ')}, not ${largestUnit}`);
  }

  const roundingIncrement = GetTemporalRoundingIncrementOption(options);

  let roundingMode = GetRoundingModeOption(options, 'trunc');
  if (op === 'since') roundingMode = NegateRoundingMode(roundingMode);

  const smallestUnit = GetTemporalUnitValuedOption(options, 'smallestUnit', group, fallbackSmallest);
  if (disallowed.includes(smallestUnit)) {
    throw new RangeError(`smallestUnit must be one of ${ALLOWED_UNITS.join(', ')}, not ${smallestUnit}`);
  }

  const defaultLargestUnit = LargerOfTwoTemporalUnits(smallestLargestDefaultUnit, smallestUnit);
  if (largestUnit === 'auto') largestUnit = defaultLargestUnit;
  if (LargerOfTwoTemporalUnits(largestUnit, smallestUnit) !== largestUnit) {
    throw new RangeError(`largestUnit ${largestUnit} cannot be smaller than smallestUnit ${smallestUnit}`);
  }
  const MAX_DIFFERENCE_INCREMENTS: { [k in Temporal.DateTimeUnit]?: number } = {
    hour: 24,
    minute: 60,
    second: 60,
    millisecond: 1000,
    microsecond: 1000,
    nanosecond: 1000
  };
  const maximum = MAX_DIFFERENCE_INCREMENTS[smallestUnit];
  if (maximum !== undefined) ValidateTemporalRoundingIncrement(roundingIncrement, maximum, false);

  return { largestUnit: largestUnit as T, roundingIncrement, roundingMode, smallestUnit: smallestUnit as T };
}

export function DifferenceTemporalInstant(
  operation: DifferenceOperation,
  instant: Temporal.Instant,
  otherParam: InstantParams['until'][0],
  options: InstantParams['until'][1] | undefined
): Temporal.Duration {
  const sign = operation === 'since' ? -1 : 1;
  const other = ToTemporalInstant(otherParam);

  const resolvedOptions = GetOptionsObject(options);
  const settings = GetDifferenceSettings(operation, resolvedOptions, 'time', [], 'nanosecond', 'second');

  const onens = GetSlot(instant, EPOCHNANOSECONDS);
  const twons = GetSlot(other, EPOCHNANOSECONDS);
  const { norm } = DifferenceInstant(
    onens,
    twons,
    settings.roundingIncrement,
    settings.smallestUnit,
    settings.roundingMode
  );
  const { hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = BalanceTimeDuration(
    norm,
    settings.largestUnit
  );
  const Duration = GetIntrinsic('%Temporal.Duration%');
  return new Duration(
    0,
    0,
    0,
    0,
    sign * hours,
    sign * minutes,
    sign * seconds,
    sign * milliseconds,
    sign * microseconds,
    sign * nanoseconds
  );
}

export function DifferenceTemporalPlainDate(
  operation: DifferenceOperation,
  plainDate: Temporal.PlainDate,
  otherParam: PlainDateParams['until'][0],
  options: PlainDateParams['until'][1]
): Temporal.Duration {
  const sign = operation === 'since' ? -1 : 1;
  const other = ToTemporalDate(otherParam);
  const calendar = GetSlot(plainDate, CALENDAR);
  const otherCalendar = GetSlot(other, CALENDAR);
  if (!CalendarEquals(calendar, otherCalendar)) {
    throw new RangeError(`cannot compute difference between dates of ${calendar} and ${otherCalendar} calendars`);
  }

  const resolvedOptions = GetOptionsObject(options);
  const settings = GetDifferenceSettings(operation, resolvedOptions, 'date', [], 'day', 'day');

  const Duration = GetIntrinsic('%Temporal.Duration%');
  if (
    GetSlot(plainDate, ISO_YEAR) === GetSlot(other, ISO_YEAR) &&
    GetSlot(plainDate, ISO_MONTH) === GetSlot(other, ISO_MONTH) &&
    GetSlot(plainDate, ISO_DAY) === GetSlot(other, ISO_DAY)
  ) {
    return new Duration();
  }

  const isoDate = TemporalObjectToISODateRecord(plainDate);
  const isoOther = TemporalObjectToISODateRecord(other);
  let { years, months, weeks, days } = CalendarDateUntil(calendar, isoDate, isoOther, settings.largestUnit);

  const roundingIsNoop = settings.smallestUnit === 'day' && settings.roundingIncrement === 1;
  if (!roundingIsNoop) {
    const dateTime = {
      ...isoDate,
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
      microsecond: 0,
      nanosecond: 0
    };
    const destEpochNs = GetUTCEpochNanoseconds(isoOther.year, isoOther.month, isoOther.day, 0, 0, 0, 0, 0, 0);
    ({ years, months, weeks, days } = RoundRelativeDuration(
      { years, months, weeks, days, norm: TimeDuration.ZERO },
      destEpochNs,
      dateTime,
      null,
      calendar,
      settings.largestUnit,
      settings.roundingIncrement,
      settings.smallestUnit,
      settings.roundingMode
    ));
  }

  return new Duration(sign * years, sign * months, sign * weeks, sign * days, 0, 0, 0, 0, 0, 0);
}

export function DifferenceTemporalPlainDateTime(
  operation: DifferenceOperation,
  plainDateTime: Temporal.PlainDateTime,
  otherParam: PlainDateTimeParams['until'][0],
  options: PlainDateTimeParams['until'][1]
): Temporal.Duration {
  const sign = operation === 'since' ? -1 : 1;
  const other = ToTemporalDateTime(otherParam);
  const calendar = GetSlot(plainDateTime, CALENDAR);
  const otherCalendar = GetSlot(other, CALENDAR);
  if (!CalendarEquals(calendar, otherCalendar)) {
    throw new RangeError(`cannot compute difference between dates of ${calendar} and ${otherCalendar} calendars`);
  }

  const resolvedOptions = GetOptionsObject(options);
  const settings = GetDifferenceSettings(operation, resolvedOptions, 'datetime', [], 'nanosecond', 'day');

  const Duration = GetIntrinsic('%Temporal.Duration%');
  if (
    GetSlot(plainDateTime, ISO_YEAR) === GetSlot(other, ISO_YEAR) &&
    GetSlot(plainDateTime, ISO_MONTH) === GetSlot(other, ISO_MONTH) &&
    GetSlot(plainDateTime, ISO_DAY) === GetSlot(other, ISO_DAY) &&
    GetSlot(plainDateTime, ISO_HOUR) == GetSlot(other, ISO_HOUR) &&
    GetSlot(plainDateTime, ISO_MINUTE) == GetSlot(other, ISO_MINUTE) &&
    GetSlot(plainDateTime, ISO_SECOND) == GetSlot(other, ISO_SECOND) &&
    GetSlot(plainDateTime, ISO_MILLISECOND) == GetSlot(other, ISO_MILLISECOND) &&
    GetSlot(plainDateTime, ISO_MICROSECOND) == GetSlot(other, ISO_MICROSECOND) &&
    GetSlot(plainDateTime, ISO_NANOSECOND) == GetSlot(other, ISO_NANOSECOND)
  ) {
    return new Duration();
  }

  const { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } =
    DifferencePlainDateTimeWithRounding(
      GetSlot(plainDateTime, ISO_YEAR),
      GetSlot(plainDateTime, ISO_MONTH),
      GetSlot(plainDateTime, ISO_DAY),
      GetSlot(plainDateTime, ISO_HOUR),
      GetSlot(plainDateTime, ISO_MINUTE),
      GetSlot(plainDateTime, ISO_SECOND),
      GetSlot(plainDateTime, ISO_MILLISECOND),
      GetSlot(plainDateTime, ISO_MICROSECOND),
      GetSlot(plainDateTime, ISO_NANOSECOND),
      GetSlot(other, ISO_YEAR),
      GetSlot(other, ISO_MONTH),
      GetSlot(other, ISO_DAY),
      GetSlot(other, ISO_HOUR),
      GetSlot(other, ISO_MINUTE),
      GetSlot(other, ISO_SECOND),
      GetSlot(other, ISO_MILLISECOND),
      GetSlot(other, ISO_MICROSECOND),
      GetSlot(other, ISO_NANOSECOND),
      calendar,
      settings.largestUnit,
      settings.roundingIncrement,
      settings.smallestUnit,
      settings.roundingMode
    );

  return new Duration(
    sign * years,
    sign * months,
    sign * weeks,
    sign * days,
    sign * hours,
    sign * minutes,
    sign * seconds,
    sign * milliseconds,
    sign * microseconds,
    sign * nanoseconds
  );
}

export function DifferenceTemporalPlainTime(
  operation: DifferenceOperation,
  plainTime: Temporal.PlainTime,
  otherParam: PlainTimeParams['until'][0],
  options: PlainTimeParams['until'][1]
): Temporal.Duration {
  const sign = operation === 'since' ? -1 : 1;
  const other = ToTemporalTime(otherParam);

  const resolvedOptions = GetOptionsObject(options);
  const settings = GetDifferenceSettings(operation, resolvedOptions, 'time', [], 'nanosecond', 'hour');

  let norm = DifferenceTime(
    GetSlot(plainTime, ISO_HOUR),
    GetSlot(plainTime, ISO_MINUTE),
    GetSlot(plainTime, ISO_SECOND),
    GetSlot(plainTime, ISO_MILLISECOND),
    GetSlot(plainTime, ISO_MICROSECOND),
    GetSlot(plainTime, ISO_NANOSECOND),
    GetSlot(other, ISO_HOUR),
    GetSlot(other, ISO_MINUTE),
    GetSlot(other, ISO_SECOND),
    GetSlot(other, ISO_MILLISECOND),
    GetSlot(other, ISO_MICROSECOND),
    GetSlot(other, ISO_NANOSECOND)
  );
  if (settings.smallestUnit !== 'nanosecond' || settings.roundingIncrement !== 1) {
    ({ norm } = RoundTimeDuration(0, norm, settings.roundingIncrement, settings.smallestUnit, settings.roundingMode));
  }
  const { hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = BalanceTimeDuration(
    norm,
    settings.largestUnit
  );
  const Duration = GetIntrinsic('%Temporal.Duration%');
  return new Duration(
    0,
    0,
    0,
    0,
    sign * hours,
    sign * minutes,
    sign * seconds,
    sign * milliseconds,
    sign * microseconds,
    sign * nanoseconds
  );
}

export function DifferenceTemporalPlainYearMonth(
  operation: DifferenceOperation,
  yearMonth: Temporal.PlainYearMonth,
  otherParam: PlainYearMonthParams['until'][0],
  options: PlainYearMonthParams['until'][1]
): Temporal.Duration {
  const sign = operation === 'since' ? -1 : 1;
  const other = ToTemporalYearMonth(otherParam);
  const calendar = GetSlot(yearMonth, CALENDAR);
  const otherCalendar = GetSlot(other, CALENDAR);
  if (!CalendarEquals(calendar, otherCalendar)) {
    throw new RangeError(`cannot compute difference between months of ${calendar} and ${otherCalendar} calendars`);
  }

  const resolvedOptions = GetOptionsObject(options);
  const settings = GetDifferenceSettings(operation, resolvedOptions, 'date', ['week', 'day'], 'month', 'year');

  const Duration = GetIntrinsic('%Temporal.Duration%');
  if (
    GetSlot(yearMonth, ISO_YEAR) === GetSlot(other, ISO_YEAR) &&
    GetSlot(yearMonth, ISO_MONTH) === GetSlot(other, ISO_MONTH) &&
    GetSlot(yearMonth, ISO_DAY) === GetSlot(other, ISO_DAY)
  ) {
    return new Duration();
  }

  const thisFields: CalendarFieldsRecord = TemporalObjectToFields(yearMonth);
  thisFields.day = 1;
  const thisDate = CalendarDateFromFields(calendar, thisFields, 'constrain');
  const otherFields: CalendarFieldsRecord = TemporalObjectToFields(other);
  otherFields.day = 1;
  const otherDate = CalendarDateFromFields(calendar, otherFields, 'constrain');

  let { years, months } = CalendarDateUntil(calendar, thisDate, otherDate, settings.largestUnit);

  if (settings.smallestUnit !== 'month' || settings.roundingIncrement !== 1) {
    const dateTime = {
      year: thisDate.year,
      month: thisDate.month,
      day: thisDate.day,
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
      microsecond: 0,
      nanosecond: 0
    };
    const destEpochNs = GetUTCEpochNanoseconds(otherDate.year, otherDate.month, otherDate.day, 0, 0, 0, 0, 0, 0);
    ({ years, months } = RoundRelativeDuration(
      { years, months, weeks: 0, days: 0, norm: TimeDuration.ZERO },
      destEpochNs,
      dateTime,
      null,
      calendar,
      settings.largestUnit,
      settings.roundingIncrement,
      settings.smallestUnit,
      settings.roundingMode
    ));
  }

  return new Duration(sign * years, sign * months, 0, 0, 0, 0, 0, 0, 0, 0);
}

export function DifferenceTemporalZonedDateTime(
  operation: DifferenceOperation,
  zonedDateTime: Temporal.ZonedDateTime,
  otherParam: ZonedDateTimeParams['until'][0],
  options: ZonedDateTimeParams['until'][1]
): Temporal.Duration {
  const sign = operation === 'since' ? -1 : 1;
  const other = ToTemporalZonedDateTime(otherParam);
  const calendar = GetSlot(zonedDateTime, CALENDAR);
  const otherCalendar = GetSlot(other, CALENDAR);
  if (!CalendarEquals(calendar, otherCalendar)) {
    throw new RangeError(`cannot compute difference between dates of ${calendar} and ${otherCalendar} calendars`);
  }

  const resolvedOptions = GetOptionsObject(options);
  const settings = GetDifferenceSettings(operation, resolvedOptions, 'datetime', [], 'nanosecond', 'hour');

  const ns1 = GetSlot(zonedDateTime, EPOCHNANOSECONDS);
  const ns2 = GetSlot(other, EPOCHNANOSECONDS);

  const Duration = GetIntrinsic('%Temporal.Duration%');

  let years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds;
  if (
    settings.largestUnit !== 'year' &&
    settings.largestUnit !== 'month' &&
    settings.largestUnit !== 'week' &&
    settings.largestUnit !== 'day'
  ) {
    // The user is only asking for a time difference, so return difference of instants.
    years = 0;
    months = 0;
    weeks = 0;
    days = 0;
    const { norm } = DifferenceInstant(
      ns1,
      ns2,
      settings.roundingIncrement,
      settings.smallestUnit as Temporal.TimeUnit,
      settings.roundingMode
    );
    ({ hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = BalanceTimeDuration(
      norm,
      settings.largestUnit as Temporal.TimeUnit
    ));
  } else {
    const timeZone = GetSlot(zonedDateTime, TIME_ZONE);
    if (!TimeZoneEquals(timeZone, GetSlot(other, TIME_ZONE))) {
      throw new RangeError(
        "When calculating difference between time zones, largestUnit must be 'hours' " +
          'or smaller because day lengths can vary between time zones due to DST or time zone offset changes.'
      );
    }

    if (JSBI.equal(ns1, ns2)) return new Duration();

    ({ years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } =
      DifferenceZonedDateTimeWithRounding(
        ns1,
        ns2,
        timeZone,
        calendar,
        settings.largestUnit,
        settings.roundingIncrement,
        settings.smallestUnit,
        settings.roundingMode
      ));
  }

  return new Duration(
    sign * years,
    sign * months,
    sign * weeks,
    sign * days,
    sign * hours,
    sign * minutes,
    sign * seconds,
    sign * milliseconds,
    sign * microseconds,
    sign * nanoseconds
  );
}

export function AddISODate(
  yearParam: number,
  monthParam: number,
  dayParam: number,
  yearsParam: number,
  monthsParam: number,
  weeksParam: number,
  daysParam: number,
  overflow: Overflow
) {
  let year = yearParam;
  let month = monthParam;
  let day = dayParam;
  let years = yearsParam;
  let months = monthsParam;
  let weeks = weeksParam;
  let days = daysParam;

  year += years;
  month += months;
  ({ year, month } = BalanceISOYearMonth(year, month));
  ({ year, month, day } = RegulateISODate(year, month, day, overflow));
  days += 7 * weeks;
  day += days;
  ({ year, month, day } = BalanceISODate(year, month, day));
  RejectDateRange(year, month, day);
  return { year, month, day };
}

export function AddTime(
  hour: number,
  minute: number,
  secondParam: number,
  millisecond: number,
  microsecond: number,
  nanosecondParam: number,
  norm: TimeDuration
) {
  let second = secondParam;
  let nanosecond = nanosecondParam;

  second += norm.sec;
  nanosecond += norm.subsec;
  return BalanceTime(hour, minute, second, millisecond, microsecond, nanosecond);
}

function AddInstant(epochNanoseconds: JSBI, norm: TimeDuration) {
  const result = norm.addToEpochNs(epochNanoseconds);
  ValidateEpochNanoseconds(result);
  return result;
}

function AddDateTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
  microsecond: number,
  nanosecond: number,
  calendar: BuiltinCalendarId,
  years: number,
  months: number,
  weeks: number,
  daysParam: number,
  norm: TimeDuration,
  overflow: Overflow
) {
  let days = daysParam;
  // Add the time part
  const timeResult = AddTime(hour, minute, second, millisecond, microsecond, nanosecond, norm);
  days += timeResult.deltaDays;

  // Delegate the date part addition to the calendar
  RejectDuration(years, months, weeks, days, 0, 0, 0, 0, 0, 0);
  const addedDate = CalendarDateAdd(calendar, { year, month, day }, { years, months, weeks, days }, overflow);

  return CombineISODateAndTimeRecord(addedDate, timeResult);
}

export function AddZonedDateTime(
  epochNs: JSBI,
  timeZone: string,
  calendar: BuiltinCalendarId,
  { years, months, weeks, days, norm }: InternalDuration,
  overflow: Overflow = 'constrain'
) {
  // If only time is to be added, then use Instant math. It's not OK to fall
  // through to the date/time code below because compatible disambiguation in
  // the PlainDateTime=>Instant conversion will change the offset of any
  // ZonedDateTime in the repeated clock time after a backwards transition.
  // When adding/subtracting time units and not dates, this disambiguation is
  // not expected and so is avoided below via a fast path for time-only
  // arithmetic.
  // BTW, this behavior is similar in spirit to offset: 'prefer' in `with`.
  if (DurationSign(years, months, weeks, days, 0, 0, 0, 0, 0, 0) === 0) {
    return AddInstant(epochNs, norm);
  }

  // RFC 5545 requires the date portion to be added in calendar days and the
  // time portion to be added in exact time.
  const dt = GetISODateTimeFor(timeZone, epochNs);
  const addedDate = CalendarDateAdd(calendar, dt, { years, months, weeks, days }, overflow);
  const dtIntermediate = CombineISODateAndTimeRecord(addedDate, dt);

  // Note that 'compatible' is used below because this disambiguation behavior
  // is required by RFC 5545.
  const intermediateNs = GetEpochNanosecondsFor(timeZone, dtIntermediate, 'compatible');
  return AddInstant(intermediateNs, norm);
}

type AddSubtractOperation = 'add' | 'subtract';

export function AddDurations(
  operation: AddSubtractOperation,
  duration: Temporal.Duration,
  otherParam: DurationParams['add'][0]
) {
  let other = ToTemporalDuration(otherParam);
  if (operation === 'subtract') other = CreateNegatedTemporalDuration(other);

  const largestUnit1 = DefaultTemporalLargestUnit(duration);
  const largestUnit2 = DefaultTemporalLargestUnit(other);
  const largestUnit = LargerOfTwoTemporalUnits(largestUnit1, largestUnit2);

  const norm1 = TimeDuration.normalize(
    GetSlot(duration, HOURS),
    GetSlot(duration, MINUTES),
    GetSlot(duration, SECONDS),
    GetSlot(duration, MILLISECONDS),
    GetSlot(duration, MICROSECONDS),
    GetSlot(duration, NANOSECONDS)
  );
  const norm2 = TimeDuration.normalize(
    GetSlot(other, HOURS),
    GetSlot(other, MINUTES),
    GetSlot(other, SECONDS),
    GetSlot(other, MILLISECONDS),
    GetSlot(other, MICROSECONDS),
    GetSlot(other, NANOSECONDS)
  );

  if (IsCalendarUnit(largestUnit)) {
    throw new RangeError('For years, months, or weeks arithmetic, use date arithmetic relative to a starting point');
  }
  const { days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = BalanceTimeDuration(
    norm1.add(norm2).add24HourDays(GetSlot(duration, DAYS) + GetSlot(other, DAYS)),
    largestUnit
  );
  const Duration = GetIntrinsic('%Temporal.Duration%');
  return new Duration(0, 0, 0, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
}

export function AddDurationToOrSubtractDurationFromInstant(
  operation: AddSubtractOperation,
  instant: Temporal.Instant,
  durationLike: InstantParams['add'][0]
) {
  let duration = ToTemporalDuration(durationLike);
  if (operation === 'subtract') duration = CreateNegatedTemporalDuration(duration);
  const largestUnit = DefaultTemporalLargestUnit(duration);
  if (IsCalendarUnit(largestUnit) || largestUnit === 'day') {
    throw new RangeError(
      `Duration field ${largestUnit} not supported by Temporal.Instant. Try Temporal.ZonedDateTime instead.`
    );
  }
  const norm = TimeDuration.normalize(
    GetSlot(duration, HOURS),
    GetSlot(duration, MINUTES),
    GetSlot(duration, SECONDS),
    GetSlot(duration, MILLISECONDS),
    GetSlot(duration, MICROSECONDS),
    GetSlot(duration, NANOSECONDS)
  );
  const ns = AddInstant(GetSlot(instant, EPOCHNANOSECONDS), norm);
  const Instant = GetIntrinsic('%Temporal.Instant%');
  return new Instant(ns);
}

export function AddDurationToDate(
  operation: AddSubtractOperation,
  plainDate: Temporal.PlainDate,
  durationLike: PlainDateParams['add'][0],
  optionsParam: PlainDateParams['add'][1]
) {
  const sign = operation === 'subtract' ? -1 : 1;
  const isoDate = TemporalObjectToISODateRecord(plainDate);
  const calendar = GetSlot(plainDate, CALENDAR);

  let duration = ToTemporalDurationRecord(durationLike);
  const norm = TimeDuration.normalize(
    sign * duration.hours,
    sign * duration.minutes,
    sign * duration.seconds,
    sign * duration.milliseconds,
    sign * duration.microseconds,
    sign * duration.nanoseconds
  );
  const days = sign * duration.days + BalanceTimeDuration(norm, 'day').days;
  const dateDuration = {
    years: sign * duration.years,
    months: sign * duration.months,
    weeks: sign * duration.weeks,
    days
  };

  const options = GetOptionsObject(optionsParam);
  const overflow = GetTemporalOverflowOption(options);

  const addedDate = CalendarDateAdd(calendar, isoDate, dateDuration, overflow);
  return CreateTemporalDate(addedDate.year, addedDate.month, addedDate.day, calendar);
}

export function AddDurationToOrSubtractDurationFromPlainDateTime(
  operation: AddSubtractOperation,
  dateTime: Temporal.PlainDateTime,
  durationLike: PlainDateTimeParams['add'][0],
  optionsParam: PlainDateTimeParams['add'][1]
): Temporal.PlainDateTime {
  const sign = operation === 'subtract' ? -1 : 1;
  const { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } =
    ToTemporalDurationRecord(durationLike);
  const options = GetOptionsObject(optionsParam);
  const overflow = GetTemporalOverflowOption(options);

  const calendar = GetSlot(dateTime, CALENDAR);

  const norm = TimeDuration.normalize(
    sign * hours,
    sign * minutes,
    sign * seconds,
    sign * milliseconds,
    sign * microseconds,
    sign * nanoseconds
  );
  const { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } = AddDateTime(
    GetSlot(dateTime, ISO_YEAR),
    GetSlot(dateTime, ISO_MONTH),
    GetSlot(dateTime, ISO_DAY),
    GetSlot(dateTime, ISO_HOUR),
    GetSlot(dateTime, ISO_MINUTE),
    GetSlot(dateTime, ISO_SECOND),
    GetSlot(dateTime, ISO_MILLISECOND),
    GetSlot(dateTime, ISO_MICROSECOND),
    GetSlot(dateTime, ISO_NANOSECOND),
    calendar,
    sign * years,
    sign * months,
    sign * weeks,
    sign * days,
    norm,
    overflow
  );
  return CreateTemporalDateTime(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond, calendar);
}

export function AddDurationToOrSubtractDurationFromPlainTime(
  operation: AddSubtractOperation,
  temporalTime: Temporal.PlainTime,
  durationLike: PlainTimeParams['add'][0]
): Temporal.PlainTime {
  const sign = operation === 'subtract' ? -1 : 1;
  const { hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ToTemporalDurationRecord(durationLike);
  const norm = TimeDuration.normalize(
    sign * hours,
    sign * minutes,
    sign * seconds,
    sign * milliseconds,
    sign * microseconds,
    sign * nanoseconds
  );
  let { hour, minute, second, millisecond, microsecond, nanosecond } = AddTime(
    GetSlot(temporalTime, ISO_HOUR),
    GetSlot(temporalTime, ISO_MINUTE),
    GetSlot(temporalTime, ISO_SECOND),
    GetSlot(temporalTime, ISO_MILLISECOND),
    GetSlot(temporalTime, ISO_MICROSECOND),
    GetSlot(temporalTime, ISO_NANOSECOND),
    norm
  );
  ({ hour, minute, second, millisecond, microsecond, nanosecond } = RegulateTime(
    hour,
    minute,
    second,
    millisecond,
    microsecond,
    nanosecond,
    'reject'
  ));
  const PlainTime = GetIntrinsic('%Temporal.PlainTime%');
  return new PlainTime(hour, minute, second, millisecond, microsecond, nanosecond);
}

export function AddDurationToOrSubtractDurationFromPlainYearMonth(
  operation: AddSubtractOperation,
  yearMonth: Temporal.PlainYearMonth,
  durationLike: PlainYearMonthParams['add'][0],
  optionsParam: PlainYearMonthParams['add'][1]
): Temporal.PlainYearMonth {
  let duration = ToTemporalDurationRecord(durationLike);
  if (operation === 'subtract') {
    duration = {
      years: -duration.years,
      months: -duration.months,
      weeks: -duration.weeks,
      days: -duration.days,
      hours: -duration.hours,
      minutes: -duration.minutes,
      seconds: -duration.seconds,
      milliseconds: -duration.milliseconds,
      microseconds: -duration.microseconds,
      nanoseconds: -duration.nanoseconds
    };
  }
  let { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = duration;
  const options = GetOptionsObject(optionsParam);
  const overflow = GetTemporalOverflowOption(options);
  const norm = TimeDuration.normalize(hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
  days += BalanceTimeDuration(norm, 'day').days;
  const sign = DurationSign(years, months, weeks, days, 0, 0, 0, 0, 0, 0);

  const calendar = GetSlot(yearMonth, CALENDAR);
  const fields: CalendarFieldsRecord = TemporalObjectToFields(yearMonth);
  fields.day = 1;
  let startDate = CalendarDateFromFields(calendar, fields, 'constrain');
  if (sign < 0) {
    const nextMonth = CalendarDateAdd(calendar, startDate, { months: 1 }, 'constrain');
    startDate = BalanceISODate(nextMonth.year, nextMonth.month, nextMonth.day - 1);
  }
  RejectDateRange(startDate.year, startDate.month, startDate.day);
  const addedDate = CalendarDateAdd(calendar, startDate, { years, months, weeks, days }, overflow);
  const addedDateFields = ISODateToFields(calendar, addedDate, 'year-month');

  const { year, month, day } = CalendarYearMonthFromFields(calendar, addedDateFields, overflow);
  return CreateTemporalYearMonth(year, month, calendar, day);
}

export function AddDurationToOrSubtractDurationFromZonedDateTime(
  operation: AddSubtractOperation,
  zonedDateTime: Temporal.ZonedDateTime,
  durationLike: ZonedDateTimeParams['add'][0],
  optionsParam: ZonedDateTimeParams['add'][1]
) {
  let duration = ToTemporalDuration(durationLike);
  if (operation === 'subtract') duration = CreateNegatedTemporalDuration(duration);

  const options = GetOptionsObject(optionsParam);
  const overflow = GetTemporalOverflowOption(options);
  const timeZone = GetSlot(zonedDateTime, TIME_ZONE);
  const calendar = GetSlot(zonedDateTime, CALENDAR);
  const norm = TimeDuration.normalize(
    GetSlot(duration, HOURS),
    GetSlot(duration, MINUTES),
    GetSlot(duration, SECONDS),
    GetSlot(duration, MILLISECONDS),
    GetSlot(duration, MICROSECONDS),
    GetSlot(duration, NANOSECONDS)
  );
  const normalized = {
    years: GetSlot(duration, YEARS),
    months: GetSlot(duration, MONTHS),
    weeks: GetSlot(duration, WEEKS),
    days: GetSlot(duration, DAYS),
    norm
  };
  const epochNanoseconds = AddZonedDateTime(
    GetSlot(zonedDateTime, EPOCHNANOSECONDS),
    timeZone,
    calendar,
    normalized,
    overflow
  );
  return CreateTemporalZonedDateTime(epochNanoseconds, timeZone, calendar);
}

// ts-prune-ignore-next TODO: remove this after tests are converted to TS
export function RoundNumberToIncrement(quantity: number, increment: number, mode: Temporal.RoundingMode) {
  const quotient = MathTrunc(quantity / increment);
  const remainder = quantity % increment;
  const sign = quantity < 0 ? 'negative' : 'positive';
  const r1 = MathAbs(quotient);
  const r2 = r1 + 1;
  const cmp = ComparisonResult(MathAbs(remainder * 2) - increment);
  const even = r1 % 2 === 0;
  const unsignedRoundingMode = GetUnsignedRoundingMode(mode, sign);
  const rounded = remainder === 0 ? r1 : ApplyUnsignedRoundingMode(r1, r2, cmp, even, unsignedRoundingMode);
  return increment * (sign === 'positive' ? rounded : -rounded);
}

// ts-prune-ignore-next TODO: remove this after tests are converted to TS
export function RoundNumberToIncrementAsIfPositive(
  quantityParam: JSBI | bigint,
  incrementParam: JSBI | bigint,
  mode: Temporal.RoundingMode
) {
  const quantity = ensureJSBI(quantityParam);
  const increment = ensureJSBI(incrementParam);
  const quotient = JSBI.divide(quantity, increment);
  const remainder = JSBI.remainder(quantity, increment);
  const unsignedRoundingMode = GetUnsignedRoundingMode(mode, 'positive');
  let r1: JSBI, r2: JSBI;
  if (JSBI.lessThan(quantity, ZERO)) {
    r1 = JSBI.subtract(quotient, ONE);
    r2 = quotient;
  } else {
    r1 = quotient;
    r2 = JSBI.add(quotient, ONE);
  }
  // Similar to the comparison in RoundNumberToIncrement, but multiplied by an
  // extra sign to make sure we treat it as positive
  const cmp = compare(abs(JSBI.multiply(remainder, TWO)), increment) * (JSBI.lessThan(quantity, ZERO) ? -1 : 1);
  const rounded = JSBI.equal(remainder, ZERO)
    ? quotient
    : ApplyUnsignedRoundingMode(r1, r2, cmp, isEven(r1), unsignedRoundingMode);
  return JSBI.multiply(rounded, increment);
}

export function RoundTemporalInstant(
  epochNs: JSBI,
  increment: number,
  unit: TimeUnitOrDay,
  roundingMode: Temporal.RoundingMode
) {
  const incrementNs = NS_PER_TIME_UNIT.get(unit) * increment;
  return RoundNumberToIncrementAsIfPositive(epochNs, JSBI.BigInt(incrementNs), roundingMode);
}

export function RoundISODateTime(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
  microsecond: number,
  nanosecond: number,
  increment: number,
  unit: UnitSmallerThanOrEqualTo<'day'>,
  roundingMode: Temporal.RoundingMode
) {
  const time = RoundTime(hour, minute, second, millisecond, microsecond, nanosecond, increment, unit, roundingMode);
  const isoDate = BalanceISODate(year, month, day + time.deltaDays);
  return CombineISODateAndTimeRecord(isoDate, time);
}

export function RoundTime(
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
  microsecond: number,
  nanosecond: number,
  increment: number,
  unit: TimeUnitOrDay,
  roundingMode: Temporal.RoundingMode
) {
  let quantity;
  switch (unit) {
    case 'day':
    case 'hour':
      quantity = ((((hour * 60 + minute) * 60 + second) * 1000 + millisecond) * 1000 + microsecond) * 1000 + nanosecond;
      break;
    case 'minute':
      quantity = (((minute * 60 + second) * 1000 + millisecond) * 1000 + microsecond) * 1000 + nanosecond;
      break;
    case 'second':
      quantity = ((second * 1000 + millisecond) * 1000 + microsecond) * 1000 + nanosecond;
      break;
    case 'millisecond':
      quantity = (millisecond * 1000 + microsecond) * 1000 + nanosecond;
      break;
    case 'microsecond':
      quantity = microsecond * 1000 + nanosecond;
      break;
    case 'nanosecond':
      quantity = nanosecond;
  }
  const nsPerUnit = NS_PER_TIME_UNIT.get(unit);
  const result = RoundNumberToIncrement(quantity, nsPerUnit * increment, roundingMode) / nsPerUnit;
  switch (unit) {
    case 'day':
      return { deltaDays: result, hour: 0, minute: 0, second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 };
    case 'hour':
      return BalanceTime(result, 0, 0, 0, 0, 0);
    case 'minute':
      return BalanceTime(hour, result, 0, 0, 0, 0);
    case 'second':
      return BalanceTime(hour, minute, result, 0, 0, 0);
    case 'millisecond':
      return BalanceTime(hour, minute, second, result, 0, 0);
    case 'microsecond':
      return BalanceTime(hour, minute, second, millisecond, result, 0);
    case 'nanosecond':
      return BalanceTime(hour, minute, second, millisecond, microsecond, result);
    default:
      throw new Error(`Invalid unit ${unit}`);
  }
}

export function RoundTimeDuration(
  daysParam: number,
  normParam: TimeDuration,
  increment: number,
  unit: Temporal.TimeUnit | 'day',
  roundingMode: Temporal.RoundingMode
) {
  // unit must not be a calendar unit
  let days = daysParam;
  let norm = normParam;

  let total;
  if (unit === 'day') {
    // First convert time units up to days
    const { quotient, remainder } = norm.divmod(DAY_NANOS);
    days += quotient;
    total = days + remainder.fdiv(DAY_NANOS_JSBI);
    days = RoundNumberToIncrement(total, increment, roundingMode);
    norm = TimeDuration.ZERO;
  } else {
    const divisor = JSBI.BigInt(NS_PER_TIME_UNIT.get(unit));
    total = norm.fdiv(divisor);
    norm = norm.round(JSBI.multiply(divisor, JSBI.BigInt(increment)), roundingMode);
  }
  CombineDateAndNormalizedTimeDuration(0, 0, 0, days, norm);
  return { days, norm, total };
}

export function CompareISODate(y1: number, m1: number, d1: number, y2: number, m2: number, d2: number) {
  if (y1 !== y2) return ComparisonResult(y1 - y2);
  if (m1 !== m2) return ComparisonResult(m1 - m2);
  if (d1 !== d2) return ComparisonResult(d1 - d2);
  return 0;
}

export function CompareTemporalTime(
  h1: number,
  min1: number,
  s1: number,
  ms1: number,
  µs1: number,
  ns1: number,
  h2: number,
  min2: number,
  s2: number,
  ms2: number,
  µs2: number,
  ns2: number
) {
  if (h1 !== h2) return ComparisonResult(h1 - h2);
  if (min1 !== min2) return ComparisonResult(min1 - min2);
  if (s1 !== s2) return ComparisonResult(s1 - s2);
  if (ms1 !== ms2) return ComparisonResult(ms1 - ms2);
  if (µs1 !== µs2) return ComparisonResult(µs1 - µs2);
  if (ns1 !== ns2) return ComparisonResult(ns1 - ns2);
  return 0;
}

export function CompareISODateTime(
  y1: number,
  m1: number,
  d1: number,
  h1: number,
  min1: number,
  s1: number,
  ms1: number,
  µs1: number,
  ns1: number,
  y2: number,
  m2: number,
  d2: number,
  h2: number,
  min2: number,
  s2: number,
  ms2: number,
  µs2: number,
  ns2: number
) {
  const dateResult = CompareISODate(y1, m1, d1, y2, m2, d2);
  if (dateResult !== 0) return dateResult;
  return CompareTemporalTime(h1, min1, s1, ms1, µs1, ns1, h2, min2, s2, ms2, µs2, ns2);
}

// Defaults to native bigint, or something "native bigint-like".
// For users of Temporal that are running in environments without native BigInt,
// the only guarantee we should give is that the returned object's toString will
// return a string containing an accurate base 10 value of this bigint. This
// form factor should correctly interop with other bigint compat libraries
// easily.
type ExternalBigInt = bigint;

export function ToBigIntExternal(arg: unknown): ExternalBigInt {
  const jsbiBI = ToBigInt(arg);
  if (typeof (globalThis as any).BigInt !== 'undefined') return (globalThis as any).BigInt(jsbiBI.toString(10));
  return jsbiBI as unknown as ExternalBigInt;
}

export function ToBigInt(arg: unknown): JSBI {
  let prim = arg;
  if (typeof arg === 'object') {
    const toPrimFn = (arg as { [Symbol.toPrimitive]: unknown })[Symbol.toPrimitive];
    if (toPrimFn && typeof toPrimFn === 'function') {
      prim = ReflectApply(toPrimFn, arg, ['number']);
    }
  }

  // The AO ToBigInt throws on numbers because it does not allow implicit
  // conversion between number and bigint (unlike the bigint constructor).
  if (typeof prim === 'number') {
    throw new TypeError('cannot convert number to bigint');
  }
  if (typeof prim === 'bigint') {
    // JSBI doesn't know anything about the bigint type, and intentionally
    // assumes it doesn't exist. Passing one to the BigInt function will throw
    // an error.
    return JSBI.BigInt(prim.toString(10));
  }
  // JSBI will properly coerce types into a BigInt the same as the native BigInt
  // constructor will, with the exception of native bigint which is handled
  // above.
  // As of 2023-04-07, the only runtime type that neither of those can handle is
  // 'symbol', and both native bigint and the JSBI.BigInt function will throw an
  // error if they are given a Symbol.
  return JSBI.BigInt(prim as string | boolean | object);
}

// Note: This method returns values with bogus nanoseconds based on the previous iteration's
// milliseconds. That way there is a guarantee that the full nanoseconds are always going to be
// increasing at least and that the microsecond and nanosecond fields are likely to be non-zero.
export const SystemUTCEpochNanoSeconds: () => JSBI = (() => {
  let ns = JSBI.BigInt(Date.now() % 1e6);
  return () => {
    const ms = JSBI.BigInt(Date.now());
    const result = JSBI.add(JSBI.multiply(ms, MILLION), ns);
    ns = JSBI.remainder(ms, MILLION);
    if (JSBI.greaterThan(result, NS_MAX)) return NS_MAX;
    if (JSBI.lessThan(result, NS_MIN)) return NS_MIN;
    return result;
  };
})();

export function DefaultTimeZone() {
  return new IntlDateTimeFormat().resolvedOptions().timeZone;
}

export function ComparisonResult(value: number) {
  return value < 0 ? -1 : value > 0 ? 1 : (value as 0);
}

export function GetOptionsObject<T>(options: T) {
  if (options === undefined) return ObjectCreate(null) as NonNullable<T>;
  if (IsObject(options) && options !== null) return options;
  throw new TypeError(`Options parameter must be an object, not ${options === null ? 'null' : `${typeof options}`}`);
}

export function CreateOnePropObject<K extends string, V>(propName: K, propValue: V): { [k in K]: V } {
  const o = ObjectCreate(null);
  o[propName] = propValue;
  return o;
}

type StringlyTypedKeys<T> = Exclude<keyof T, symbol | number>;
function GetOption<P extends StringlyTypedKeys<O>, O extends Partial<Record<P, unknown>>>(
  options: O,
  property: P,
  allowedValues: ReadonlyArray<O[P]>,
  fallback: undefined
): O[P];
function GetOption<
  P extends StringlyTypedKeys<O>,
  O extends Partial<Record<P, unknown>>,
  Fallback extends Required<O>[P] | typeof REQUIRED | undefined
>(
  options: O,
  property: P,
  allowedValues: ReadonlyArray<O[P]>,
  fallback: Fallback
): Fallback extends undefined ? O[P] | undefined : Required<O>[P];
function GetOption<
  P extends StringlyTypedKeys<O>,
  O extends Partial<Record<P, unknown>>,
  Fallback extends Required<O>[P] | undefined
>(
  options: O,
  property: P,
  allowedValues: ReadonlyArray<O[P]>,
  fallback: O[P]
): Fallback extends undefined ? O[P] | undefined : Required<O>[P] {
  let value = options[property];
  if (value !== undefined) {
    value = ToString(value) as O[P];
    if (!allowedValues.includes(value)) {
      throw new RangeError(`${property} must be one of ${allowedValues.join(', ')}, not ${value}`);
    }
    return value;
  }
  if (fallback === REQUIRED) throw new RangeError(`${property} option is required`);
  return fallback;
}

export function IsBuiltinCalendar(id: string): id is BuiltinCalendarId {
  return BUILTIN_CALENDAR_IDS.includes(ASCIILowercase(id));
}

// This is a temporary implementation. Ideally we'd rely on Intl.DateTimeFormat
// here, to provide the latest CLDR alias data, when implementations catch up to
// the ECMA-402 change. The aliases below are taken from
// https://github.com/unicode-org/cldr/blob/main/common/bcp47/calendar.xml
export function CanonicalizeCalendar(idParam: string): BuiltinCalendarId {
  const id = ASCIILowercase(idParam);
  uncheckedAssertNarrowedType<BuiltinCalendarId>(
    id,
    'ES.IsBuiltinCalendar may allow mixed-case IDs, they are only guaranteed to be built-in after being lowercased'
  );
  switch (id) {
    case 'ethiopic-amete-alem':
      // May need to be removed in the future.
      // See https://github.com/tc39/ecma402/issues/285
      return 'ethioaa';
    // case 'gregorian':
    // (Skip 'gregorian'. It isn't a valid identifier as it's a single
    // subcomponent longer than 8 letters. It can only be used with the old
    // @key=value syntax.)
    case 'islamicc':
      return 'islamic-civil';
  }
  return id;
}

function ASCIILowercase<T extends string>(str: T): T {
  // The spec defines this operation distinct from String.prototype.lowercase,
  // so we'll follow the spec here. Note that nasty security issues that can
  // happen for some use cases if you're comparing case-modified non-ASCII
  // values. For example, Turkish's "I" character was the source of a security
  // issue involving "file://" URLs. See
  // https://haacked.com/archive/2012/07/05/turkish-i-problem-and-why-you-should-care.aspx/.
  let lowercase = '';
  for (let ix = 0; ix < str.length; ix++) {
    const code = Call(StringPrototypeCharCodeAt, str, [ix]);
    if (code >= 0x41 && code <= 0x5a) {
      lowercase += StringFromCharCode(code + 0x20);
    } else {
      lowercase += StringFromCharCode(code);
    }
  }
  return lowercase as T;
}

// This function isn't in the spec, but we put it in the polyfill to avoid
// repeating the same (long) error message in many files.
export function ValueOfThrows(constructorName: string): never {
  const compareCode =
    constructorName === 'PlainMonthDay'
      ? 'Temporal.PlainDate.compare(obj1.toPlainDate(year), obj2.toPlainDate(year))'
      : `Temporal.${constructorName}.compare(obj1, obj2)`;

  throw new TypeError(
    'Do not use built-in arithmetic operators with Temporal objects. ' +
      `When comparing, use ${compareCode}, not obj1 > obj2. ` +
      "When coercing to strings, use `${obj}` or String(obj), not '' + obj. " +
      'When coercing to numbers, use properties or methods of the object, not `+obj`. ' +
      'When concatenating with strings, use `${str}${obj}` or str.concat(obj), not str + obj. ' +
      'In React, coerce to a string before rendering a Temporal object.'
  );
}

const OFFSET = new RegExp(`^${PARSE.offset.source}$`);
const OFFSET_WITH_PARTS = new RegExp(`^${PARSE.offsetWithParts.source}$`);

function bisect(
  getState: (epochNs: JSBI) => number,
  leftParam: JSBI,
  rightParam: JSBI,
  lstateParam: number = getState(leftParam),
  rstateParam: number = getState(rightParam)
) {
  // This doesn't make much sense - why do these get converted unnecessarily?
  let left = JSBI.BigInt(leftParam);
  let right = JSBI.BigInt(rightParam);
  let lstate = lstateParam;
  let rstate = rstateParam;
  while (JSBI.greaterThan(JSBI.subtract(right, left), ONE)) {
    const middle = JSBI.divide(JSBI.add(left, right), JSBI.BigInt(2));
    const mstate = getState(middle);
    if (mstate === lstate) {
      left = middle;
      lstate = mstate;
    } else if (mstate === rstate) {
      right = middle;
      rstate = mstate;
    } else {
      throw new Error(`invalid state in bisection ${lstate} - ${mstate} - ${rstate}`);
    }
  }
  return right;
}
