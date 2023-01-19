const ArrayIncludes = Array.prototype.includes;
const ArrayPrototypePush = Array.prototype.push;
const IntlDateTimeFormat = globalThis.Intl.DateTimeFormat;
const MathMin = Math.min;
const MathMax = Math.max;
const MathAbs = Math.abs;
const MathFloor = Math.floor;
const MathSign = Math.sign;
const MathTrunc = Math.trunc;
const NumberIsNaN = Number.isNaN;
const NumberIsFinite = Number.isFinite;
const NumberCtor = Number;
const StringCtor = String;
const NumberMaxSafeInteger = Number.MAX_SAFE_INTEGER;
const ObjectCreate = Object.create;
const ObjectDefineProperty = Object.defineProperty;
const ObjectGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
const ReflectApply = Reflect.apply;
const ReflectOwnKeys = Reflect.ownKeys;

import { DEBUG } from './debug';
import JSBI from 'jsbi';

import type { Temporal } from '..';
import type {
  AnyTemporalLikeType,
  UnitSmallerThanOrEqualTo,
  CalendarProtocolParams,
  TimeZoneProtocolParams,
  InstantParams,
  PlainMonthDayParams,
  ZonedDateTimeParams,
  CalendarParams,
  TimeZoneParams,
  PlainDateParams,
  PlainTimeParams,
  DurationParams,
  PlainDateTimeParams,
  PlainYearMonthParams,
  PrimitiveFieldsOf,
  BuiltinCalendarId,
  Keys,
  AnyTemporalKey,
  CalendarSlot,
  TimeZoneSlot
} from './internaltypes';
import { GetIntrinsic } from './intrinsicclass';
import {
  CreateSlots,
  GetSlot,
  HasSlot,
  SetSlot,
  EPOCHNANOSECONDS,
  TIMEZONE_ID,
  CALENDAR_ID,
  INSTANT,
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

export const ZERO = JSBI.BigInt(0);
const ONE = JSBI.BigInt(1);
const SIXTY = JSBI.BigInt(60);
const TWENTY_FOUR = JSBI.BigInt(24);
export const THOUSAND = JSBI.BigInt(1e3);
export const MILLION = JSBI.BigInt(1e6);
export const BILLION = JSBI.BigInt(1e9);
const NEGATIVE_ONE = JSBI.BigInt(-1);
const HOUR_SECONDS = 3600;
export const HOUR_NANOS = JSBI.multiply(JSBI.BigInt(HOUR_SECONDS), BILLION);
const MINUTE_NANOS = JSBI.multiply(SIXTY, BILLION);
const DAY_NANOS = JSBI.multiply(HOUR_NANOS, TWENTY_FOUR);
const NS_MIN = JSBI.multiply(JSBI.BigInt(-86400), JSBI.BigInt(1e17));
const NS_MAX = JSBI.multiply(JSBI.BigInt(86400), JSBI.BigInt(1e17));
const YEAR_MIN = -271821;
const YEAR_MAX = 275760;
const BEFORE_FIRST_OFFSET_TRANSITION = JSBI.multiply(JSBI.BigInt(-388152), JSBI.BigInt(1e13)); // 1847-01-01T00:00:00Z
const ABOUT_TEN_YEARS_NANOS = JSBI.multiply(DAY_NANOS, JSBI.BigInt(366 * 10));
const ABOUT_ONE_YEAR_NANOS = JSBI.multiply(DAY_NANOS, JSBI.BigInt(366 * 1));
const TWO_WEEKS_NANOS = JSBI.multiply(DAY_NANOS, JSBI.BigInt(2 * 7));

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
  'coptic',
  'chinese',
  'dangi',
  'roc',
  'indian',
  'buddhist',
  'japanese',
  'gregory'
];

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

type ArrayElement<ArrayType> = ArrayType extends readonly (infer ElementType)[] ? ElementType : never;
type ArrayWithNewKeys<T, Keys> = Array<ArrayElement<T> | Keys>;

/**
 * In debug builds, this function verifies that the given argument "exists" (is not
 * null or undefined). This function becomes a no-op in the final bundles distributed via NPM.
 * @param arg
 */
export function assertExists<A>(arg: A): asserts arg is NonNullable<A> {
  if (DEBUG) {
    if (arg != null) {
      throw new Error('Expected arg to be set.');
    }
  }
}

function isZero(value: JSBI): boolean {
  return JSBI.equal(value, ZERO);
}

type Stringless<T> = Exclude<T, string>;

function GetMethod<T extends { [s in M]?: (...args: any[]) => unknown }, M extends string & keyof T>(
  obj: T,
  methodName: M
): T[M];
function GetMethod<
  T extends string | { [s in M]?: (...args: any[]) => unknown },
  M extends string & keyof Stringless<T>
>(obj: T, methodName: M): Stringless<T>[M] | undefined;
function GetMethod<
  T extends string | { [s in M]?: undefined | ((...args: any[]) => unknown) },
  M extends string & keyof T
>(obj: T, methodName: M): T[M] | undefined {
  const result = obj[methodName];
  if (result === undefined) return undefined;
  if (DEBUG) {
    if (typeof result !== 'function') throw new TypeError(`'${methodName}' must be a function`);
  }
  return result;
}

export function Call<T, A extends readonly any[], R>(
  target: (this: T, ...args: A) => R,
  thisArgument: T,
  argumentsList: Readonly<A>
): R {
  const args = arguments.length > 2 ? argumentsList : [];
  if (DEBUG) {
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

function ToIntegerOrInfinity(value: unknown) {
  const number = ToNumber(value);
  if (NumberIsNaN(number) || number === 0) {
    return 0;
  }
  if (!NumberIsFinite(number)) {
    return number;
  }
  const integer = MathFloor(MathAbs(number));
  if (integer === 0) {
    return 0;
  }
  return MathSign(number) * integer;
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

function divmod(x: JSBI, y: JSBI): { quotient: JSBI; remainder: JSBI } {
  const quotient = JSBI.divide(x, y);
  const remainder = JSBI.remainder(x, y);
  return { quotient, remainder };
}

function isNegativeJSBI(value: JSBI): boolean {
  return JSBI.lessThan(value, ZERO);
}

function signJSBI(value: JSBI): 1 | 0 | -1 {
  if (isZero(value)) return 0;
  if (isNegativeJSBI(value)) return -1;
  return 1;
}
function abs(x: JSBI): JSBI {
  if (JSBI.lessThan(x, ZERO)) return JSBI.multiply(x, NEGATIVE_ONE);
  return x;
}

type BuiltinCastFunction = (v: unknown) => string | number;
const BUILTIN_CASTS = new Map<AnyTemporalKey, BuiltinCastFunction>([
  ['year', ToIntegerWithTruncation],
  ['month', ToPositiveIntegerWithTruncation],
  ['monthCode', ToString],
  ['day', ToPositiveIntegerWithTruncation],
  ['hour', ToIntegerWithTruncation],
  ['minute', ToIntegerWithTruncation],
  ['second', ToIntegerWithTruncation],
  ['millisecond', ToIntegerWithTruncation],
  ['microsecond', ToIntegerWithTruncation],
  ['nanosecond', ToIntegerWithTruncation],
  ['years', ToIntegerIfIntegral],
  ['months', ToIntegerIfIntegral],
  ['weeks', ToIntegerIfIntegral],
  ['days', ToIntegerIfIntegral],
  ['hours', ToIntegerIfIntegral],
  ['minutes', ToIntegerIfIntegral],
  ['seconds', ToIntegerIfIntegral],
  ['milliseconds', ToIntegerIfIntegral],
  ['microseconds', ToIntegerIfIntegral],
  ['nanoseconds', ToIntegerIfIntegral],
  ['era', ToString],
  ['eraYear', ToIntegerOrInfinity],
  ['offset', ToString]
]);

const BUILTIN_DEFAULTS = new Map([
  ['hour', 0],
  ['minute', 0],
  ['second', 0],
  ['millisecond', 0],
  ['microsecond', 0],
  ['nanosecond', 0]
]);

// each item is [plural, singular, category]
const SINGULAR_PLURAL_UNITS = [
  ['years', 'year', 'date'],
  ['months', 'month', 'date'],
  ['weeks', 'week', 'date'],
  ['days', 'day', 'date'],
  ['hours', 'hour', 'time'],
  ['minutes', 'minute', 'time'],
  ['seconds', 'second', 'time'],
  ['milliseconds', 'millisecond', 'time'],
  ['microseconds', 'microsecond', 'time'],
  ['nanoseconds', 'nanosecond', 'time']
] as const;
const SINGULAR_FOR = new Map(SINGULAR_PLURAL_UNITS.map((e) => [e[0], e[1]] as const));
const PLURAL_FOR = new Map(SINGULAR_PLURAL_UNITS.map(([p, s]) => [s, p]));
const UNITS_DESCENDING = SINGULAR_PLURAL_UNITS.map(([, s]) => s);

const DURATION_FIELDS = Array.from(SINGULAR_FOR.keys()).sort();

import * as PARSE from './regex';

const IntlDateTimeFormatEnUsCache = new Map<string, Intl.DateTimeFormat>();

function getIntlDateTimeFormatEnUsForTimeZone(timeZoneIdentifier: string) {
  let instance = IntlDateTimeFormatEnUsCache.get(timeZoneIdentifier);
  if (instance === undefined) {
    instance = new IntlDateTimeFormat('en-us', {
      timeZone: StringCtor(timeZoneIdentifier),
      hour12: false,
      era: 'short',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    });
    IntlDateTimeFormatEnUsCache.set(timeZoneIdentifier, instance);
  }
  return instance;
}

export function ToObject<T>(value: T): T extends Record<string, unknown> ? T : object {
  if (typeof value === 'undefined' || value === null) {
    throw new TypeError(`Expected object not ${value}`);
  }
  return Object(value);
}

// Adapted from https://github.com/ljharb/es-abstract/blob/main/2022/CopyDataProperties.js
// but simplified (e.g. removed assertions) for this polyfill to reduce bundle size.
export function CopyDataProperties<K extends string | symbol, T extends Record<K, unknown>>(
  target: T,
  source: T | undefined,
  excludedKeys: K[],
  excludedValues?: unknown[]
) {
  if (typeof source === 'undefined' || source === null) return;

  const keys = ReflectOwnKeys(source) as (keyof T)[];
  for (const nextKey of keys) {
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

export function IsTemporalTimeZone(item: unknown): item is Temporal.TimeZone {
  return HasSlot(item, TIMEZONE_ID);
}
export function IsTemporalCalendar(item: unknown): item is Temporal.Calendar {
  return HasSlot(item, CALENDAR_ID);
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
function ParseTemporalTimeZone(stringIdent: string) {
  const { ianaName, offset, z } = ParseTemporalTimeZoneString(stringIdent);
  if (ianaName) return GetCanonicalTimeZoneIdentifier(ianaName);
  if (z) return 'UTC';
  // if !ianaName && !z then offset must be present
  assertExists(offset);
  const offsetNs = ParseTimeZoneOffsetString(offset);
  return FormatTimeZoneOffsetString(offsetNs);
}

function MaybeFormatCalendarAnnotation(
  calendar: CalendarSlot,
  showCalendar: Temporal.ShowCalendarOption['calendarName']
): string {
  if (showCalendar === 'never') return '';
  return FormatCalendarAnnotation(ToTemporalCalendarIdentifier(calendar), showCalendar);
}

function FormatCalendarAnnotation(id: string, showCalendar: Temporal.ShowCalendarOption['calendarName']) {
  if (showCalendar === 'never') return '';
  if (showCalendar === 'auto' && id === 'iso8601') return '';
  const flag = showCalendar === 'critical' ? '!' : '';
  return `[${flag}u-ca=${id}]`;
}

function ParseISODateTime(isoString: string) {
  // ZDT is the superset of fields for every other Temporal type
  const match = PARSE.zoneddatetime.exec(isoString);
  if (!match) throw new RangeError(`invalid ISO 8601 string: ${isoString}`);
  let yearString = match[1];
  if (yearString[0] === '\u2212') yearString = `-${yearString.slice(1)}`;
  if (yearString === '-000000') throw new RangeError(`invalid ISO 8601 string: ${isoString}`);
  const year = ToIntegerOrInfinity(yearString);
  const month = ToIntegerOrInfinity(match[2] || match[4]);
  const day = ToIntegerOrInfinity(match[3] || match[5]);
  const hour = ToIntegerOrInfinity(match[6]);
  const hasTime = match[6] !== undefined;
  const minute = ToIntegerOrInfinity(match[7] || match[10]);
  let second = ToIntegerOrInfinity(match[8] || match[11]);
  if (second === 60) second = 59;
  const fraction = (match[9] || match[12]) + '000000000';
  const millisecond = ToIntegerOrInfinity(fraction.slice(0, 3));
  const microsecond = ToIntegerOrInfinity(fraction.slice(3, 6));
  const nanosecond = ToIntegerOrInfinity(fraction.slice(6, 9));
  let offset;
  let z = false;
  if (match[13]) {
    offset = undefined;
    z = true;
  } else if (match[14] && match[15]) {
    const offsetSign = match[14] === '-' || match[14] === '\u2212' ? '-' : '+';
    const offsetHours = match[15] || '00';
    const offsetMinutes = match[16] || '00';
    const offsetSeconds = match[17] || '00';
    let offsetFraction = match[18] || '0';
    offset = `${offsetSign}${offsetHours}:${offsetMinutes}`;
    if (+offsetFraction) {
      while (offsetFraction.endsWith('0')) offsetFraction = offsetFraction.slice(0, -1);
      offset += `:${offsetSeconds}.${offsetFraction}`;
    } else if (+offsetSeconds) {
      offset += `:${offsetSeconds}`;
    }
    if (offset === '-00:00') offset = '+00:00';
  }
  const ianaName = match[19];
  const annotations = match[20];
  let calendar;
  for (const [, critical, key, value] of annotations.matchAll(PARSE.annotation)) {
    if (key === 'u-ca') {
      if (calendar === undefined) calendar = value;
    } else if (critical === '!') {
      throw new RangeError(`Unrecognized annotation: !${key}=${value}`);
    }
  }
  RejectDateTime(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond);
  return {
    year,
    month,
    day,
    hasTime,
    hour,
    minute,
    second,
    millisecond,
    microsecond,
    nanosecond,
    ianaName,
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
  if (!result.ianaName) throw new RangeError('Temporal.ZonedDateTime requires a time zone ID in brackets');
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
  let hour, minute, second, millisecond, microsecond, nanosecond, annotations;
  if (match) {
    hour = ToIntegerOrInfinity(match[1]);
    minute = ToIntegerOrInfinity(match[2] || match[5]);
    second = ToIntegerOrInfinity(match[3] || match[6]);
    if (second === 60) second = 59;
    const fraction = (match[4] || match[7]) + '000000000';
    millisecond = ToIntegerOrInfinity(fraction.slice(0, 3));
    microsecond = ToIntegerOrInfinity(fraction.slice(3, 6));
    nanosecond = ToIntegerOrInfinity(fraction.slice(6, 9));
    annotations = match[14];
    for (const [, critical, key, value] of annotations.matchAll(PARSE.annotation)) {
      if (key !== 'u-ca' && critical === '!') {
        throw new RangeError(`Unrecognized annotation: !${key}=${value}`);
      }
    }
    if (match[8]) throw new RangeError('Z designator not supported for PlainTime');
  } else {
    let z, hasTime;
    ({ hasTime, hour, minute, second, millisecond, microsecond, nanosecond, z } = ParseISODateTime(isoString));
    if (!hasTime) throw new RangeError(`time is missing in string: ${isoString}`);
    if (z) throw new RangeError('Z designator not supported for PlainTime');
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
    let yearString = match[1];
    if (yearString[0] === '\u2212') yearString = `-${yearString.slice(1)}`;
    if (yearString === '-000000') throw new RangeError(`invalid ISO 8601 string: ${isoString}`);
    year = ToIntegerOrInfinity(yearString);
    month = ToIntegerOrInfinity(match[2]);
    const annotations = match[3];
    for (const [, critical, key, value] of annotations.matchAll(PARSE.annotation)) {
      if (key === 'u-ca') {
        if (calendar === undefined) calendar = value;
      } else if (critical === '!') {
        throw new RangeError(`Unrecognized annotation: !${key}=${value}`);
      }
    }
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
    month = ToIntegerOrInfinity(match[1]);
    day = ToIntegerOrInfinity(match[2]);
    const annotations = match[3];
    for (const [, critical, key, value] of annotations.matchAll(PARSE.annotation)) {
      if (key === 'u-ca') {
        if (calendar === undefined) calendar = value;
      } else if (critical === '!') {
        throw new RangeError(`Unrecognized annotation: !${key}=${value}`);
      }
    }
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

// ts-prune-ignore-next TODO: remove if test/validStrings is converted to TS.
export function ParseTemporalTimeZoneString(stringIdent: string): Partial<{
  ianaName: string | undefined;
  offset: string | undefined;
  z: boolean | undefined;
}> {
  const bareID = new RegExp(`^${PARSE.timeZoneID.source}$`, 'i');
  if (bareID.test(stringIdent)) return { ianaName: stringIdent };
  try {
    // Try parsing ISO string instead
    const result = ParseISODateTime(stringIdent);
    if (result.z || result.offset || result.ianaName) {
      return result;
    }
  } catch {
    // fall through
  }
  throw new RangeError(`Invalid time zone: ${stringIdent}`);
}

// ts-prune-ignore-next TODO: remove if test/validStrings is converted to TS.
export function ParseTemporalDurationString(isoString: string) {
  const match = PARSE.duration.exec(isoString);
  if (!match) throw new RangeError(`invalid duration: ${isoString}`);
  if (match.slice(2).every((element) => element === undefined)) {
    throw new RangeError(`invalid duration: ${isoString}`);
  }
  const sign = match[1] === '-' || match[1] === '\u2212' ? -1 : 1;
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
    excessNanoseconds = ToIntegerOrInfinity((fHours + '000000000').slice(0, 9)) * 3600 * sign;
  } else {
    minutes = minutesStr === undefined ? 0 : ToIntegerWithTruncation(minutesStr) * sign;
    if (fMinutes !== undefined) {
      if (secondsStr ?? fSeconds ?? false) {
        throw new RangeError('only the smallest unit can be fractional');
      }
      excessNanoseconds = ToIntegerOrInfinity((fMinutes + '000000000').slice(0, 9)) * 60 * sign;
    } else {
      seconds = secondsStr === undefined ? 0 : ToIntegerWithTruncation(secondsStr) * sign;
      if (fSeconds !== undefined) {
        excessNanoseconds = ToIntegerOrInfinity((fSeconds + '000000000').slice(0, 9)) * sign;
      }
    }
  }

  const nanoseconds = excessNanoseconds % 1000;
  const microseconds = MathTrunc(excessNanoseconds / 1000) % 1000;
  const milliseconds = MathTrunc(excessNanoseconds / 1e6) % 1000;
  seconds += MathTrunc(excessNanoseconds / 1e9) % 60;
  minutes += MathTrunc(excessNanoseconds / 6e10);

  RejectDuration(years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
  return { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
}

// ts-prune-ignore-next TODO: remove if test/validStrings is converted to TS.
export function ParseTemporalInstant(isoString: string) {
  let { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond, offset, z } =
    ParseTemporalInstantString(isoString);

  if (!z && !offset) throw new RangeError('Temporal.Instant requires a time zone offset');
  // At least one of z or offset is defined, but TS doesn't seem to understand
  // that we only use offset if z is not defined (and thus offset must be defined).
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion
  const offsetNs = z ? 0 : ParseTimeZoneOffsetString(offset!);
  ({ year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } = BalanceISODateTime(
    year,
    month,
    day,
    hour,
    minute,
    second,
    millisecond,
    microsecond,
    nanosecond - offsetNs
  ));

  const epochNs = GetUTCEpochNanoseconds(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond);
  if (epochNs === null) throw new RangeError('DateTime outside of supported range');
  return epochNs;
}

export function RegulateISODate(
  yearParam: number,
  monthParam: number,
  dayParam: number,
  overflow: Temporal.ArithmeticOptions['overflow']
) {
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
  overflow: Temporal.ArithmeticOptions['overflow']
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

export function RegulateISOYearMonth(
  yearParam: number,
  monthParam: number,
  overflow: Temporal.ArithmeticOptions['overflow']
) {
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
    return ParseTemporalDurationString(ToString(item));
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
  for (const property of DURATION_FIELDS) {
    const value = partial[property];
    if (value !== undefined) {
      result[property] = value;
    }
  }
  let { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = result;
  RejectDuration(years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
  return { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
}

function ToTemporalPartialDurationRecord(temporalDurationLike: Temporal.DurationLike | string) {
  if (!IsObject(temporalDurationLike)) {
    throw new TypeError('invalid duration-like');
  }
  const result: Record<typeof DURATION_FIELDS[number], number | undefined> = {
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
  for (const property of DURATION_FIELDS) {
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

function ToLimitedTemporalDuration(
  item: Temporal.DurationLike | string,
  disallowedProperties: (keyof Temporal.DurationLike)[]
) {
  let record = ToTemporalDurationRecord(item);
  for (const property of disallowedProperties) {
    if (record[property] !== 0) {
      throw new RangeError(
        `Duration field ${property} not supported by Temporal.Instant. Try Temporal.ZonedDateTime instead.`
      );
    }
  }
  return record;
}

export function ToTemporalOverflow(options: Temporal.AssignmentOptions | undefined) {
  if (options === undefined) return 'constrain';
  return GetOption(options, 'overflow', ['constrain', 'reject'], 'constrain');
}

export function ToTemporalDisambiguation(options: Temporal.ToInstantOptions | undefined) {
  if (options === undefined) return 'compatible';
  return GetOption(options, 'disambiguation', ['compatible', 'earlier', 'later', 'reject'], 'compatible');
}

export function ToTemporalRoundingMode(
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

function NegateTemporalRoundingMode(roundingMode: Temporal.RoundingMode) {
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

export function ToTemporalOffset(
  options: Temporal.OffsetDisambiguationOptions | undefined,
  fallback: Required<Temporal.OffsetDisambiguationOptions>['offset']
) {
  if (options === undefined) return fallback;
  return GetOption(options, 'offset', ['prefer', 'use', 'ignore', 'reject'], fallback);
}

export function ToCalendarNameOption(options: Temporal.ShowCalendarOption) {
  return GetOption(options, 'calendarName', ['auto', 'always', 'never', 'critical'], 'auto');
}

export function ToTimeZoneNameOption(options: Temporal.ZonedDateTimeToStringOptions) {
  return GetOption(options, 'timeZoneName', ['auto', 'never', 'critical'], 'auto');
}

export function ToShowOffsetOption(options: Temporal.ZonedDateTimeToStringOptions) {
  return GetOption(options, 'offset', ['auto', 'never'], 'auto');
}

export function ToTemporalRoundingIncrement(options: { roundingIncrement?: number }) {
  let increment = options.roundingIncrement;
  if (increment === undefined) return 1;
  increment = ToNumber(increment);
  if (!NumberIsFinite(increment)) {
    throw new RangeError('roundingIncrement must be finite');
  }
  const integerIncrement = MathTrunc(increment);
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

export function ToFractionalSecondDigits(
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

export function ToSecondsStringPrecisionRecord(
  smallestUnit: Temporal.ToStringPrecisionOptions['smallestUnit'],
  precision: Temporal.ToStringPrecisionOptions['fractionalSecondDigits']
): {
  precision: Temporal.ToStringPrecisionOptions['fractionalSecondDigits'] | 'minute';
  unit: UnitSmallerThanOrEqualTo<'minute'>;
  increment: number;
} {
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

export function GetTemporalUnit<
  U extends keyof TemporalUnitOptionsBag,
  T extends keyof UnitTypeMapping,
  D extends typeof REQUIRED | UnitTypeMapping[T] | AllowedGetTemporalUnitDefaultValues[U],
  R extends Exclude<D, typeof REQUIRED> | UnitTypeMapping[T]
>(options: TemporalUnitOptionsBag, key: U, unitGroup: T, requiredOrDefault: D): R;
export function GetTemporalUnit<
  U extends keyof TemporalUnitOptionsBag,
  T extends keyof UnitTypeMapping,
  D extends typeof REQUIRED | UnitTypeMapping[T] | AllowedGetTemporalUnitDefaultValues[U],
  E extends 'auto' | Temporal.DateTimeUnit,
  R extends UnitTypeMapping[T] | Exclude<D, typeof REQUIRED> | E
>(options: TemporalUnitOptionsBag, key: U, unitGroup: T, requiredOrDefault: D, extraValues: ReadonlyArray<E>): R;
// This signature of the function is NOT used in type-checking, so restricting
// the default value via generic binding like the other overloads isn't
// necessary.
export function GetTemporalUnit<
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
  for (const [, singular, category] of SINGULAR_PLURAL_UNITS) {
    if (unitGroup === 'datetime' || unitGroup === category) {
      allowedSingular.push(singular);
    }
  }
  allowedSingular.push(...extraValues);
  let defaultVal: typeof REQUIRED | Temporal.DateTimeUnit | 'auto' | undefined = requiredOrDefault;
  if (defaultVal === REQUIRED) {
    defaultVal = undefined;
  } else if (defaultVal !== undefined) {
    allowedSingular.push(defaultVal);
  }
  const allowedValues: Array<Temporal.DateTimeUnit | Temporal.PluralUnit<Temporal.DateTimeUnit> | 'auto'> = [
    ...allowedSingular
  ];
  for (const singular of allowedSingular) {
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

export function ToRelativeTemporalObject(options: {
  relativeTo?:
    | Temporal.ZonedDateTime
    | Temporal.PlainDateTime
    | Temporal.ZonedDateTimeLike
    | Temporal.PlainDateTimeLike
    | string
    | undefined;
}): Temporal.ZonedDateTime | Temporal.PlainDate | undefined {
  const relativeTo = options.relativeTo;
  if (relativeTo === undefined) return relativeTo;

  let offsetBehaviour: OffsetBehaviour = 'option';
  let matchMinutes = false;
  let year, month, day, hour, minute, second, millisecond, microsecond, nanosecond, calendar, timeZone, offset;
  if (IsObject(relativeTo)) {
    if (IsTemporalZonedDateTime(relativeTo) || IsTemporalDate(relativeTo)) return relativeTo;
    if (IsTemporalDateTime(relativeTo)) return TemporalDateTimeToDate(relativeTo);
    calendar = GetTemporalCalendarSlotValueWithISODefault(relativeTo);
    const fieldNames = CalendarFields(calendar, [
      'day',
      'hour',
      'microsecond',
      'millisecond',
      'minute',
      'month',
      'monthCode',
      'nanosecond',
      'second',
      'year'
    ] as const);
    type FieldNamesWithTimeZoneAndOffset = ArrayWithNewKeys<typeof fieldNames, 'timeZone' | 'offset'>;
    (fieldNames as FieldNamesWithTimeZoneAndOffset).push('timeZone', 'offset');
    const fields = PrepareTemporalFields(relativeTo, fieldNames, []);
    const dateOptions = ObjectCreate(null) as Temporal.AssignmentOptions;
    dateOptions.overflow = 'constrain';
    ({ year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } = InterpretTemporalDateTimeFields(
      calendar,
      fields,
      dateOptions
    ));
    offset = fields.offset;
    if (offset === undefined) offsetBehaviour = 'wall';
    timeZone = fields.timeZone;
    if (timeZone !== undefined) timeZone = ToTemporalTimeZoneSlotValue(timeZone);
  } else {
    let ianaName, z;
    ({ year, month, day, hour, minute, second, millisecond, microsecond, nanosecond, calendar, ianaName, offset, z } =
      ParseISODateTime(ToString(relativeTo)));
    if (ianaName) {
      timeZone = ToTemporalTimeZoneSlotValue(ianaName);
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
    calendar = ASCIILowercase(calendar);
  }
  if (timeZone === undefined) return CreateTemporalDate(year, month, day, calendar);
  // If offset is missing here, then offsetBehavior will never be be 'option'.
  assertExists(offset);
  const offsetNs = offsetBehaviour === 'option' ? ParseTimeZoneOffsetString(offset) : 0;
  const epochNanoseconds = InterpretISODateTimeOffset(
    year,
    month,
    day,
    hour,
    minute,
    second,
    millisecond,
    microsecond,
    nanosecond,
    offsetBehaviour,
    offsetNs,
    timeZone,
    'compatible',
    'reject',
    matchMinutes
  );
  return CreateTemporalZonedDateTime(epochNanoseconds, timeZone, calendar);
}

export function DefaultTemporalLargestUnit(
  years: number,
  months: number,
  weeks: number,
  days: number,
  hours: number,
  minutes: number,
  seconds: number,
  milliseconds: number,
  microseconds: number,
  nanoseconds: number
): Temporal.DateTimeUnit {
  for (const [prop, v] of [
    ['years', years],
    ['months', months],
    ['weeks', weeks],
    ['days', days],
    ['hours', hours],
    ['minutes', minutes],
    ['seconds', seconds],
    ['milliseconds', milliseconds],
    ['microseconds', microseconds],
    ['nanoseconds', nanoseconds]
  ] as const) {
    if (v !== 0) {
      // All the above keys are definitely in SINGULAR_FOR
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return SINGULAR_FOR.get(prop)!;
    }
  }
  return 'nanosecond';
}

export function LargerOfTwoTemporalUnits<T1 extends Temporal.DateTimeUnit, T2 extends Temporal.DateTimeUnit>(
  unit1: T1,
  unit2: T2
) {
  if (UNITS_DESCENDING.indexOf(unit1) > UNITS_DESCENDING.indexOf(unit2)) return unit2;
  return unit1;
}

type FieldCompleteness = 'complete' | 'partial';
interface FieldPrepareOptions {
  emptySourceErrorMessage: string;
}

// Returns all potential owners from all Temporal Like-types for a given union
// of keys in K.
// e.g.
// Owner<'nanosecond'> => PlainDateTimeLike | ZonedDateTimeLike | PlainDateTimeLike | ZonedDateTimeLike
// Owner<'nanoseconds'> => Duration (the only type with plural keys)
type Owner<K extends AnyTemporalKey> =
  // Conditional typing maps over all of the types given in AnyTemporalLikeType
  // union
  K extends unknown ? OwnerOf<K, AnyTemporalLikeType> : 'ThisShouldNeverHappen';

// Returns T iff T has K as all of the key(s) (even if those keys are optional
// in T), never otherwise. This is a private type for use only in the Owner type
// above.
type OwnerOf<K extends AnyTemporalKey, T> =
  // Distribute the union before passing to Required
  // Without distributing, this is
  // Required<ZonedDateTimeLike | DurationLike> extends Record
  // vs (with distribution)
  // Required<ZonedDateTimeLike> extends Record<....> | Required<DurationLike> extends Record<....>
  T extends unknown
    ? // All the keys in the Like-types are optional, so in order for them to
      // 'extend Record<K,...>', where K indicates the required fields, we pass T
      // through Required to make all the keys non-optional.
      // Note this doesn't work the other way around: using Partial<Record<K, ..>>
      // will always be extended by any object (as all the keys are optional).
      Required<T> extends Record<K, unknown>
      ? T
      : // never is the 'identity' type for unions - nothing will be added or
        // removed from the union.
        never
    : 'ThisShouldNeverHappen';

type Prop<T, K> = T extends unknown ? (K extends keyof T ? T[K] : undefined) : 'ThisShouldNeverHappen';

// Resolve copies the keys and values of a given object type so that TS will
// stop using type names in error messages / autocomplete. Generally, those
// names can be more useful, but sometimes having the primitive object shape is
// significantly easier to reason about (e.g. deeply-nested types).
// Resolve is an identity function for function types.
type Resolve<T> =
  // Re-mapping doesn't work very well for functions, so exclude them
  T extends (...args: never[]) => unknown
    ? T
    : // Re-map all the keys in T to the same value. This forces TS into no longer
      // using type aliases, etc.
      { [K in keyof T]: T[K] };

type FieldObjectFromOwners<OwnerT, FieldKeys extends AnyTemporalKey> = Resolve<
  // The resulting object type contains:
  // - All keys in FieldKeys, which are required properties and their values
  //   don't include undefined.
  // - All the other keys in OwnerT that aren't in FieldKeys, which are optional
  //   properties and their value types explicitly include undefined.
  {
    -readonly [k in FieldKeys]: Exclude<Prop<OwnerT, k>, undefined>;
  } & {
    -readonly [k in Exclude<Keys<OwnerT>, FieldKeys>]?: Prop<OwnerT, k> | undefined;
  }
>;

type PrepareTemporalFieldsReturn<
  FieldKeys extends AnyTemporalKey,
  RequiredFieldsOpt extends ReadonlyArray<FieldKeys> | FieldCompleteness,
  OwnerT extends Owner<FieldKeys>
> = RequiredFieldsOpt extends 'partial' ? Partial<OwnerT> : FieldObjectFromOwners<OwnerT, FieldKeys>;
export function PrepareTemporalFields<
  FieldKeys extends AnyTemporalKey,
  // Constrains the Required keys to be a subset of the given field keys
  // This could have been written directly into the parameter type, but that
  // causes an unintended effect where the required fields are added to the list
  // of field keys, even if that key isn't present in 'fields'.
  // RequiredFieldKeys extends FieldKeys,
  RequiredFields extends ReadonlyArray<FieldKeys> | FieldCompleteness
>(
  bag: Partial<Record<FieldKeys, unknown>>,
  fields: Array<FieldKeys>,
  requiredFields: RequiredFields,
  { emptySourceErrorMessage }: FieldPrepareOptions = { emptySourceErrorMessage: 'no supported properties found' }
): PrepareTemporalFieldsReturn<FieldKeys, RequiredFields, Owner<FieldKeys>> {
  const result: Partial<Record<AnyTemporalKey, unknown>> = ObjectCreate(null);
  let any = false;
  fields.sort();
  for (const property of fields) {
    let value = bag[property];
    if (value !== undefined) {
      any = true;
      if (BUILTIN_CASTS.has(property)) {
        // We just has-checked this map access, so there will definitely be a
        // value.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        value = BUILTIN_CASTS.get(property)!(value);
      }
      result[property] = value;
    } else if (requiredFields !== 'partial') {
      // TODO: using .call in this way is not correctly type-checked by tsc.
      // We might need a type-safe Call wrapper?
      if (ArrayIncludes.call(requiredFields, property)) {
        throw new TypeError(`required property '${property}' missing or undefined`);
      }
      value = BUILTIN_DEFAULTS.get(property);
      result[property] = value;
    }
  }
  if (requiredFields === 'partial' && !any) {
    throw new TypeError(emptySourceErrorMessage);
  }
  return result as unknown as PrepareTemporalFieldsReturn<FieldKeys, RequiredFields, Owner<FieldKeys>>;
}

interface TimeRecord {
  hour?: number;
  minute?: number;
  second?: number;
  microsecond?: number;
  millisecond?: number;
  nanosecond?: number;
}
export function ToTemporalTimeRecord(bag: Partial<Record<keyof TimeRecord, string | number>>): Required<TimeRecord>;
export function ToTemporalTimeRecord(
  bag: Partial<Record<keyof TimeRecord, string | number | undefined>>,
  completeness: 'partial'
): Partial<TimeRecord>;
export function ToTemporalTimeRecord(
  bag: Partial<Record<keyof TimeRecord, string | number>>,
  completeness: 'complete'
): Required<TimeRecord>;
export function ToTemporalTimeRecord(
  bag: Partial<Record<keyof TimeRecord, string | number | undefined>>,
  completeness: FieldCompleteness = 'complete'
): Partial<TimeRecord> {
  // NOTE: Field order is sorted to make the sort in PrepareTemporalFields more efficient.
  const fields: (keyof TimeRecord)[] = ['hour', 'microsecond', 'millisecond', 'minute', 'nanosecond', 'second'];
  const partial = PrepareTemporalFields(bag, fields, 'partial', { emptySourceErrorMessage: 'invalid time-like' });
  const result: Partial<TimeRecord> = {};
  for (const field of fields) {
    const valueDesc = ObjectGetOwnPropertyDescriptor(partial, field);
    if (valueDesc !== undefined) {
      result[field] = valueDesc.value;
    } else if (completeness === 'complete') {
      result[field] = 0;
    }
  }
  return result;
}

export function ToTemporalDate(
  itemParam: PlainDateParams['from'][0],
  options?: PlainDateParams['from'][1]
): Temporal.PlainDate {
  let item = itemParam;
  if (IsObject(item)) {
    if (IsTemporalDate(item)) return item;
    if (IsTemporalZonedDateTime(item)) {
      ToTemporalOverflow(options); // validate and ignore
      item = GetPlainDateTimeFor(GetSlot(item, TIME_ZONE), GetSlot(item, INSTANT), GetSlot(item, CALENDAR));
    }
    if (IsTemporalDateTime(item)) {
      ToTemporalOverflow(options); // validate and ignore
      return CreateTemporalDate(
        GetSlot(item, ISO_YEAR),
        GetSlot(item, ISO_MONTH),
        GetSlot(item, ISO_DAY),
        GetSlot(item, CALENDAR)
      );
    }
    const calendar = GetTemporalCalendarSlotValueWithISODefault(item);
    const fieldNames = CalendarFields(calendar, ['day', 'month', 'monthCode', 'year'] as const);
    const fields = PrepareTemporalFields(item, fieldNames, []);
    return CalendarDateFromFields(calendar, fields, options);
  }
  ToTemporalOverflow(options); // validate and ignore
  let { year, month, day, calendar, z } = ParseTemporalDateString(ToString(item));
  if (z) throw new RangeError('Z designator not supported for PlainDate');
  if (!calendar) calendar = 'iso8601';
  if (!IsBuiltinCalendar(calendar)) throw new RangeError(`invalid calendar identifier ${calendar}`);
  calendar = ASCIILowercase(calendar);
  return CreateTemporalDate(year, month, day, calendar);
}

export function InterpretTemporalDateTimeFields(
  calendar: CalendarSlot,
  fields: PrimitiveFieldsOf<Temporal.PlainDateTimeLike> & Parameters<typeof CalendarDateFromFields>[1],
  options?: Temporal.AssignmentOptions
) {
  let { hour, minute, second, millisecond, microsecond, nanosecond } = ToTemporalTimeRecord(fields);
  const overflow = ToTemporalOverflow(options);
  const date = CalendarDateFromFields(calendar, fields, options);
  const year = GetSlot(date, ISO_YEAR);
  const month = GetSlot(date, ISO_MONTH);
  const day = GetSlot(date, ISO_DAY);
  ({ hour, minute, second, millisecond, microsecond, nanosecond } = RegulateTime(
    hour,
    minute,
    second,
    millisecond,
    microsecond,
    nanosecond,
    overflow
  ));
  return { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond };
}

export function ToTemporalDateTime(item: PlainDateTimeParams['from'][0], options?: PlainDateTimeParams['from'][1]) {
  let year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number,
    millisecond: number,
    microsecond: number,
    nanosecond: number,
    calendar;
  if (IsObject(item)) {
    if (IsTemporalDateTime(item)) return item;
    if (IsTemporalZonedDateTime(item)) {
      ToTemporalOverflow(options); // validate and ignore
      return GetPlainDateTimeFor(GetSlot(item, TIME_ZONE), GetSlot(item, INSTANT), GetSlot(item, CALENDAR));
    }
    if (IsTemporalDate(item)) {
      ToTemporalOverflow(options); // validate and ignore
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

    calendar = GetTemporalCalendarSlotValueWithISODefault(item);
    const fieldNames = CalendarFields(calendar, [
      'day',
      'hour',
      'microsecond',
      'millisecond',
      'minute',
      'month',
      'monthCode',
      'nanosecond',
      'second',
      'year'
    ] as const);
    const fields = PrepareTemporalFields(item, fieldNames, []);
    ({ year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } = InterpretTemporalDateTimeFields(
      calendar,
      fields,
      options
    ));
  } else {
    ToTemporalOverflow(options); // validate and ignore
    let z;
    ({ year, month, day, hour, minute, second, millisecond, microsecond, nanosecond, calendar, z } =
      ParseTemporalDateTimeString(ToString(item)));
    if (z) throw new RangeError('Z designator not supported for PlainDateTime');
    RejectDateTime(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond);
    if (!calendar) calendar = 'iso8601';
    if (!IsBuiltinCalendar(calendar)) throw new RangeError(`invalid calendar identifier ${calendar}`);
    calendar = ASCIILowercase(calendar);
  }
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

export function ToTemporalInstant(item: InstantParams['from'][0]) {
  if (IsTemporalInstant(item)) return item;
  if (IsTemporalZonedDateTime(item)) {
    const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
    return new TemporalInstant(GetSlot(item, EPOCHNANOSECONDS));
  }
  const ns = ParseTemporalInstant(ToString(item));
  const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
  return new TemporalInstant(ns);
}

export function ToTemporalMonthDay(
  itemParam: PlainMonthDayParams['from'][0],
  options?: PlainMonthDayParams['from'][1]
) {
  let item = itemParam;
  if (IsObject(item)) {
    if (IsTemporalMonthDay(item)) return item;
    let calendar: CalendarSlot, calendarAbsent: boolean;
    if (HasSlot(item, CALENDAR)) {
      calendar = GetSlot(item, CALENDAR);
      calendarAbsent = false;
    } else {
      let calendarFromItem = item.calendar;
      calendarAbsent = calendarFromItem === undefined;
      if (calendarFromItem === undefined) calendarFromItem = 'iso8601';
      calendar = ToTemporalCalendarSlotValue(calendarFromItem);
    }
    // HasSlot above adjusts the type of 'item' to include
    // TypesWithCalendarUnits, which causes type-inference failures below.
    // This is probably indicative of problems with HasSlot's typing.
    const fieldNames = CalendarFields(calendar, ['day', 'month', 'monthCode', 'year'] as const);
    const fields = PrepareTemporalFields(item, fieldNames, []);
    // Callers who omit the calendar are not writing calendar-independent
    // code. In that case, `monthCode`/`year` can be omitted; `month` and
    // `day` are sufficient. Add a `year` to satisfy calendar validation.
    if (calendarAbsent && fields.month !== undefined && fields.monthCode === undefined && fields.year === undefined) {
      fields.year = 1972;
    }
    return CalendarMonthDayFromFields(calendar, fields, options);
  }

  ToTemporalOverflow(options); // validate and ignore
  let { month, day, referenceISOYear, calendar } = ParseTemporalMonthDayString(ToString(item));
  if (calendar === undefined) calendar = 'iso8601';
  if (!IsBuiltinCalendar(calendar)) throw new RangeError(`invalid calendar identifier ${calendar}`);
  calendar = ASCIILowercase(calendar);

  if (referenceISOYear === undefined) {
    RejectISODate(1972, month, day);
    return CreateTemporalMonthDay(month, day, calendar);
  }
  const result = CreateTemporalMonthDay(month, day, calendar, referenceISOYear);
  return CalendarMonthDayFromFields(calendar, result);
}

export function ToTemporalTime(
  itemParam: PlainTimeParams['from'][0],
  overflow: NonNullable<PlainTimeParams['from'][1]>['overflow'] = 'constrain'
) {
  let item = itemParam;
  let hour, minute, second, millisecond, microsecond, nanosecond;
  if (IsObject(item)) {
    if (IsTemporalTime(item)) return item;
    if (IsTemporalZonedDateTime(item)) {
      item = GetPlainDateTimeFor(GetSlot(item, TIME_ZONE), GetSlot(item, INSTANT), GetSlot(item, CALENDAR));
    }
    if (IsTemporalDateTime(item)) {
      const TemporalPlainTime = GetIntrinsic('%Temporal.PlainTime%');
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
    ({ hour, minute, second, millisecond, microsecond, nanosecond } = ParseTemporalTimeString(ToString(item)));
    RejectTime(hour, minute, second, millisecond, microsecond, nanosecond);
  }
  const TemporalPlainTime = GetIntrinsic('%Temporal.PlainTime%');
  return new TemporalPlainTime(hour, minute, second, millisecond, microsecond, nanosecond);
}

export function ToTemporalYearMonth(
  item: PlainYearMonthParams['from'][0],
  options?: PlainYearMonthParams['from'][1]
): Temporal.PlainYearMonth {
  if (IsObject(item)) {
    if (IsTemporalYearMonth(item)) return item;
    const calendar = GetTemporalCalendarSlotValueWithISODefault(item);
    const fieldNames = CalendarFields(calendar, ['month', 'monthCode', 'year'] as const);
    const fields = PrepareTemporalFields(item, fieldNames, []);
    return CalendarYearMonthFromFields(calendar, fields, options);
  }

  ToTemporalOverflow(options); // validate and ignore
  let { year, month, referenceISODay, calendar } = ParseTemporalYearMonthString(ToString(item));
  if (calendar === undefined) calendar = 'iso8601';
  if (!IsBuiltinCalendar(calendar)) throw new RangeError(`invalid calendar identifier ${calendar}`);
  calendar = ASCIILowercase(calendar);

  if (referenceISODay === undefined) {
    RejectISODate(year, month, 1);
    return CreateTemporalYearMonth(year, month, calendar);
  }
  const result = CreateTemporalYearMonth(year, month, calendar, referenceISODay);
  return CalendarYearMonthFromFields(calendar, result);
}

type OffsetBehaviour = 'wall' | 'exact' | 'option';

export function InterpretISODateTimeOffset(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
  microsecond: number,
  nanosecond: number,
  offsetBehaviour: OffsetBehaviour,
  offsetNs: number,
  timeZone: string | Temporal.TimeZoneProtocol,
  disambiguation: NonNullable<Temporal.ToInstantOptions['disambiguation']>,
  offsetOpt: Temporal.OffsetDisambiguationOptions['offset'],
  matchMinute: boolean
) {
  const DateTime = GetIntrinsic('%Temporal.PlainDateTime%');
  const dt = new DateTime(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond);

  if (offsetBehaviour === 'wall' || offsetOpt === 'ignore') {
    // Simple case: ISO string without a TZ offset (or caller wants to ignore
    // the offset), so just convert DateTime to Instant in the given time zone
    const instant = GetInstantFor(timeZone, dt, disambiguation);
    return GetSlot(instant, EPOCHNANOSECONDS);
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
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond
    );
    if (epochNs === null) throw new RangeError('ZonedDateTime outside of supported range');
    return JSBI.subtract(epochNs, JSBI.BigInt(offsetNs));
  }

  // "prefer" or "reject"
  const possibleInstants = GetPossibleInstantsFor(timeZone, dt);
  for (const candidate of possibleInstants) {
    const candidateOffset = GetOffsetNanosecondsFor(timeZone, candidate);
    const roundedCandidateOffset = JSBI.toNumber(
      RoundNumberToIncrement(JSBI.BigInt(candidateOffset), MINUTE_NANOS, 'halfExpand')
    );
    if (candidateOffset === offsetNs || (matchMinute && roundedCandidateOffset === offsetNs)) {
      return GetSlot(candidate, EPOCHNANOSECONDS);
    }
  }

  // the user-provided offset doesn't match any instants for this time
  // zone and date/time.
  if (offsetOpt === 'reject') {
    const offsetStr = FormatTimeZoneOffsetString(offsetNs);
    const timeZoneString = IsTemporalTimeZone(timeZone) ? GetSlot(timeZone, TIMEZONE_ID) : 'time zone';
    // The tsc emit for this line rewrites to invoke the PlainDateTime's valueOf method, NOT
    // toString (which is invoked by Node when using template literals directly).
    // See https://github.com/microsoft/TypeScript/issues/39744 for the proposed fix in tsc emit
    throw new RangeError(`Offset ${offsetStr} is invalid for ${dt.toString()} in ${timeZoneString}`);
  }
  // fall through: offsetOpt === 'prefer', but the offset doesn't match
  // so fall back to use the time zone instead.
  const instant = DisambiguatePossibleInstants(possibleInstants, timeZone, dt, disambiguation);
  return GetSlot(instant, EPOCHNANOSECONDS);
}

export function ToTemporalZonedDateTime(
  item: ZonedDateTimeParams['from'][0],
  options?: ZonedDateTimeParams['from'][1]
) {
  let year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number,
    millisecond: number,
    microsecond: number,
    nanosecond: number,
    timeZone,
    offset: string | undefined,
    calendar: string | Temporal.CalendarProtocol | undefined;
  let disambiguation: NonNullable<Temporal.ToInstantOptions['disambiguation']>;
  let offsetOpt: NonNullable<Temporal.OffsetDisambiguationOptions['offset']>;
  let matchMinute = false;
  let offsetBehaviour: OffsetBehaviour = 'option';
  if (IsObject(item)) {
    if (IsTemporalZonedDateTime(item)) return item;
    calendar = GetTemporalCalendarSlotValueWithISODefault(item);
    const fieldNames: (keyof Temporal.ZonedDateTimeLike)[] = CalendarFields(calendar, [
      'day',
      'hour',
      'microsecond',
      'millisecond',
      'minute',
      'month',
      'monthCode',
      'nanosecond',
      'second',
      'year'
    ] as const);
    fieldNames.push('timeZone', 'offset');
    const fields = PrepareTemporalFields(item, fieldNames, ['timeZone']);
    timeZone = ToTemporalTimeZoneSlotValue(fields.timeZone);
    offset = fields.offset;
    if (offset === undefined) {
      offsetBehaviour = 'wall';
    }
    disambiguation = ToTemporalDisambiguation(options);
    offsetOpt = ToTemporalOffset(options, 'reject');
    ({ year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } = InterpretTemporalDateTimeFields(
      calendar,
      fields,
      options
    ));
  } else {
    let ianaName, z;
    ({ year, month, day, hour, minute, second, millisecond, microsecond, nanosecond, ianaName, offset, z, calendar } =
      ParseTemporalZonedDateTimeString(ToString(item)));
    timeZone = ToTemporalTimeZoneSlotValue(ianaName);
    if (z) {
      offsetBehaviour = 'exact';
    } else if (!offset) {
      offsetBehaviour = 'wall';
    }
    if (!calendar) calendar = 'iso8601';
    if (!IsBuiltinCalendar(calendar)) throw new RangeError(`invalid calendar identifier ${calendar}`);
    calendar = ASCIILowercase(calendar);
    matchMinute = true; // ISO strings may specify offset with less precision
    disambiguation = ToTemporalDisambiguation(options);
    offsetOpt = ToTemporalOffset(options, 'reject');
    ToTemporalOverflow(options); // validate and ignore
  }
  let offsetNs = 0;
  // The code above guarantees that if offsetBehaviour === 'option', then
  // `offset` is not undefined.
  if (offsetBehaviour === 'option') offsetNs = ParseTimeZoneOffsetString(offset as string);
  const epochNanoseconds = InterpretISODateTimeOffset(
    year,
    month,
    day,
    hour,
    minute,
    second,
    millisecond,
    microsecond,
    nanosecond,
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
  calendar: CalendarSlot
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
    ObjectDefineProperty(result, '_repr_', {
      value: `${result[Symbol.toStringTag]} <${TemporalDateToString(result)}>`,
      writable: false,
      enumerable: false,
      configurable: false
    });
  }
}

export function CreateTemporalDate(
  isoYear: number,
  isoMonth: number,
  isoDay: number,
  calendar: CalendarSlot = 'iso8601'
) {
  const TemporalPlainDate = GetIntrinsic('%Temporal.PlainDate%');
  const result = ObjectCreate(TemporalPlainDate.prototype);
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
  calendar: CalendarSlot
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
    Object.defineProperty(result, '_repr_', {
      value: `${result[Symbol.toStringTag]} <${TemporalDateTimeToString(result, 'auto')}>`,
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
  calendar: CalendarSlot = 'iso8601'
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
  calendar: CalendarSlot,
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
    Object.defineProperty(result, '_repr_', {
      value: `${result[Symbol.toStringTag]} <${TemporalMonthDayToString(result)}>`,
      writable: false,
      enumerable: false,
      configurable: false
    });
  }
}

export function CreateTemporalMonthDay(
  isoMonth: number,
  isoDay: number,
  calendar: CalendarSlot = 'iso8601',
  referenceISOYear = 1972
) {
  const TemporalPlainMonthDay = GetIntrinsic('%Temporal.PlainMonthDay%');
  const result = ObjectCreate(TemporalPlainMonthDay.prototype);
  CreateTemporalMonthDaySlots(result, isoMonth, isoDay, calendar, referenceISOYear);
  return result;
}

export function CreateTemporalYearMonthSlots(
  result: Temporal.PlainYearMonth,
  isoYear: number,
  isoMonth: number,
  calendar: CalendarSlot,
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
    Object.defineProperty(result, '_repr_', {
      value: `${result[Symbol.toStringTag]} <${TemporalYearMonthToString(result)}>`,
      writable: false,
      enumerable: false,
      configurable: false
    });
  }
}

export function CreateTemporalYearMonth(
  isoYear: number,
  isoMonth: number,
  calendar: CalendarSlot = 'iso8601',
  referenceISODay = 1
) {
  const TemporalPlainYearMonth = GetIntrinsic('%Temporal.PlainYearMonth%');
  const result = ObjectCreate(TemporalPlainYearMonth.prototype);
  CreateTemporalYearMonthSlots(result, isoYear, isoMonth, calendar, referenceISODay);
  return result;
}

export function CreateTemporalZonedDateTimeSlots(
  result: Temporal.ZonedDateTime,
  epochNanoseconds: JSBI,
  timeZone: string | Temporal.TimeZoneProtocol,
  calendar: CalendarSlot
) {
  ValidateEpochNanoseconds(epochNanoseconds);

  CreateSlots(result);
  SetSlot(result, EPOCHNANOSECONDS, epochNanoseconds);
  SetSlot(result, TIME_ZONE, timeZone);
  SetSlot(result, CALENDAR, calendar);

  const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
  const instant = new TemporalInstant(GetSlot(result, EPOCHNANOSECONDS));
  SetSlot(result, INSTANT, instant);

  if (DEBUG) {
    Object.defineProperty(result, '_repr_', {
      value: `${result[Symbol.toStringTag]} <${TemporalZonedDateTimeToString(result, 'auto')}>`,
      writable: false,
      enumerable: false,
      configurable: false
    });
  }
}

export function CreateTemporalZonedDateTime(
  epochNanoseconds: JSBI,
  timeZone: string | Temporal.TimeZoneProtocol,
  calendar: CalendarSlot = 'iso8601'
) {
  const TemporalZonedDateTime = GetIntrinsic('%Temporal.ZonedDateTime%');
  const result = ObjectCreate(TemporalZonedDateTime.prototype);
  CreateTemporalZonedDateTimeSlots(result, epochNanoseconds, timeZone, calendar);
  return result;
}

// TODO: should (can?) we make this generic so the field names are checked
// against the type that the calendar is a property of?
export function CalendarFields<K extends AnyTemporalKey>(calendar: CalendarSlot, fieldNamesParam: ReadonlyArray<K>) {
  if (typeof calendar === 'string') {
    const TemporalCalendar = GetIntrinsic('%Temporal.Calendar%');
    const calendarObj = new TemporalCalendar(calendar);
    return Call(GetIntrinsic('%Temporal.Calendar.prototype.fields%'), calendarObj, [fieldNamesParam]) as K[];
  }
  const fields = GetMethod(calendar, 'fields');
  const fieldNames = Call(fields, calendar, [fieldNamesParam]);
  const result: K[] = [];
  for (const name of fieldNames) {
    if (typeof name !== 'string') throw new TypeError('bad return from calendar.fields()');
    ArrayPrototypePush.call(result, name);
  }
  return result;
}

export function CalendarMergeFields<Base extends Record<string, unknown>, ToAdd extends Record<string, unknown>>(
  calendar: CalendarSlot,
  fields: Base,
  additionalFields: ToAdd
) {
  if (typeof calendar === 'string') {
    const TemporalCalendar = GetIntrinsic('%Temporal.Calendar%');
    const calendarObj = new TemporalCalendar(calendar);
    return Call(GetIntrinsic('%Temporal.Calendar.prototype.mergeFields%'), calendarObj, [
      fields,
      additionalFields
    ]) as Base & ToAdd;
  }
  const mergeFields = GetMethod(calendar, 'mergeFields');
  const result = Call(mergeFields, calendar, [fields, additionalFields]);
  if (!IsObject(result)) throw new TypeError('bad return from calendar.mergeFields()');
  return result as Base & ToAdd;
}

export function CalendarDateAdd(
  calendar: CalendarSlot,
  date: CalendarProtocolParams['dateAdd'][0],
  duration: CalendarProtocolParams['dateAdd'][1],
  options: CalendarProtocolParams['dateAdd'][2],
  dateAddParam?: Temporal.CalendarProtocol['dateAdd'] | undefined
) {
  let dateAdd = dateAddParam;
  if (typeof calendar === 'string') {
    const TemporalCalendar = GetIntrinsic('%Temporal.Calendar%');
    const calendarObj = new TemporalCalendar(calendar);
    return Call(GetIntrinsic('%Temporal.Calendar.prototype.dateAdd%'), calendarObj, [date, duration, options]);
  }
  if (dateAdd === undefined) {
    dateAdd = GetMethod(calendar, 'dateAdd');
  }
  const result = ReflectApply(dateAdd, calendar, [date, duration, options]);
  if (!IsTemporalDate(result)) throw new TypeError('invalid result');
  return result;
}

function CalendarDateUntil(
  calendar: CalendarSlot,
  date: CalendarProtocolParams['dateUntil'][0],
  otherDate: CalendarProtocolParams['dateUntil'][1],
  options: CalendarProtocolParams['dateUntil'][2],
  dateUntilParam?: Temporal.CalendarProtocol['dateUntil'] | undefined
) {
  let dateUntil = dateUntilParam;
  if (typeof calendar === 'string') {
    const TemporalCalendar = GetIntrinsic('%Temporal.Calendar%');
    const calendarObj = new TemporalCalendar(calendar);
    return Call(GetIntrinsic('%Temporal.Calendar.prototype.dateUntil%'), calendarObj, [date, otherDate, options]);
  }
  if (dateUntil === undefined) {
    dateUntil = GetMethod(calendar, 'dateUntil');
  }
  const result = ReflectApply(dateUntil, calendar, [date, otherDate, options]);
  if (!IsTemporalDuration(result)) throw new TypeError('invalid result');
  return result;
}

export function CalendarYear(calendar: CalendarSlot, dateLike: CalendarProtocolParams['year'][0]) {
  if (typeof calendar === 'string') {
    const TemporalCalendar = GetIntrinsic('%Temporal.Calendar%');
    const calendarObj = new TemporalCalendar(calendar);
    return Call(GetIntrinsic('%Temporal.Calendar.prototype.year%'), calendarObj, [dateLike]);
  }
  const year = GetMethod(calendar, 'year');
  let result = Call(year, calendar, [dateLike]);
  if (typeof result !== 'number') {
    throw new TypeError('calendar year result must be an integer');
  }
  if (!IsIntegralNumber(result)) {
    throw new RangeError('calendar year result must be an integer');
  }
  return result;
}

export function CalendarMonth(calendar: CalendarSlot, dateLike: CalendarProtocolParams['month'][0]) {
  if (typeof calendar === 'string') {
    const TemporalCalendar = GetIntrinsic('%Temporal.Calendar%');
    const calendarObj = new TemporalCalendar(calendar);
    return Call(GetIntrinsic('%Temporal.Calendar.prototype.month%'), calendarObj, [dateLike]);
  }
  const month = GetMethod(calendar, 'month');
  let result = Call(month, calendar, [dateLike]);
  if (typeof result !== 'number') {
    throw new TypeError('calendar month result must be a positive integer');
  }
  if (!IsIntegralNumber(result) || result < 1) {
    throw new RangeError('calendar month result must be a positive integer');
  }
  return result;
}

export function CalendarMonthCode(calendar: CalendarSlot, dateLike: CalendarProtocolParams['monthCode'][0]) {
  if (typeof calendar === 'string') {
    const TemporalCalendar = GetIntrinsic('%Temporal.Calendar%');
    const calendarObj = new TemporalCalendar(calendar);
    return Call(GetIntrinsic('%Temporal.Calendar.prototype.monthCode%'), calendarObj, [dateLike]);
  }
  const monthCode = GetMethod(calendar, 'monthCode');
  let result = Call(monthCode, calendar, [dateLike]);
  if (typeof result !== 'string') {
    throw new TypeError('calendar monthCode result must be a string');
  }
  return result;
}

export function CalendarDay(calendar: CalendarSlot, dateLike: CalendarProtocolParams['era'][0]) {
  if (typeof calendar === 'string') {
    const TemporalCalendar = GetIntrinsic('%Temporal.Calendar%');
    const calendarObj = new TemporalCalendar(calendar);
    return Call(GetIntrinsic('%Temporal.Calendar.prototype.day%'), calendarObj, [dateLike]);
  }
  const day = GetMethod(calendar, 'day');
  const result = Call(day, calendar, [dateLike]);
  if (typeof result !== 'number') {
    throw new TypeError('calendar day result must be a positive integer');
  }
  if (!IsIntegralNumber(result) || result < 1) {
    throw new RangeError('calendar day result must be a positive integer');
  }
  return result;
}

export function CalendarEra(calendar: CalendarSlot, dateLike: CalendarProtocolParams['era'][0]) {
  if (typeof calendar === 'string') {
    const TemporalCalendar = GetIntrinsic('%Temporal.Calendar%');
    const calendarObj = new TemporalCalendar(calendar);
    return Call(GetIntrinsic('%Temporal.Calendar.prototype.era%'), calendarObj, [dateLike]);
  }
  const era = GetMethod(calendar, 'era');
  let result = Call(era, calendar, [dateLike]);
  if (result === undefined) {
    return result;
  }
  if (typeof result !== 'string') {
    throw new TypeError('calendar era result must be a string or undefined');
  }
  return result;
}

export function CalendarEraYear(calendar: CalendarSlot, dateLike: CalendarProtocolParams['era'][0]) {
  if (typeof calendar === 'string') {
    const TemporalCalendar = GetIntrinsic('%Temporal.Calendar%');
    const calendarObj = new TemporalCalendar(calendar);
    return Call(GetIntrinsic('%Temporal.Calendar.prototype.eraYear%'), calendarObj, [dateLike]);
  }
  const eraYear = GetMethod(calendar, 'eraYear');
  let result = Call(eraYear, calendar, [dateLike]);
  if (result === undefined) {
    return result;
  }
  if (typeof result !== 'number') {
    throw new TypeError('calendar eraYear result must be an integer or undefined');
  }
  if (!IsIntegralNumber(result)) {
    throw new RangeError('calendar eraYear result must be an integer or undefined');
  }
  return result;
}

export function CalendarDayOfWeek(calendar: CalendarSlot, dateLike: CalendarProtocolParams['era'][0]) {
  if (typeof calendar === 'string') {
    const TemporalCalendar = GetIntrinsic('%Temporal.Calendar%');
    const calendarObj = new TemporalCalendar(calendar);
    return Call(GetIntrinsic('%Temporal.Calendar.prototype.dayOfWeek%'), calendarObj, [dateLike]);
  }
  const dayOfWeek = GetMethod(calendar, 'dayOfWeek');
  const result = Call(dayOfWeek, calendar, [dateLike]);
  if (typeof result !== 'number') {
    throw new TypeError('calendar dayOfWeek result must be a positive integer');
  }
  if (!IsIntegralNumber(result) || result < 1) {
    throw new RangeError('calendar dayOfWeek result must be a positive integer');
  }
  return result;
}

export function CalendarDayOfYear(calendar: CalendarSlot, dateLike: CalendarProtocolParams['era'][0]) {
  if (typeof calendar === 'string') {
    const TemporalCalendar = GetIntrinsic('%Temporal.Calendar%');
    const calendarObj = new TemporalCalendar(calendar);
    return Call(GetIntrinsic('%Temporal.Calendar.prototype.dayOfYear%'), calendarObj, [dateLike]);
  }
  const dayOfYear = GetMethod(calendar, 'dayOfYear');
  const result = Call(dayOfYear, calendar, [dateLike]);
  if (typeof result !== 'number') {
    throw new TypeError('calendar dayOfYear result must be a positive integer');
  }
  if (!IsIntegralNumber(result) || result < 1) {
    throw new RangeError('calendar dayOfYear result must be a positive integer');
  }
  return result;
}

export function CalendarWeekOfYear(calendar: CalendarSlot, dateLike: CalendarProtocolParams['era'][0]) {
  if (typeof calendar === 'string') {
    const TemporalCalendar = GetIntrinsic('%Temporal.Calendar%');
    const calendarObj = new TemporalCalendar(calendar);
    return Call(GetIntrinsic('%Temporal.Calendar.prototype.weekOfYear%'), calendarObj, [dateLike]);
  }
  const weekOfYear = GetMethod(calendar, 'weekOfYear');
  const result = Call(weekOfYear, calendar, [dateLike]);
  if (typeof result !== 'number') {
    throw new TypeError('calendar weekOfYear result must be a positive integer');
  }
  if (!IsIntegralNumber(result) || result < 1) {
    throw new RangeError('calendar weekOfYear result must be a positive integer');
  }
  return result;
}

export function CalendarYearOfWeek(calendar: CalendarSlot, dateLike: CalendarProtocolParams['era'][0]) {
  if (typeof calendar === 'string') {
    const TemporalCalendar = GetIntrinsic('%Temporal.Calendar%');
    const calendarObj = new TemporalCalendar(calendar);
    return Call(GetIntrinsic('%Temporal.Calendar.prototype.yearOfWeek%'), calendarObj, [dateLike]);
  }
  const yearOfWeek = GetMethod(calendar, 'yearOfWeek');
  const result = Call(yearOfWeek, calendar, [dateLike]);
  if (typeof result !== 'number') {
    throw new TypeError('calendar yearOfWeek result must be an integer');
  }
  if (!IsIntegralNumber(result)) {
    throw new RangeError('calendar yearOfWeek result must be an integer');
  }
  return result;
}

export function CalendarDaysInWeek(calendar: CalendarSlot, dateLike: CalendarProtocolParams['era'][0]) {
  if (typeof calendar === 'string') {
    const TemporalCalendar = GetIntrinsic('%Temporal.Calendar%');
    const calendarObj = new TemporalCalendar(calendar);
    return Call(GetIntrinsic('%Temporal.Calendar.prototype.daysInWeek%'), calendarObj, [dateLike]);
  }
  const daysInWeek = GetMethod(calendar, 'daysInWeek');
  const result = Call(daysInWeek, calendar, [dateLike]);
  if (typeof result !== 'number') {
    throw new TypeError('calendar daysInWeek result must be a positive integer');
  }
  if (!IsIntegralNumber(result) || result < 1) {
    throw new RangeError('calendar daysInWeek result must be a positive integer');
  }
  return result;
}

export function CalendarDaysInMonth(calendar: CalendarSlot, dateLike: CalendarProtocolParams['era'][0]) {
  if (typeof calendar === 'string') {
    const TemporalCalendar = GetIntrinsic('%Temporal.Calendar%');
    const calendarObj = new TemporalCalendar(calendar);
    return Call(GetIntrinsic('%Temporal.Calendar.prototype.daysInMonth%'), calendarObj, [dateLike]);
  }
  const daysInMonth = GetMethod(calendar, 'daysInMonth');
  const result = Call(daysInMonth, calendar, [dateLike]);
  if (typeof result !== 'number') {
    throw new TypeError('calendar daysInMonth result must be a positive integer');
  }
  if (!IsIntegralNumber(result) || result < 1) {
    throw new RangeError('calendar daysInMonth result must be a positive integer');
  }
  return result;
}

export function CalendarDaysInYear(calendar: CalendarSlot, dateLike: CalendarProtocolParams['era'][0]) {
  if (typeof calendar === 'string') {
    const TemporalCalendar = GetIntrinsic('%Temporal.Calendar%');
    const calendarObj = new TemporalCalendar(calendar);
    return Call(GetIntrinsic('%Temporal.Calendar.prototype.daysInYear%'), calendarObj, [dateLike]);
  }
  const daysInYear = GetMethod(calendar, 'daysInYear');
  const result = Call(daysInYear, calendar, [dateLike]);
  if (typeof result !== 'number') {
    throw new TypeError('calendar daysInYear result must be a positive integer');
  }
  if (!IsIntegralNumber(result) || result < 1) {
    throw new RangeError('calendar daysInYear result must be a positive integer');
  }
  return result;
}

export function CalendarMonthsInYear(calendar: CalendarSlot, dateLike: CalendarProtocolParams['era'][0]) {
  if (typeof calendar === 'string') {
    const TemporalCalendar = GetIntrinsic('%Temporal.Calendar%');
    const calendarObj = new TemporalCalendar(calendar);
    return Call(GetIntrinsic('%Temporal.Calendar.prototype.monthsInYear%'), calendarObj, [dateLike]);
  }
  const monthsInYear = GetMethod(calendar, 'monthsInYear');
  const result = Call(monthsInYear, calendar, [dateLike]);
  if (typeof result !== 'number') {
    throw new TypeError('calendar monthsInYear result must be a positive integer');
  }
  if (!IsIntegralNumber(result) || result < 1) {
    throw new RangeError('calendar monthsInYear result must be a positive integer');
  }
  return result;
}

export function CalendarInLeapYear(calendar: CalendarSlot, dateLike: CalendarProtocolParams['era'][0]) {
  if (typeof calendar === 'string') {
    const TemporalCalendar = GetIntrinsic('%Temporal.Calendar%');
    const calendarObj = new TemporalCalendar(calendar);
    return Call(GetIntrinsic('%Temporal.Calendar.prototype.inLeapYear%'), calendarObj, [dateLike]);
  }
  const inLeapYear = GetMethod(calendar, 'inLeapYear');
  const result = Call(inLeapYear, calendar, [dateLike]);
  if (typeof result !== 'boolean') {
    throw new TypeError('calendar inLeapYear result must be a boolean');
  }
  return result;
}

type MaybeCalendarProtocol = Partial<Omit<Temporal.CalendarProtocol, 'toString' | 'toJSON'>>;
function ObjectImplementsTemporalCalendarProtocol(object: MaybeCalendarProtocol) {
  if (IsTemporalCalendar(object)) return true;
  return (
    'dateAdd' in object &&
    'dateFromFields' in object &&
    'dateUntil' in object &&
    'day' in object &&
    'dayOfWeek' in object &&
    'dayOfYear' in object &&
    'daysInMonth' in object &&
    'daysInWeek' in object &&
    'daysInYear' in object &&
    'fields' in object &&
    'id' in object &&
    'inLeapYear' in object &&
    'mergeFields' in object &&
    'month' in object &&
    'monthCode' in object &&
    'monthDayFromFields' in object &&
    'monthsInYear' in object &&
    'weekOfYear' in object &&
    'year' in object &&
    'yearMonthFromFields' in object &&
    'yearOfWeek' in object
  );
}

export function ToTemporalCalendarSlotValue(calendarLike: string): string;
export function ToTemporalCalendarSlotValue(calendarLike: Temporal.CalendarProtocol): Temporal.CalendarProtocol;
export function ToTemporalCalendarSlotValue(calendarLike: Temporal.CalendarLike): string | Temporal.CalendarProtocol;
export function ToTemporalCalendarSlotValue(calendarLike: CalendarParams['from'][0]) {
  if (IsObject(calendarLike)) {
    if (HasSlot(calendarLike, CALENDAR)) return GetSlot(calendarLike, CALENDAR);
    if (!ObjectImplementsTemporalCalendarProtocol(calendarLike)) {
      throw new TypeError('expected a Temporal.Calendar or object implementing the Temporal.Calendar protocol');
    }
    return calendarLike;
  }
  const identifier = ToString(calendarLike);
  if (IsBuiltinCalendar(identifier)) return ASCIILowercase(identifier);
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
  return ASCIILowercase(calendar);
}

function GetTemporalCalendarSlotValueWithISODefault(item: { calendar?: Temporal.CalendarLike }): CalendarSlot {
  if (HasSlot(item, CALENDAR)) return GetSlot(item, CALENDAR);
  const { calendar } = item;
  if (calendar === undefined) return 'iso8601';
  return ToTemporalCalendarSlotValue(calendar);
}

export function ToTemporalCalendarIdentifier(slotValue: CalendarSlot) {
  if (typeof slotValue === 'string') return slotValue;
  const result = slotValue.id;
  if (typeof result !== 'string') throw new TypeError('calendar.id should be a string');
  return result;
}

export function ToTemporalCalendarObject(slotValue: CalendarSlot) {
  if (IsObject(slotValue)) return slotValue;
  const TemporalCalendar = GetIntrinsic('%Temporal.Calendar%');
  return new TemporalCalendar(slotValue);
}

export function CalendarEquals(one: CalendarSlot, two: CalendarSlot) {
  if (one === two) return true;
  const cal1 = ToTemporalCalendarIdentifier(one);
  const cal2 = ToTemporalCalendarIdentifier(two);
  return cal1 === cal2;
}

// This operation is not in the spec, it implements the following:
// "If ? CalendarEquals(one, two) is false, throw a RangeError exception."
// This is so that we can build an informative error message without
// re-getting the .id properties.
function ThrowIfCalendarsNotEqual(one: CalendarSlot, two: CalendarSlot, errorMessageAction: string) {
  if (one === two) return;
  const cal1 = ToTemporalCalendarIdentifier(one);
  const cal2 = ToTemporalCalendarIdentifier(two);
  if (cal1 !== cal2) {
    throw new RangeError(`cannot ${errorMessageAction} of ${cal1} and ${cal2} calendars`);
  }
}

export function ConsolidateCalendars(one: CalendarSlot, two: CalendarSlot) {
  if (one === two) return two;
  const sOne = ToTemporalCalendarIdentifier(one);
  const sTwo = ToTemporalCalendarIdentifier(two);
  if (sOne === sTwo || sOne === 'iso8601') {
    return two;
  } else if (sTwo === 'iso8601') {
    return one;
  } else {
    throw new RangeError('irreconcilable calendars');
  }
}

export function CalendarDateFromFields(
  calendar: CalendarSlot,
  fields: CalendarProtocolParams['dateFromFields'][0],
  options?: Partial<CalendarProtocolParams['dateFromFields'][1]>,
  dateFromFieldsParam?: Temporal.CalendarProtocol['dateFromFields']
) {
  if (typeof calendar === 'string') {
    const TemporalCalendar = GetIntrinsic('%Temporal.Calendar%');
    const calendarObj = new TemporalCalendar(calendar);
    return Call(GetIntrinsic('%Temporal.Calendar.prototype.dateFromFields%'), calendarObj, [fields, options]);
  }
  const dateFromFields = dateFromFieldsParam ?? GetMethod(calendar, 'dateFromFields');
  const result = Call(dateFromFields, calendar, [fields, options]);
  if (!IsTemporalDate(result)) throw new TypeError('invalid result');
  return result;
}

export function CalendarYearMonthFromFields(
  calendar: CalendarSlot,
  fields: CalendarProtocolParams['yearMonthFromFields'][0],
  options?: CalendarProtocolParams['yearMonthFromFields'][1]
) {
  if (typeof calendar === 'string') {
    const TemporalCalendar = GetIntrinsic('%Temporal.Calendar%');
    const calendarObj = new TemporalCalendar(calendar);
    return Call(GetIntrinsic('%Temporal.Calendar.prototype.yearMonthFromFields%'), calendarObj, [fields, options]);
  }
  const yearMonthFromFields = GetMethod(calendar, 'yearMonthFromFields');
  let result = Call(yearMonthFromFields, calendar, [fields, options]);
  if (!IsTemporalYearMonth(result)) throw new TypeError('invalid result');
  return result;
}

export function CalendarMonthDayFromFields(
  calendar: CalendarSlot,
  fields: CalendarProtocolParams['monthDayFromFields'][0],
  options?: CalendarProtocolParams['monthDayFromFields'][1]
) {
  if (typeof calendar === 'string') {
    const TemporalCalendar = GetIntrinsic('%Temporal.Calendar%');
    const calendarObj = new TemporalCalendar(calendar);
    return Call(GetIntrinsic('%Temporal.Calendar.prototype.monthDayFromFields%'), calendarObj, [fields, options]);
  }
  const monthDayFromFields = GetMethod(calendar, 'monthDayFromFields');
  let result = Call(monthDayFromFields, calendar, [fields, options]);
  if (!IsTemporalMonthDay(result)) throw new TypeError('invalid result');
  return result;
}

type MaybeTimeZoneProtocol = Partial<
  Pick<Temporal.TimeZoneProtocol, 'getOffsetNanosecondsFor' | 'getPossibleInstantsFor'>
>;
function ObjectImplementsTemporalTimeZoneProtocol(object: MaybeTimeZoneProtocol) {
  if (IsTemporalTimeZone(object)) return true;
  return 'getOffsetNanosecondsFor' in object && 'getPossibleInstantsFor' in object && 'id' in object;
}

export function ToTemporalTimeZoneSlotValue(temporalTimeZoneLike: string): string;
export function ToTemporalTimeZoneSlotValue(temporalTimeZoneLike: Temporal.TimeZoneProtocol): Temporal.TimeZoneProtocol;
export function ToTemporalTimeZoneSlotValue(
  temporalTimeZoneLike: Temporal.TimeZoneLike
): string | Temporal.TimeZoneProtocol;
export function ToTemporalTimeZoneSlotValue(temporalTimeZoneLike: TimeZoneParams['from'][0]) {
  if (IsObject(temporalTimeZoneLike)) {
    if (IsTemporalZonedDateTime(temporalTimeZoneLike)) return GetSlot(temporalTimeZoneLike, TIME_ZONE);
    if (!ObjectImplementsTemporalTimeZoneProtocol(temporalTimeZoneLike)) {
      throw new TypeError('expected a Temporal.TimeZone or object implementing the Temporal.TimeZone protocol');
    }
    return temporalTimeZoneLike;
  }
  const identifier = ToString(temporalTimeZoneLike);
  return ParseTemporalTimeZone(identifier);
}

export function ToTemporalTimeZoneIdentifier(slotValue: TimeZoneSlot) {
  if (typeof slotValue === 'string') return slotValue;
  const result = slotValue.id;
  if (typeof result !== 'string') throw new TypeError('timeZone.id should be a string');
  return result;
}

export function ToTemporalTimeZoneObject(slotValue: TimeZoneSlot) {
  if (IsObject(slotValue)) return slotValue;
  const TemporalTimeZone = GetIntrinsic('%Temporal.TimeZone%');
  return new TemporalTimeZone(slotValue);
}

export function TimeZoneEquals(one: string | Temporal.TimeZoneProtocol, two: string | Temporal.TimeZoneProtocol) {
  if (one === two) return true;
  const tz1 = ToTemporalTimeZoneIdentifier(one);
  const tz2 = ToTemporalTimeZoneIdentifier(two);
  return tz1 === tz2;
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

export function GetOffsetNanosecondsFor(
  timeZone: string | Temporal.TimeZoneProtocol,
  instant: TimeZoneProtocolParams['getOffsetNanosecondsFor'][0],
  getOffsetNanosecondsForParam?: Temporal.TimeZoneProtocol['getOffsetNanosecondsFor']
) {
  if (typeof timeZone === 'string') {
    const TemporalTimeZone = GetIntrinsic('%Temporal.TimeZone%');
    const timeZoneObject = new TemporalTimeZone(timeZone);
    return Call(GetIntrinsic('%Temporal.TimeZone.prototype.getOffsetNanosecondsFor%'), timeZoneObject, [instant]);
  }
  const getOffsetNanosecondsFor = getOffsetNanosecondsForParam ?? GetMethod(timeZone, 'getOffsetNanosecondsFor');
  const offsetNs = Call(getOffsetNanosecondsFor, timeZone, [instant]);
  if (typeof offsetNs !== 'number') {
    throw new TypeError('bad return from getOffsetNanosecondsFor');
  }
  if (!IsIntegralNumber(offsetNs) || MathAbs(offsetNs) >= 86400e9) {
    throw new RangeError('out-of-range return from getOffsetNanosecondsFor');
  }
  return offsetNs;
}

export function GetOffsetStringFor(timeZone: string | Temporal.TimeZoneProtocol, instant: Temporal.Instant) {
  const offsetNs = GetOffsetNanosecondsFor(timeZone, instant);
  return FormatTimeZoneOffsetString(offsetNs);
}

export function GetPlainDateTimeFor(
  timeZone: string | Temporal.TimeZoneProtocol,
  instant: Temporal.Instant,
  calendar: CalendarSlot
) {
  const ns = GetSlot(instant, EPOCHNANOSECONDS);
  const offsetNs = GetOffsetNanosecondsFor(timeZone, instant);
  let { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } = GetISOPartsFromEpoch(ns);
  ({ year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } = BalanceISODateTime(
    year,
    month,
    day,
    hour,
    minute,
    second,
    millisecond,
    microsecond,
    nanosecond + offsetNs
  ));
  return CreateTemporalDateTime(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond, calendar);
}

export function GetInstantFor(
  timeZone: string | Temporal.TimeZoneProtocol,
  dateTime: Temporal.PlainDateTime,
  disambiguation: NonNullable<Temporal.ToInstantOptions['disambiguation']>
) {
  const possibleInstants = GetPossibleInstantsFor(timeZone, dateTime);
  return DisambiguatePossibleInstants(possibleInstants, timeZone, dateTime, disambiguation);
}

function DisambiguatePossibleInstants(
  possibleInstants: Temporal.Instant[],
  timeZone: string | Temporal.TimeZoneProtocol,
  dateTime: Temporal.PlainDateTime,
  disambiguation: NonNullable<Temporal.ToInstantOptions['disambiguation']>
) {
  const Instant = GetIntrinsic('%Temporal.Instant%');
  const numInstants = possibleInstants.length;

  if (numInstants === 1) return possibleInstants[0];
  if (numInstants) {
    switch (disambiguation) {
      case 'compatible':
      // fall through because 'compatible' means 'earlier' for "fall back" transitions
      case 'earlier':
        return possibleInstants[0];
      case 'later':
        return possibleInstants[numInstants - 1];
      case 'reject': {
        throw new RangeError('multiple instants found');
      }
    }
  }

  const year = GetSlot(dateTime, ISO_YEAR);
  const month = GetSlot(dateTime, ISO_MONTH);
  const day = GetSlot(dateTime, ISO_DAY);
  const hour = GetSlot(dateTime, ISO_HOUR);
  const minute = GetSlot(dateTime, ISO_MINUTE);
  const second = GetSlot(dateTime, ISO_SECOND);
  const millisecond = GetSlot(dateTime, ISO_MILLISECOND);
  const microsecond = GetSlot(dateTime, ISO_MICROSECOND);
  const nanosecond = GetSlot(dateTime, ISO_NANOSECOND);
  const utcns = GetUTCEpochNanoseconds(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond);
  if (utcns === null) throw new RangeError('DateTime outside of supported range');
  const dayBefore = new Instant(JSBI.subtract(utcns, DAY_NANOS));
  const dayAfter = new Instant(JSBI.add(utcns, DAY_NANOS));
  const offsetBefore = GetOffsetNanosecondsFor(timeZone, dayBefore);
  const offsetAfter = GetOffsetNanosecondsFor(timeZone, dayAfter);
  const nanoseconds = offsetAfter - offsetBefore;
  switch (disambiguation) {
    case 'earlier': {
      const calendar = GetSlot(dateTime, CALENDAR);
      const PlainDateTime = GetIntrinsic('%Temporal.PlainDateTime%');
      const earlier = AddDateTime(
        year,
        month,
        day,
        hour,
        minute,
        second,
        millisecond,
        microsecond,
        nanosecond,
        calendar,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        -nanoseconds,
        undefined
      );
      const earlierPlainDateTime = new PlainDateTime(
        earlier.year,
        earlier.month,
        earlier.day,
        earlier.hour,
        earlier.minute,
        earlier.second,
        earlier.millisecond,
        earlier.microsecond,
        earlier.nanosecond,
        calendar
      );
      return GetPossibleInstantsFor(timeZone, earlierPlainDateTime)[0];
    }
    case 'compatible':
    // fall through because 'compatible' means 'later' for "spring forward" transitions
    case 'later': {
      const calendar = GetSlot(dateTime, CALENDAR);
      const PlainDateTime = GetIntrinsic('%Temporal.PlainDateTime%');
      const later = AddDateTime(
        year,
        month,
        day,
        hour,
        minute,
        second,
        millisecond,
        microsecond,
        nanosecond,
        calendar,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        nanoseconds,
        undefined
      );
      const laterPlainDateTime = new PlainDateTime(
        later.year,
        later.month,
        later.day,
        later.hour,
        later.minute,
        later.second,
        later.millisecond,
        later.microsecond,
        later.nanosecond,
        calendar
      );
      const possible = GetPossibleInstantsFor(timeZone, laterPlainDateTime);
      return possible[possible.length - 1];
    }
    case 'reject': {
      throw new RangeError('no such instant found');
    }
  }
}

function GetPossibleInstantsFor(
  timeZone: string | Temporal.TimeZoneProtocol,
  dateTime: TimeZoneProtocolParams['getPossibleInstantsFor'][0],
  getPossibleInstantsForParam?: Temporal.TimeZoneProtocol['getPossibleInstantsFor']
) {
  if (typeof timeZone === 'string') {
    const TemporalTimeZone = GetIntrinsic('%Temporal.TimeZone%');
    const timeZoneObject = new TemporalTimeZone(timeZone);
    return Call(GetIntrinsic('%Temporal.TimeZone.prototype.getPossibleInstantsFor%'), timeZoneObject, [dateTime]);
  }
  const getPossibleInstantsFor = getPossibleInstantsForParam ?? GetMethod(timeZone, 'getPossibleInstantsFor');
  const possibleInstants = Call(getPossibleInstantsFor, timeZone, [dateTime]);
  const result: Temporal.Instant[] = [];
  for (const instant of possibleInstants) {
    if (!IsTemporalInstant(instant)) {
      throw new TypeError('bad return from getPossibleInstantsFor');
    }
    ArrayPrototypePush.call(result, instant);
  }
  return result;
}

export function ISOYearString(year: number) {
  let yearString;
  if (year < 0 || year > 9999) {
    const sign = year < 0 ? '-' : '+';
    const yearNumber = MathAbs(year);
    yearString = sign + `000000${yearNumber}`.slice(-6);
  } else {
    yearString = `0000${year}`.slice(-4);
  }
  return yearString;
}

export function ISODateTimePartString(part: number) {
  return `00${part}`.slice(-2);
}
export function FormatSecondsStringPart(
  second: number,
  millisecond: number,
  microsecond: number,
  nanosecond: number,
  precision: ReturnType<typeof ToSecondsStringPrecisionRecord>['precision']
) {
  if (precision === 'minute') return '';

  const secs = `:${ISODateTimePartString(second)}`;
  let fractionNumber = millisecond * 1e6 + microsecond * 1e3 + nanosecond;
  let fraction: string;

  if (precision === 'auto') {
    if (fractionNumber === 0) return secs;
    fraction = `${fractionNumber}`.padStart(9, '0');
    while (fraction[fraction.length - 1] === '0') fraction = fraction.slice(0, -1);
  } else {
    if (precision === 0) return secs;
    fraction = `${fractionNumber}`.padStart(9, '0').slice(0, precision);
  }
  return `${secs}.${fraction}`;
}

export function TemporalInstantToString(
  instant: Temporal.Instant,
  timeZone: string | Temporal.TimeZoneProtocol | undefined,
  precision: ReturnType<typeof ToSecondsStringPrecisionRecord>['precision']
) {
  let outputTimeZone = timeZone;
  if (outputTimeZone === undefined) outputTimeZone = 'UTC';
  const dateTime = GetPlainDateTimeFor(outputTimeZone, instant, 'iso8601');
  const year = ISOYearString(GetSlot(dateTime, ISO_YEAR));
  const month = ISODateTimePartString(GetSlot(dateTime, ISO_MONTH));
  const day = ISODateTimePartString(GetSlot(dateTime, ISO_DAY));
  const hour = ISODateTimePartString(GetSlot(dateTime, ISO_HOUR));
  const minute = ISODateTimePartString(GetSlot(dateTime, ISO_MINUTE));
  const seconds = FormatSecondsStringPart(
    GetSlot(dateTime, ISO_SECOND),
    GetSlot(dateTime, ISO_MILLISECOND),
    GetSlot(dateTime, ISO_MICROSECOND),
    GetSlot(dateTime, ISO_NANOSECOND),
    precision
  );
  let timeZoneString = 'Z';
  if (timeZone !== undefined) {
    const offsetNs = GetOffsetNanosecondsFor(outputTimeZone, instant);
    timeZoneString = FormatISOTimeZoneOffsetString(offsetNs);
  }
  return `${year}-${month}-${day}T${hour}:${minute}${seconds}${timeZoneString}`;
}

interface ToStringOptions {
  unit: ReturnType<typeof ToSecondsStringPrecisionRecord>['unit'];
  increment: number;
  roundingMode: ReturnType<typeof ToTemporalRoundingMode>;
}

export function TemporalDurationToString(
  duration: Temporal.Duration,
  precision: Temporal.ToStringPrecisionOptions['fractionalSecondDigits'] = 'auto',
  options: ToStringOptions | undefined = undefined
) {
  function formatNumber(num: number) {
    if (num <= NumberMaxSafeInteger) return num.toString(10);
    return JSBI.BigInt(num).toString(10);
  }

  const years = GetSlot(duration, YEARS);
  const months = GetSlot(duration, MONTHS);
  const weeks = GetSlot(duration, WEEKS);
  const days = GetSlot(duration, DAYS);
  const hours = GetSlot(duration, HOURS);
  const minutes = GetSlot(duration, MINUTES);
  let seconds = GetSlot(duration, SECONDS);
  let ms = GetSlot(duration, MILLISECONDS);
  let µs = GetSlot(duration, MICROSECONDS);
  let ns = GetSlot(duration, NANOSECONDS);
  const sign = DurationSign(years, months, weeks, days, hours, minutes, seconds, ms, µs, ns);

  if (options) {
    const { unit, increment, roundingMode } = options;
    ({
      seconds,
      milliseconds: ms,
      microseconds: µs,
      nanoseconds: ns
    } = RoundDuration(0, 0, 0, 0, 0, 0, seconds, ms, µs, ns, increment, unit, roundingMode));
  }

  const dateParts: string[] = [];
  if (years) dateParts.push(`${formatNumber(MathAbs(years))}Y`);
  if (months) dateParts.push(`${formatNumber(MathAbs(months))}M`);
  if (weeks) dateParts.push(`${formatNumber(MathAbs(weeks))}W`);
  if (days) dateParts.push(`${formatNumber(MathAbs(days))}D`);

  const timeParts: string[] = [];
  if (hours) timeParts.push(`${formatNumber(MathAbs(hours))}H`);
  if (minutes) timeParts.push(`${formatNumber(MathAbs(minutes))}M`);

  const secondParts: string[] = [];
  let total = TotalDurationNanoseconds(0, 0, 0, seconds, ms, µs, ns, 0);
  let nsBigInt: JSBI, µsBigInt: JSBI, msBigInt: JSBI, secondsBigInt: JSBI;
  ({ quotient: total, remainder: nsBigInt } = divmod(total, THOUSAND));
  ({ quotient: total, remainder: µsBigInt } = divmod(total, THOUSAND));
  ({ quotient: secondsBigInt, remainder: msBigInt } = divmod(total, THOUSAND));
  const fraction =
    MathAbs(JSBI.toNumber(msBigInt)) * 1e6 + MathAbs(JSBI.toNumber(µsBigInt)) * 1e3 + MathAbs(JSBI.toNumber(nsBigInt));
  let decimalPart;
  if (precision === 'auto') {
    if (fraction !== 0) {
      decimalPart = `${fraction}`.padStart(9, '0');
      while (decimalPart[decimalPart.length - 1] === '0') {
        decimalPart = decimalPart.slice(0, -1);
      }
    }
  } else if (precision !== 0) {
    decimalPart = `${fraction}`.padStart(9, '0').slice(0, precision);
  }
  if (decimalPart) secondParts.unshift('.', decimalPart);
  if (!JSBI.equal(secondsBigInt, ZERO) || secondParts.length || precision !== 'auto') {
    secondParts.unshift(abs(secondsBigInt).toString());
  }
  if (secondParts.length) timeParts.push(`${secondParts.join('')}S`);
  if (timeParts.length) timeParts.unshift('T');
  if (!dateParts.length && !timeParts.length) return 'PT0S';
  return `${sign < 0 ? '-' : ''}P${dateParts.join('')}${timeParts.join('')}`;
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
  dateTime: Temporal.PlainDateTime,
  precision: ReturnType<typeof ToSecondsStringPrecisionRecord>['precision'],
  showCalendar: ReturnType<typeof ToCalendarNameOption> = 'auto',
  options: ToStringOptions | undefined = undefined
) {
  let year = GetSlot(dateTime, ISO_YEAR);
  let month = GetSlot(dateTime, ISO_MONTH);
  let day = GetSlot(dateTime, ISO_DAY);
  let hour = GetSlot(dateTime, ISO_HOUR);
  let minute = GetSlot(dateTime, ISO_MINUTE);
  let second = GetSlot(dateTime, ISO_SECOND);
  let millisecond = GetSlot(dateTime, ISO_MILLISECOND);
  let microsecond = GetSlot(dateTime, ISO_MICROSECOND);
  let nanosecond = GetSlot(dateTime, ISO_NANOSECOND);

  if (options) {
    const { unit, increment, roundingMode } = options;
    ({ year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } = RoundISODateTime(
      year,
      month,
      day,
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond,
      increment,
      unit,
      roundingMode
    ));
  }

  const yearString = ISOYearString(year);
  const monthString = ISODateTimePartString(month);
  const dayString = ISODateTimePartString(day);
  const hourString = ISODateTimePartString(hour);
  const minuteString = ISODateTimePartString(minute);
  const secondsString = FormatSecondsStringPart(second, millisecond, microsecond, nanosecond, precision);
  const calendar = MaybeFormatCalendarAnnotation(GetSlot(dateTime, CALENDAR), showCalendar);
  return `${yearString}-${monthString}-${dayString}T${hourString}:${minuteString}${secondsString}${calendar}`;
}

export function TemporalMonthDayToString(
  monthDay: Temporal.PlainMonthDay,
  showCalendar: Temporal.ShowCalendarOption['calendarName'] = 'auto'
) {
  const month = ISODateTimePartString(GetSlot(monthDay, ISO_MONTH));
  const day = ISODateTimePartString(GetSlot(monthDay, ISO_DAY));
  let resultString = `${month}-${day}`;
  const calendar = GetSlot(monthDay, CALENDAR);
  const calendarID = ToTemporalCalendarIdentifier(calendar);
  if (showCalendar === 'always' || showCalendar === 'critical' || calendarID !== 'iso8601') {
    const year = ISOYearString(GetSlot(monthDay, ISO_YEAR));
    resultString = `${year}-${resultString}`;
  }
  const calendarString = FormatCalendarAnnotation(calendarID, showCalendar);
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
  const calendarID = ToTemporalCalendarIdentifier(calendar);
  if (showCalendar === 'always' || showCalendar === 'critical' || calendarID !== 'iso8601') {
    const day = ISODateTimePartString(GetSlot(yearMonth, ISO_DAY));
    resultString += `-${day}`;
  }
  const calendarString = FormatCalendarAnnotation(calendarID, showCalendar);
  if (calendarString) resultString += calendarString;
  return resultString;
}

export function TemporalZonedDateTimeToString(
  zdt: Temporal.ZonedDateTime,
  precision: ReturnType<typeof ToSecondsStringPrecisionRecord>['precision'],
  showCalendar: ReturnType<typeof ToCalendarNameOption> = 'auto',
  showTimeZone: ReturnType<typeof ToTimeZoneNameOption> = 'auto',
  showOffset: ReturnType<typeof ToShowOffsetOption> = 'auto',
  options: ToStringOptions | undefined = undefined
) {
  let instant = GetSlot(zdt, INSTANT);

  if (options) {
    const { unit, increment, roundingMode } = options;
    const ns = RoundInstant(GetSlot(zdt, EPOCHNANOSECONDS), increment, unit, roundingMode);
    const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
    instant = new TemporalInstant(ns);
  }

  const tz = GetSlot(zdt, TIME_ZONE);
  const dateTime = GetPlainDateTimeFor(tz, instant, 'iso8601');

  const year = ISOYearString(GetSlot(dateTime, ISO_YEAR));
  const month = ISODateTimePartString(GetSlot(dateTime, ISO_MONTH));
  const day = ISODateTimePartString(GetSlot(dateTime, ISO_DAY));
  const hour = ISODateTimePartString(GetSlot(dateTime, ISO_HOUR));
  const minute = ISODateTimePartString(GetSlot(dateTime, ISO_MINUTE));
  const seconds = FormatSecondsStringPart(
    GetSlot(dateTime, ISO_SECOND),
    GetSlot(dateTime, ISO_MILLISECOND),
    GetSlot(dateTime, ISO_MICROSECOND),
    GetSlot(dateTime, ISO_NANOSECOND),
    precision
  );
  let result = `${year}-${month}-${day}T${hour}:${minute}${seconds}`;
  if (showOffset !== 'never') {
    const offsetNs = GetOffsetNanosecondsFor(tz, instant);
    result += FormatISOTimeZoneOffsetString(offsetNs);
  }
  if (showTimeZone !== 'never') {
    const identifier = ToTemporalTimeZoneIdentifier(tz);
    const flag = showTimeZone === 'critical' ? '!' : '';
    result += `[${flag}${identifier}]`;
  }
  result += MaybeFormatCalendarAnnotation(GetSlot(zdt, CALENDAR), showCalendar);
  return result;
}

export function IsTimeZoneOffsetString(string: string) {
  return OFFSET.test(StringCtor(string));
}

export function ParseTimeZoneOffsetString(string: string): number {
  const match = OFFSET.exec(StringCtor(string));
  if (!match) {
    throw new RangeError(`invalid time zone offset: ${string}`);
  }
  const sign = match[1] === '-' || match[1] === '\u2212' ? -1 : +1;
  const hours = +match[2];
  const minutes = +(match[3] || 0);
  const seconds = +(match[4] || 0);
  const nanoseconds = +((match[5] || 0) + '000000000').slice(0, 9);
  return sign * (((hours * 60 + minutes) * 60 + seconds) * 1e9 + nanoseconds);
}

export function GetCanonicalTimeZoneIdentifier(timeZoneIdentifier: string): string {
  if (IsTimeZoneOffsetString(timeZoneIdentifier)) {
    const offsetNs = ParseTimeZoneOffsetString(timeZoneIdentifier);
    return FormatTimeZoneOffsetString(offsetNs);
  }
  const formatter = getIntlDateTimeFormatEnUsForTimeZone(StringCtor(timeZoneIdentifier));
  return formatter.resolvedOptions().timeZone;
}

export function GetNamedTimeZoneOffsetNanoseconds(id: string, epochNanoseconds: JSBI) {
  const { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } =
    GetNamedTimeZoneDateTimeParts(id, epochNanoseconds);

  // The pattern of leap years in the ISO 8601 calendar repeats every 400
  // years. To avoid overflowing at the edges of the range, we reduce the year
  // to the remainder after dividing by 400, and then add back all the
  // nanoseconds from the multiples of 400 years at the end.
  const reducedYear = year % 400;
  const yearCycles = (year - reducedYear) / 400;
  const nsIn400YearCycle = JSBI.multiply(JSBI.BigInt(400 * 365 + 97), DAY_NANOS);

  const reducedUTC = GetUTCEpochNanoseconds(
    reducedYear,
    month,
    day,
    hour,
    minute,
    second,
    millisecond,
    microsecond,
    nanosecond
  );
  assertExists(reducedUTC);
  const utc = JSBI.add(reducedUTC, JSBI.multiply(nsIn400YearCycle, JSBI.BigInt(yearCycles)));
  return JSBI.toNumber(JSBI.subtract(utc, epochNanoseconds));
}

function FormatTimeZoneOffsetString(offsetNanosecondsParam: number): string {
  const sign = offsetNanosecondsParam < 0 ? '-' : '+';
  const offsetNanoseconds = MathAbs(offsetNanosecondsParam);
  const nanoseconds = offsetNanoseconds % 1e9;
  const seconds = MathFloor(offsetNanoseconds / 1e9) % 60;
  const minutes = MathFloor(offsetNanoseconds / 60e9) % 60;
  const hours = MathFloor(offsetNanoseconds / 3600e9);

  const hourString = ISODateTimePartString(hours);
  const minuteString = ISODateTimePartString(minutes);
  const secondString = ISODateTimePartString(seconds);
  let post = '';
  if (nanoseconds) {
    let fraction = `${nanoseconds}`.padStart(9, '0');
    while (fraction[fraction.length - 1] === '0') fraction = fraction.slice(0, -1);
    post = `:${secondString}.${fraction}`;
  } else if (seconds) {
    post = `:${secondString}`;
  }
  return `${sign}${hourString}:${minuteString}${post}`;
}

function FormatISOTimeZoneOffsetString(offsetNanosecondsParam: number): string {
  let offsetNanoseconds = JSBI.toNumber(
    RoundNumberToIncrement(JSBI.BigInt(offsetNanosecondsParam), MINUTE_NANOS, 'halfExpand')
  );
  const sign = offsetNanoseconds < 0 ? '-' : '+';
  offsetNanoseconds = MathAbs(offsetNanoseconds);
  const minutes = (offsetNanoseconds / 60e9) % 60;
  const hours = MathFloor(offsetNanoseconds / 3600e9);

  const hourString = ISODateTimePartString(hours);
  const minuteString = ISODateTimePartString(minutes);
  return `${sign}${hourString}:${minuteString}`;
}
export function GetUTCEpochNanoseconds(
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
  // Note: Date.UTC() interprets one and two-digit years as being in the
  // 20th century, so don't use it
  const legacyDate = new Date();
  legacyDate.setUTCHours(hour, minute, second, millisecond);
  legacyDate.setUTCFullYear(year, month - 1, day);
  const ms = legacyDate.getTime();
  if (NumberIsNaN(ms)) return null;
  let ns = JSBI.multiply(JSBI.BigInt(ms), MILLION);
  ns = JSBI.add(ns, JSBI.multiply(JSBI.BigInt(microsecond), THOUSAND));
  ns = JSBI.add(ns, JSBI.BigInt(nanosecond));
  if (JSBI.lessThan(ns, NS_MIN) || JSBI.greaterThan(ns, NS_MAX)) return null;
  return ns;
}

function GetISOPartsFromEpoch(epochNanoseconds: JSBI) {
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

function maxJSBI(one: JSBI, two: JSBI) {
  return JSBI.lessThan(one, two) ? two : one;
}

/**
 * Our best guess at how far in advance new rules will be put into the TZDB for
 * future offset transitions. We'll pick 10 years but can always revise it if
 * we find that countries are being unusually proactive in their announcing
 * of offset changes.
 */
function afterLatestPossibleTzdbRuleChange() {
  return JSBI.add(SystemUTCEpochNanoSeconds(), ABOUT_TEN_YEARS_NANOS);
}

export function GetNamedTimeZoneNextTransition(id: string, epochNanoseconds: JSBI): JSBI | null {
  if (JSBI.lessThan(epochNanoseconds, BEFORE_FIRST_OFFSET_TRANSITION)) {
    return GetNamedTimeZoneNextTransition(id, BEFORE_FIRST_OFFSET_TRANSITION);
  }
  // Decide how far in the future after `epochNanoseconds` we'll look for an
  // offset change. There are two cases:
  // 1. If it's a past date (or a date in the near future) then it's possible
  //    that the time zone may have newly added DST in the next few years. So
  //    we'll have to look from the provided time until a few years after the
  //    current system time. (Changes to DST policy are usually announced a few
  //    years in the future.) Note that the first DST anywhere started in 1847,
  //    so we'll start checks in 1847 instead of wasting cycles on years where
  //    there will never be transitions.
  // 2. If it's a future date beyond the next few years, then we'll just assume
  //    that the latest DST policy in TZDB will still be in effect.  In this
  //    case, we only need to look one year in the future to see if there are
  //    any DST transitions.  We actually only need to look 9-10 months because
  //    DST has two transitions per year, but we'll use a year just to be safe.
  const oneYearLater = JSBI.add(epochNanoseconds, ABOUT_ONE_YEAR_NANOS);
  const uppercap = maxJSBI(afterLatestPossibleTzdbRuleChange(), oneYearLater);
  // The first transition (in any timezone) recorded in the TZDB was in 1847, so
  // start there if an earlier date is supplied.
  let leftNanos = maxJSBI(BEFORE_FIRST_OFFSET_TRANSITION, epochNanoseconds);
  const leftOffsetNs = GetNamedTimeZoneOffsetNanoseconds(id, leftNanos);
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
  // If a time zone uses DST (at the time of `epochNanoseconds`), then we only
  // have to look back one year to find a transition. But if it doesn't use DST,
  // then we need to look all the way back to 1847 (the earliest rule in the
  // TZDB) to see if it had other offset transitions in the past. Looping back
  // from a far-future date to 1847 is very slow (minutes of 100% CPU!), and is
  // also unnecessary because DST rules aren't put into the TZDB more than a few
  // years in the future because the political changes in time zones happen with
  // only a few years' warning. Therefore, if a far-future date is provided,
  // then we'll run the check in two parts:
  // 1. First, we'll look back for up to one year to see if the latest TZDB
  //    rules have DST.
  // 2. If not, then we'll "fast-reverse" back to a few years later than the
  //    current system time, and then look back to 1847. This reduces the
  //    worst-case loop from 273K years to 175 years, for a ~1500x improvement
  //    in worst-case perf.
  const afterLatestRule = afterLatestPossibleTzdbRuleChange();
  const isFarFuture = JSBI.greaterThan(epochNanoseconds, afterLatestRule);
  const lowercap = isFarFuture ? JSBI.subtract(epochNanoseconds, ABOUT_ONE_YEAR_NANOS) : BEFORE_FIRST_OFFSET_TRANSITION;

  // TODO: proposal-temporal polyfill has different code for very similar
  // optimizations as above, as well as in GetNamedTimeZonePreviousTransition.
  // We should figure out if we should change one polyfill to match the other.

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
  while (rightOffsetNs === leftOffsetNs && JSBI.greaterThan(rightNanos, lowercap)) {
    leftNanos = JSBI.subtract(rightNanos, TWO_WEEKS_NANOS);
    if (JSBI.lessThan(leftNanos, BEFORE_FIRST_OFFSET_TRANSITION)) return null;
    leftOffsetNs = GetNamedTimeZoneOffsetNanoseconds(id, leftNanos);
    if (rightOffsetNs === leftOffsetNs) {
      rightNanos = leftNanos;
    }
  }
  if (rightOffsetNs === leftOffsetNs) {
    if (isFarFuture) {
      // There was no DST after looking back one year, which means that the most
      // recent TZDB rules don't have any recurring transitions. To check for
      // transitions in older rules, back up to a few years after the current
      // date and then look all the way back to 1847. Note that we move back one
      // day from the latest possible rule so that when the recursion runs it
      // won't consider the new time to be "far future" because the system clock
      // has advanced in the meantime.
      const newTimeToCheck = JSBI.subtract(afterLatestRule, DAY_NANOS);
      return GetNamedTimeZonePreviousTransition(id, newTimeToCheck);
    }
    return null;
  }
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

export function GetNamedTimeZoneEpochNanoseconds(
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
  const ns = GetUTCEpochNanoseconds(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond);
  if (ns === null) throw new RangeError('DateTime outside of supported range');
  let nsEarlier = JSBI.subtract(ns, DAY_NANOS);
  if (JSBI.lessThan(nsEarlier, NS_MIN)) nsEarlier = ns;
  let nsLater = JSBI.add(ns, DAY_NANOS);
  if (JSBI.greaterThan(nsLater, NS_MAX)) nsLater = ns;
  const earliest = GetNamedTimeZoneOffsetNanoseconds(id, nsEarlier);
  const latest = GetNamedTimeZoneOffsetNanoseconds(id, nsLater);
  const found = earliest === latest ? [earliest] : [earliest, latest];
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

export function DayOfWeek(year: number, month: number, day: number) {
  const m = month + (month < 3 ? 10 : -2);
  const Y = year - (month < 3 ? 1 : 0);

  const c = MathFloor(Y / 100);
  const y = Y - c * 100;
  const d = day;

  const pD = d;
  const pM = MathFloor(2.6 * m - 0.2);
  const pY = y + MathFloor(y / 4);
  const pC = MathFloor(c / 4) - 2 * c;

  const dow = (pD + pM + pY + pC) % 7;

  return dow + (dow <= 0 ? 7 : 0);
}

export function DayOfYear(year: number, month: number, day: number) {
  let days = day;
  for (let m = month - 1; m > 0; m--) {
    days += ISODaysInMonth(year, m);
  }
  return days;
}

export function WeekOfYear(year: number, month: number, day: number) {
  const doy = DayOfYear(year, month, day);
  const dow = DayOfWeek(year, month, day) || 7;
  const doj = DayOfWeek(year, 1, 1);

  const week = MathFloor((doy - dow + 10) / 7);

  if (week < 1) {
    if (doj === 5 || (doj === 6 && LeapYear(year - 1))) {
      return { week: 53, year: year - 1 };
    } else {
      return { week: 52, year: year - 1 };
    }
  }
  if (week === 53) {
    if ((LeapYear(year) ? 366 : 365) - doy < 4 - dow) {
      return { week: 1, year: year + 1 };
    }
  }

  return { week, year };
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
  for (const prop of [y, mon, w, d, h, min, s, ms, µs, ns]) {
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

function BalanceISODate(yearParam: number, monthParam: number, dayParam: number) {
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
  yearParam: number,
  monthParam: number,
  dayParam: number,
  hourParam: number,
  minuteParam: number,
  secondParam: number,
  millisecondParam: number,
  microsecondParam: number,
  nanosecondParam: number
) {
  const { deltaDays, hour, minute, second, millisecond, microsecond, nanosecond } = BalanceTime(
    hourParam,
    minuteParam,
    secondParam,
    millisecondParam,
    microsecondParam,
    nanosecondParam
  );
  const { year, month, day } = BalanceISODate(yearParam, monthParam, dayParam + deltaDays);
  return { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond };
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

export function TotalDurationNanoseconds(
  daysParam: number,
  hoursParam: number | JSBI,
  minutesParam: number | JSBI,
  secondsParam: number | JSBI,
  millisecondsParam: number | JSBI,
  microsecondsParam: number | JSBI,
  nanosecondsParam: number | JSBI,
  offsetShift: number
) {
  const days: JSBI = JSBI.BigInt(daysParam);
  let nanoseconds: JSBI = JSBI.BigInt(nanosecondsParam);
  if (daysParam !== 0) nanoseconds = JSBI.subtract(JSBI.BigInt(nanosecondsParam), JSBI.BigInt(offsetShift));
  const hours = JSBI.add(JSBI.BigInt(hoursParam), JSBI.multiply(days, JSBI.BigInt(24)));
  const minutes = JSBI.add(JSBI.BigInt(minutesParam), JSBI.multiply(hours, SIXTY));
  const seconds = JSBI.add(JSBI.BigInt(secondsParam), JSBI.multiply(minutes, SIXTY));
  const milliseconds = JSBI.add(JSBI.BigInt(millisecondsParam), JSBI.multiply(seconds, THOUSAND));
  const microseconds = JSBI.add(JSBI.BigInt(microsecondsParam), JSBI.multiply(milliseconds, THOUSAND));
  return JSBI.add(JSBI.BigInt(nanoseconds), JSBI.multiply(microseconds, THOUSAND));
}

function NanosecondsToDays(nanosecondsParam: JSBI, relativeTo: ReturnType<typeof ToRelativeTemporalObject>) {
  const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
  const sign = MathSign(JSBI.toNumber(nanosecondsParam));
  let nanoseconds = JSBI.BigInt(nanosecondsParam);
  let dayLengthNs = 86400e9;
  if (sign === 0) return { days: 0, nanoseconds: ZERO, dayLengthNs };
  if (!IsTemporalZonedDateTime(relativeTo)) {
    let days: JSBI;
    ({ quotient: days, remainder: nanoseconds } = divmod(nanoseconds, JSBI.BigInt(dayLengthNs)));
    return { days: JSBI.toNumber(days), nanoseconds, dayLengthNs };
  }

  const startNs = GetSlot(relativeTo, EPOCHNANOSECONDS);
  const start = GetSlot(relativeTo, INSTANT);
  const endNs = JSBI.add(startNs, nanoseconds);
  const end = new TemporalInstant(endNs);
  const timeZone = GetSlot(relativeTo, TIME_ZONE);
  const calendar = GetSlot(relativeTo, CALENDAR);

  // Find the difference in days only.
  const dtStart = GetPlainDateTimeFor(timeZone, start, calendar);
  const dtEnd = GetPlainDateTimeFor(timeZone, end, calendar);
  let { days: daysNumber } = DifferenceISODateTime(
    GetSlot(dtStart, ISO_YEAR),
    GetSlot(dtStart, ISO_MONTH),
    GetSlot(dtStart, ISO_DAY),
    GetSlot(dtStart, ISO_HOUR),
    GetSlot(dtStart, ISO_MINUTE),
    GetSlot(dtStart, ISO_SECOND),
    GetSlot(dtStart, ISO_MILLISECOND),
    GetSlot(dtStart, ISO_MICROSECOND),
    GetSlot(dtStart, ISO_NANOSECOND),
    GetSlot(dtEnd, ISO_YEAR),
    GetSlot(dtEnd, ISO_MONTH),
    GetSlot(dtEnd, ISO_DAY),
    GetSlot(dtEnd, ISO_HOUR),
    GetSlot(dtEnd, ISO_MINUTE),
    GetSlot(dtEnd, ISO_SECOND),
    GetSlot(dtEnd, ISO_MILLISECOND),
    GetSlot(dtEnd, ISO_MICROSECOND),
    GetSlot(dtEnd, ISO_NANOSECOND),
    calendar,
    'day',
    ObjectCreate(null) as Temporal.DifferenceOptions<Temporal.DateTimeUnit>
  );
  let intermediateNs = AddZonedDateTime(start, timeZone, calendar, 0, 0, 0, daysNumber, 0, 0, 0, 0, 0, 0);
  // may disambiguate

  // If clock time after addition was in the middle of a skipped period, the
  // endpoint was disambiguated to a later clock time. So it's possible that
  // the resulting disambiguated result is later than endNs. If so, then back
  // up one day and try again. Repeat if necessary (some transitions are
  // > 24 hours) until either there's zero days left or the date duration is
  // back inside the period where it belongs. Note that this case only can
  // happen for positive durations because the only direction that
  // `disambiguation: 'compatible'` can change clock time is forwards.
  let daysBigInt = JSBI.BigInt(daysNumber);
  if (sign === 1) {
    while (JSBI.greaterThan(daysBigInt, ZERO) && JSBI.greaterThan(intermediateNs, endNs)) {
      daysBigInt = JSBI.subtract(daysBigInt, ONE);
      intermediateNs = AddZonedDateTime(
        start,
        timeZone,
        calendar,
        0,
        0,
        0,
        JSBI.toNumber(daysBigInt),
        0,
        0,
        0,
        0,
        0,
        0
      );
      // may do disambiguation
    }
  }
  nanoseconds = JSBI.subtract(endNs, intermediateNs);

  let isOverflow = false;
  let relativeInstant = new TemporalInstant(intermediateNs);
  do {
    // calculate length of the next day (day that contains the time remainder)
    const oneDayFartherNs = AddZonedDateTime(relativeInstant, timeZone, calendar, 0, 0, 0, sign, 0, 0, 0, 0, 0, 0);
    const relativeNs = GetSlot(relativeInstant, EPOCHNANOSECONDS);
    dayLengthNs = JSBI.toNumber(JSBI.subtract(oneDayFartherNs, relativeNs));
    isOverflow = JSBI.greaterThanOrEqual(
      JSBI.multiply(JSBI.subtract(nanoseconds, JSBI.BigInt(dayLengthNs)), JSBI.BigInt(sign)),
      ZERO
    );
    if (isOverflow) {
      nanoseconds = JSBI.subtract(nanoseconds, JSBI.BigInt(dayLengthNs));
      relativeInstant = new TemporalInstant(oneDayFartherNs);
      daysBigInt = JSBI.add(daysBigInt, JSBI.BigInt(sign));
    }
  } while (isOverflow);
  if (!isZero(daysBigInt) && signJSBI(daysBigInt) !== sign) {
    throw new RangeError('Time zone or calendar converted nanoseconds into a number of days with the opposite sign');
  }
  if (!isZero(nanoseconds) && signJSBI(nanoseconds) !== sign) {
    if (isNegativeJSBI(nanoseconds) && sign === 1) {
      throw new Error('assert not reached');
    }
    throw new RangeError('Time zone or calendar ended up with a remainder of nanoseconds with the opposite sign');
  }
  if (JSBI.greaterThanOrEqual(abs(nanoseconds), abs(JSBI.BigInt(dayLengthNs)))) {
    throw new Error('assert not reached');
  }
  return { days: JSBI.toNumber(daysBigInt), nanoseconds, dayLengthNs: MathAbs(dayLengthNs) };
}

export function BalanceDuration(
  daysParam: number,
  hoursParam: number | JSBI,
  minutesParam: number | JSBI,
  secondsParam: number | JSBI,
  millisecondsParam: number | JSBI,
  microsecondsParam: number | JSBI,
  nanosecondsParam: number | JSBI,
  largestUnit: Temporal.DateTimeUnit,
  relativeTo: ReturnType<typeof ToRelativeTemporalObject> = undefined
) {
  let result = BalancePossiblyInfiniteDuration(
    daysParam,
    hoursParam,
    minutesParam,
    secondsParam,
    millisecondsParam,
    microsecondsParam,
    nanosecondsParam,
    largestUnit,
    relativeTo
  );
  if (result === 'positive overflow' || result === 'negative overflow') {
    throw new RangeError('Duration out of range');
  } else {
    return result;
  }
}

export function BalancePossiblyInfiniteDuration(
  daysParam: number,
  hoursParam: number | JSBI,
  minutesParam: number | JSBI,
  secondsParam: number | JSBI,
  millisecondsParam: number | JSBI,
  microsecondsParam: number | JSBI,
  nanosecondsParam: number | JSBI,
  largestUnit: Temporal.DateTimeUnit,
  relativeTo: ReturnType<typeof ToRelativeTemporalObject> = undefined
) {
  let days = daysParam;
  let nanosecondsBigInt: JSBI,
    microsecondsBigInt: JSBI,
    millisecondsBigInt: JSBI,
    secondsBigInt: JSBI,
    minutesBigInt: JSBI,
    hoursBigInt: JSBI;
  if (IsTemporalZonedDateTime(relativeTo)) {
    const endNs = AddZonedDateTime(
      GetSlot(relativeTo, INSTANT),
      GetSlot(relativeTo, TIME_ZONE),
      GetSlot(relativeTo, CALENDAR),
      0,
      0,
      0,
      days,
      hoursParam,
      minutesParam,
      secondsParam,
      millisecondsParam,
      microsecondsParam,
      nanosecondsParam
    );
    const startNs = GetSlot(relativeTo, EPOCHNANOSECONDS);
    nanosecondsBigInt = JSBI.subtract(endNs, startNs);
  } else {
    nanosecondsBigInt = TotalDurationNanoseconds(
      days,
      hoursParam,
      minutesParam,
      secondsParam,
      millisecondsParam,
      microsecondsParam,
      nanosecondsParam,
      0
    );
  }
  if (largestUnit === 'year' || largestUnit === 'month' || largestUnit === 'week' || largestUnit === 'day') {
    ({ days, nanoseconds: nanosecondsBigInt } = NanosecondsToDays(nanosecondsBigInt, relativeTo));
  } else {
    days = 0;
  }

  const sign = JSBI.lessThan(nanosecondsBigInt, ZERO) ? -1 : 1;
  nanosecondsBigInt = abs(nanosecondsBigInt);
  microsecondsBigInt = millisecondsBigInt = secondsBigInt = minutesBigInt = hoursBigInt = ZERO;

  switch (largestUnit) {
    case 'year':
    case 'month':
    case 'week':
    case 'day':
    case 'hour':
      ({ quotient: microsecondsBigInt, remainder: nanosecondsBigInt } = divmod(nanosecondsBigInt, THOUSAND));
      ({ quotient: millisecondsBigInt, remainder: microsecondsBigInt } = divmod(microsecondsBigInt, THOUSAND));
      ({ quotient: secondsBigInt, remainder: millisecondsBigInt } = divmod(millisecondsBigInt, THOUSAND));
      ({ quotient: minutesBigInt, remainder: secondsBigInt } = divmod(secondsBigInt, SIXTY));
      ({ quotient: hoursBigInt, remainder: minutesBigInt } = divmod(minutesBigInt, SIXTY));
      break;
    case 'minute':
      ({ quotient: microsecondsBigInt, remainder: nanosecondsBigInt } = divmod(nanosecondsBigInt, THOUSAND));
      ({ quotient: millisecondsBigInt, remainder: microsecondsBigInt } = divmod(microsecondsBigInt, THOUSAND));
      ({ quotient: secondsBigInt, remainder: millisecondsBigInt } = divmod(millisecondsBigInt, THOUSAND));
      ({ quotient: minutesBigInt, remainder: secondsBigInt } = divmod(secondsBigInt, SIXTY));
      break;
    case 'second':
      ({ quotient: microsecondsBigInt, remainder: nanosecondsBigInt } = divmod(nanosecondsBigInt, THOUSAND));
      ({ quotient: millisecondsBigInt, remainder: microsecondsBigInt } = divmod(microsecondsBigInt, THOUSAND));
      ({ quotient: secondsBigInt, remainder: millisecondsBigInt } = divmod(millisecondsBigInt, THOUSAND));
      break;
    case 'millisecond':
      ({ quotient: microsecondsBigInt, remainder: nanosecondsBigInt } = divmod(nanosecondsBigInt, THOUSAND));
      ({ quotient: millisecondsBigInt, remainder: microsecondsBigInt } = divmod(microsecondsBigInt, THOUSAND));
      break;
    case 'microsecond':
      ({ quotient: microsecondsBigInt, remainder: nanosecondsBigInt } = divmod(nanosecondsBigInt, THOUSAND));
      break;
    case 'nanosecond':
      break;
    default:
      throw new Error('assert not reached');
  }

  const hours = JSBI.toNumber(hoursBigInt) * sign;
  const minutes = JSBI.toNumber(minutesBigInt) * sign;
  const seconds = JSBI.toNumber(secondsBigInt) * sign;
  const milliseconds = JSBI.toNumber(millisecondsBigInt) * sign;
  const microseconds = JSBI.toNumber(microsecondsBigInt) * sign;
  const nanoseconds = JSBI.toNumber(nanosecondsBigInt) * sign;

  for (const prop of [days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds]) {
    if (!NumberIsFinite(prop)) {
      if (sign === 1) {
        return 'positive overflow' as const;
      } else {
        return 'negative overflow' as const;
      }
    }
  }

  return { days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
}

export function UnbalanceDurationRelative(
  yearsParam: number,
  monthsParam: number,
  weeksParam: number,
  daysParam: number,
  largestUnit: Temporal.DateTimeUnit,
  relativeToParam: ReturnType<typeof ToRelativeTemporalObject>
): {
  years: number;
  months: number;
  weeks: number;
  days: number;
} {
  const TemporalDuration = GetIntrinsic('%Temporal.Duration%');
  const sign = DurationSign(yearsParam, monthsParam, weeksParam, daysParam, 0, 0, 0, 0, 0, 0);
  if (sign === 0) return { years: yearsParam, months: monthsParam, weeks: weeksParam, days: daysParam };
  const signBI = JSBI.BigInt(sign);

  let years = JSBI.BigInt(yearsParam);
  let months = JSBI.BigInt(monthsParam);
  let weeks = JSBI.BigInt(weeksParam);
  let days = JSBI.BigInt(daysParam);

  let calendar;
  let relativeTo: Temporal.PlainDate | undefined;
  if (relativeToParam) {
    relativeTo = ToTemporalDate(relativeToParam);
    calendar = GetSlot(relativeTo, CALENDAR);
  }

  const oneYear = new TemporalDuration(sign);
  const oneMonth = new TemporalDuration(0, sign);
  const oneWeek = new TemporalDuration(0, 0, sign);

  switch (largestUnit) {
    case 'year':
      // no-op
      break;
    case 'month':
      {
        if (!calendar) throw new RangeError('a starting point is required for months balancing');
        assertExists(relativeTo);
        // balance years down to months
        let dateAdd, dateUntil;
        if (typeof calendar !== 'string') {
          dateAdd = GetMethod(calendar, 'dateAdd');
          dateUntil = GetMethod(calendar, 'dateUntil');
        }
        while (!isZero(years)) {
          const newRelativeTo = CalendarDateAdd(calendar, relativeTo, oneYear, undefined, dateAdd);
          const untilOptions = ObjectCreate(null) as Temporal.DifferenceOptions<typeof largestUnit>;
          untilOptions.largestUnit = 'month';
          const untilResult = CalendarDateUntil(calendar, relativeTo, newRelativeTo, untilOptions, dateUntil);
          const oneYearMonths = JSBI.BigInt(GetSlot(untilResult, MONTHS));
          relativeTo = newRelativeTo;
          months = JSBI.add(months, oneYearMonths);
          years = JSBI.subtract(years, signBI);
        }
      }
      break;
    case 'week': {
      if (!calendar) throw new RangeError('a starting point is required for weeks balancing');
      assertExists(relativeTo);
      const dateAdd = typeof calendar !== 'string' ? GetMethod(calendar, 'dateAdd') : undefined;
      // balance years down to days
      while (!isZero(years)) {
        let oneYearDays;
        ({ relativeTo, days: oneYearDays } = MoveRelativeDate(calendar, relativeTo, oneYear, dateAdd));
        days = JSBI.add(days, JSBI.BigInt(oneYearDays));
        years = JSBI.subtract(years, signBI);
      }

      // balance months down to days
      while (!isZero(months)) {
        let oneMonthDays;
        ({ relativeTo, days: oneMonthDays } = MoveRelativeDate(calendar, relativeTo, oneMonth, dateAdd));
        days = JSBI.add(days, JSBI.BigInt(oneMonthDays));
        months = JSBI.subtract(months, signBI);
      }
      break;
    }
    default: {
      // balance years down to days
      if (isZero(years) && isZero(months) && isZero(weeks)) break;
      if (!calendar) throw new RangeError('a starting point is required for balancing calendar units');
      const dateAdd = typeof calendar !== 'string' ? GetMethod(calendar, 'dateAdd') : undefined;
      while (!isZero(years)) {
        assertExists(relativeTo);
        let oneYearDays;
        ({ relativeTo, days: oneYearDays } = MoveRelativeDate(calendar, relativeTo, oneYear, dateAdd));
        days = JSBI.add(days, JSBI.BigInt(oneYearDays));
        years = JSBI.subtract(years, signBI);
      }

      // balance months down to days
      while (!isZero(months)) {
        assertExists(relativeTo);
        let oneMonthDays;
        ({ relativeTo, days: oneMonthDays } = MoveRelativeDate(calendar, relativeTo, oneMonth, dateAdd));
        days = JSBI.add(days, JSBI.BigInt(oneMonthDays));
        months = JSBI.subtract(months, signBI);
      }

      // balance weeks down to days
      while (!isZero(weeks)) {
        assertExists(relativeTo);
        let oneWeekDays;
        ({ relativeTo, days: oneWeekDays } = MoveRelativeDate(calendar, relativeTo, oneWeek, dateAdd));
        days = JSBI.add(days, JSBI.BigInt(oneWeekDays));
        weeks = JSBI.subtract(weeks, signBI);
      }
      break;
    }
  }

  return {
    years: JSBI.toNumber(years),
    months: JSBI.toNumber(months),
    weeks: JSBI.toNumber(weeks),
    days: JSBI.toNumber(days)
  };
}

export function BalanceDurationRelative(
  yearsParam: number,
  monthsParam: number,
  weeksParam: number,
  daysParam: number,
  largestUnit: Temporal.DateTimeUnit,
  relativeToParam: ReturnType<typeof ToRelativeTemporalObject>
): {
  years: number;
  months: number;
  weeks: number;
  days: number;
} {
  const TemporalDuration = GetIntrinsic('%Temporal.Duration%');
  const sign = DurationSign(yearsParam, monthsParam, weeksParam, daysParam, 0, 0, 0, 0, 0, 0);
  if (sign === 0) return { years: yearsParam, months: monthsParam, weeks: weeksParam, days: daysParam };
  const signBI = JSBI.BigInt(sign);

  let years = JSBI.BigInt(yearsParam);
  let months = JSBI.BigInt(monthsParam);
  let weeks = JSBI.BigInt(weeksParam);
  let days = JSBI.BigInt(daysParam);

  let calendar;
  let relativeTo: Temporal.PlainDate | undefined;
  if (relativeToParam) {
    relativeTo = ToTemporalDate(relativeToParam);
    calendar = GetSlot(relativeTo, CALENDAR);
  }

  const oneYear = new TemporalDuration(sign);
  const oneMonth = new TemporalDuration(0, sign);
  const oneWeek = new TemporalDuration(0, 0, sign);

  switch (largestUnit) {
    case 'year': {
      if (!calendar) throw new RangeError('a starting point is required for years balancing');
      assertExists(relativeTo);
      const dateAdd = typeof calendar !== 'string' ? GetMethod(calendar, 'dateAdd') : undefined;
      // balance days up to years
      let newRelativeTo, oneYearDays;
      ({ relativeTo: newRelativeTo, days: oneYearDays } = MoveRelativeDate(calendar, relativeTo, oneYear, dateAdd));
      while (JSBI.greaterThanOrEqual(abs(days), JSBI.BigInt(MathAbs(oneYearDays)))) {
        days = JSBI.subtract(days, JSBI.BigInt(oneYearDays));
        years = JSBI.add(years, signBI);
        relativeTo = newRelativeTo;
        ({ relativeTo: newRelativeTo, days: oneYearDays } = MoveRelativeDate(calendar, relativeTo, oneYear, dateAdd));
      }

      // balance days up to months
      let oneMonthDays;
      ({ relativeTo: newRelativeTo, days: oneMonthDays } = MoveRelativeDate(calendar, relativeTo, oneMonth, dateAdd));
      while (JSBI.greaterThanOrEqual(abs(days), JSBI.BigInt(MathAbs(oneMonthDays)))) {
        days = JSBI.subtract(days, JSBI.BigInt(oneMonthDays));
        months = JSBI.add(months, signBI);
        relativeTo = newRelativeTo;
        ({ relativeTo: newRelativeTo, days: oneMonthDays } = MoveRelativeDate(calendar, relativeTo, oneMonth, dateAdd));
      }

      // balance months up to years
      newRelativeTo = CalendarDateAdd(calendar, relativeTo, oneYear, undefined, dateAdd);
      const dateUntil = typeof calendar !== 'string' ? GetMethod(calendar, 'dateUntil') : undefined;
      const untilOptions = ObjectCreate(null) as Temporal.DifferenceOptions<'month'>;
      untilOptions.largestUnit = 'month';
      let untilResult = CalendarDateUntil(calendar, relativeTo, newRelativeTo, untilOptions, dateUntil);
      let oneYearMonths = GetSlot(untilResult, MONTHS);
      while (JSBI.greaterThanOrEqual(abs(months), JSBI.BigInt(MathAbs(oneYearMonths)))) {
        months = JSBI.subtract(months, JSBI.BigInt(oneYearMonths));
        years = JSBI.add(years, signBI);
        relativeTo = newRelativeTo;
        newRelativeTo = CalendarDateAdd(calendar, relativeTo, oneYear, undefined, dateAdd);
        const untilOptions = ObjectCreate(null) as Temporal.DifferenceOptions<'month'>;
        untilOptions.largestUnit = 'month';
        untilResult = CalendarDateUntil(calendar, relativeTo, newRelativeTo, untilOptions, dateUntil);
        oneYearMonths = GetSlot(untilResult, MONTHS);
      }
      break;
    }
    case 'month': {
      if (!calendar) throw new RangeError('a starting point is required for months balancing');
      assertExists(relativeTo);
      const dateAdd = typeof calendar !== 'string' ? GetMethod(calendar, 'dateAdd') : undefined;
      // balance days up to months
      let newRelativeTo, oneMonthDays;
      ({ relativeTo: newRelativeTo, days: oneMonthDays } = MoveRelativeDate(calendar, relativeTo, oneMonth, dateAdd));
      while (JSBI.greaterThanOrEqual(abs(days), JSBI.BigInt(MathAbs(oneMonthDays)))) {
        days = JSBI.subtract(days, JSBI.BigInt(oneMonthDays));
        months = JSBI.add(months, signBI);
        relativeTo = newRelativeTo;
        ({ relativeTo: newRelativeTo, days: oneMonthDays } = MoveRelativeDate(calendar, relativeTo, oneMonth, dateAdd));
      }
      break;
    }
    case 'week': {
      if (!calendar) throw new RangeError('a starting point is required for weeks balancing');
      assertExists(relativeTo);
      const dateAdd = typeof calendar !== 'string' ? GetMethod(calendar, 'dateAdd') : undefined;
      // balance days up to weeks
      let newRelativeTo, oneWeekDays;
      ({ relativeTo: newRelativeTo, days: oneWeekDays } = MoveRelativeDate(calendar, relativeTo, oneWeek, dateAdd));
      while (JSBI.greaterThanOrEqual(abs(days), JSBI.BigInt(MathAbs(oneWeekDays)))) {
        days = JSBI.subtract(days, JSBI.BigInt(oneWeekDays));
        weeks = JSBI.add(weeks, signBI);
        relativeTo = newRelativeTo;
        ({ relativeTo: newRelativeTo, days: oneWeekDays } = MoveRelativeDate(calendar, relativeTo, oneWeek, dateAdd));
      }
      break;
    }
    default:
      // no-op
      break;
  }

  return {
    years: JSBI.toNumber(years),
    months: JSBI.toNumber(months),
    weeks: JSBI.toNumber(weeks),
    days: JSBI.toNumber(days)
  };
}

export function CalculateOffsetShift(
  relativeTo: ReturnType<typeof ToRelativeTemporalObject>,
  y: number,
  mon: number,
  w: number,
  d: number
) {
  if (IsTemporalZonedDateTime(relativeTo)) {
    const instant = GetSlot(relativeTo, INSTANT);
    const timeZone = GetSlot(relativeTo, TIME_ZONE);
    const calendar = GetSlot(relativeTo, CALENDAR);
    const offsetBefore = GetOffsetNanosecondsFor(timeZone, instant);
    const after = AddZonedDateTime(instant, timeZone, calendar, y, mon, w, d, 0, 0, 0, 0, 0, 0);
    const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
    const instantAfter = new TemporalInstant(after);
    const offsetAfter = GetOffsetNanosecondsFor(timeZone, instantAfter);
    return offsetAfter - offsetBefore;
  }
  return 0;
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

function RejectDateRange(year: number, month: number, day: number) {
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

function RejectDateTimeRange(
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
  RejectToRange(year, YEAR_MIN, YEAR_MAX);
  // Reject any DateTime 24 hours or more outside the Instant range
  if (
    (year === YEAR_MIN &&
      null ==
        GetUTCEpochNanoseconds(year, month, day + 1, hour, minute, second, millisecond, microsecond, nanosecond - 1)) ||
    (year === YEAR_MAX &&
      null ==
        GetUTCEpochNanoseconds(year, month, day - 1, hour, minute, second, millisecond, microsecond, nanosecond + 1))
  ) {
    throw new RangeError('DateTime outside of supported range');
  }
}

export function ValidateEpochNanoseconds(epochNanoseconds: JSBI) {
  if (JSBI.lessThan(epochNanoseconds, NS_MIN) || JSBI.greaterThan(epochNanoseconds, NS_MAX)) {
    throw new RangeError('Instant outside of supported range');
  }
}

function RejectYearMonthRange(year: number, month: number) {
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
  for (const prop of [y, mon, w, d, h, min, s, ms, µs, ns]) {
    if (!NumberIsFinite(prop)) throw new RangeError('infinite values not allowed as duration fields');
    const propSign = MathSign(prop);
    if (propSign !== 0 && propSign !== sign) throw new RangeError('mixed-sign values not allowed as duration fields');
  }
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
  switch (largestUnit) {
    case 'year':
    case 'month': {
      const sign = -CompareISODate(y1, m1, d1, y2, m2, d2);
      if (sign === 0) return { years: 0, months: 0, weeks: 0, days: 0 };

      const start = { year: y1, month: m1, day: d1 };
      const end = { year: y2, month: m2, day: d2 };

      let years = end.year - start.year;
      let mid = AddISODate(y1, m1, d1, years, 0, 0, 0, 'constrain');
      let midSign = -CompareISODate(mid.year, mid.month, mid.day, y2, m2, d2);
      if (midSign === 0) {
        return largestUnit === 'year'
          ? { years, months: 0, weeks: 0, days: 0 }
          : { years: 0, months: years * 12, weeks: 0, days: 0 };
      }
      let months = end.month - start.month;
      if (midSign !== sign) {
        years -= sign;
        months += sign * 12;
      }
      mid = AddISODate(y1, m1, d1, years, months, 0, 0, 'constrain');
      midSign = -CompareISODate(mid.year, mid.month, mid.day, y2, m2, d2);
      if (midSign === 0) {
        return largestUnit === 'year'
          ? { years, months, weeks: 0, days: 0 }
          : { years: 0, months: months + years * 12, weeks: 0, days: 0 };
      }
      if (midSign !== sign) {
        // The end date is later in the month than mid date (or earlier for
        // negative durations). Back up one month.
        months -= sign;
        if (months === -sign) {
          years -= sign;
          months = 11 * sign;
        }
        mid = AddISODate(y1, m1, d1, years, months, 0, 0, 'constrain');
      }

      let days = 0;
      // If we get here, months and years are correct (no overflow), and `mid`
      // is within the range from `start` to `end`. To count the days between
      // `mid` and `end`, there are 3 cases:
      // 1) same month: use simple subtraction
      // 2) end is previous month from intermediate (negative duration)
      // 3) end is next month from intermediate (positive duration)
      if (mid.month === end.month) {
        // 1) same month: use simple subtraction
        days = end.day - mid.day;
      } else if (sign < 0) {
        // 2) end is previous month from intermediate (negative duration)
        // Example: intermediate: Feb 1, end: Jan 30, DaysInMonth = 31, days = -2
        days = -mid.day - (ISODaysInMonth(end.year, end.month) - end.day);
      } else {
        // 3) end is next month from intermediate (positive duration)
        // Example: intermediate: Jan 29, end: Feb 1, DaysInMonth = 31, days = 3
        days = end.day + (ISODaysInMonth(mid.year, mid.month) - mid.day);
      }

      if (largestUnit === 'month') {
        months += years * 12;
        years = 0;
      }
      return { years, months, weeks: 0, days };
    }
    case 'week':
    case 'day': {
      let larger, smaller, sign;
      if (CompareISODate(y1, m1, d1, y2, m2, d2) < 0) {
        smaller = { year: y1, month: m1, day: d1 };
        larger = { year: y2, month: m2, day: d2 };
        sign = 1;
      } else {
        smaller = { year: y2, month: m2, day: d2 };
        larger = { year: y1, month: m1, day: d1 };
        sign = -1;
      }
      let days = DayOfYear(larger.year, larger.month, larger.day) - DayOfYear(smaller.year, smaller.month, smaller.day);
      for (let year = smaller.year; year < larger.year; ++year) {
        days += LeapYear(year) ? 366 : 365;
      }
      let weeks = 0;
      if (largestUnit === 'week') {
        weeks = MathFloor(days / 7);
        days %= 7;
      }
      weeks *= sign;
      days *= sign;
      return { years: 0, months: 0, weeks, days };
    }
    default:
      throw new Error('assert not reached');
  }
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
  let hours = h2 - h1;
  let minutes = min2 - min1;
  let seconds = s2 - s1;
  let milliseconds = ms2 - ms1;
  let microseconds = µs2 - µs1;
  let nanoseconds = ns2 - ns1;

  const sign = DurationSign(0, 0, 0, 0, hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
  hours *= sign;
  minutes *= sign;
  seconds *= sign;
  milliseconds *= sign;
  microseconds *= sign;
  nanoseconds *= sign;

  let deltaDays = 0;
  ({
    deltaDays,
    hour: hours,
    minute: minutes,
    second: seconds,
    millisecond: milliseconds,
    microsecond: microseconds,
    nanosecond: nanoseconds
  } = BalanceTime(hours, minutes, seconds, milliseconds, microseconds, nanoseconds));

  if (deltaDays != 0) throw new Error('assertion failure in DifferenceTime: _bt_.[[Days]] should be 0');
  hours *= sign;
  minutes *= sign;
  seconds *= sign;
  milliseconds *= sign;
  microseconds *= sign;
  nanoseconds *= sign;

  return { hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
}

function DifferenceInstant(
  ns1: JSBI,
  ns2: JSBI,
  increment: number,
  smallestUnit: keyof typeof nsPerTimeUnit,
  largestUnit: keyof typeof nsPerTimeUnit,
  roundingMode: Temporal.RoundingMode
) {
  const diff = JSBI.subtract(ns2, ns1);

  let hours = 0;
  let minutes = 0;
  let nanoseconds = JSBI.toNumber(JSBI.remainder(diff, THOUSAND));
  let microseconds = JSBI.toNumber(JSBI.remainder(JSBI.divide(diff, THOUSAND), THOUSAND));
  let milliseconds = JSBI.toNumber(JSBI.remainder(JSBI.divide(diff, MILLION), THOUSAND));
  let seconds = JSBI.toNumber(JSBI.divide(diff, BILLION));

  ({ hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = RoundDuration(
    0,
    0,
    0,
    0,
    0,
    0,
    seconds,
    milliseconds,
    microseconds,
    nanoseconds,
    increment,
    smallestUnit,
    roundingMode
  ));
  return BalanceDuration(0, hours, minutes, seconds, milliseconds, microseconds, nanoseconds, largestUnit);
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
  y2: number,
  mon2: number,
  d2: number,
  h2: number,
  min2: number,
  s2: number,
  ms2: number,
  µs2: number,
  ns2: number,
  calendar: CalendarSlot,
  largestUnit: Temporal.DateTimeUnit,
  options: Temporal.DifferenceOptions<Temporal.DateTimeUnit> | undefined
) {
  let y1 = y1Param;
  let mon1 = mon1Param;
  let d1 = d1Param;

  let { hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = DifferenceTime(
    h1,
    min1,
    s1,
    ms1,
    µs1,
    ns1,
    h2,
    min2,
    s2,
    ms2,
    µs2,
    ns2
  );

  const timeSign = DurationSign(0, 0, 0, 0, hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
  const dateSign = CompareISODate(y2, mon2, d2, y1, mon1, d1);
  if (dateSign === -timeSign) {
    ({ year: y1, month: mon1, day: d1 } = BalanceISODate(y1, mon1, d1 - timeSign));
    ({ hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = BalanceDuration(
      -timeSign,
      hours,
      minutes,
      seconds,
      milliseconds,
      microseconds,
      nanoseconds,
      largestUnit
    ));
  }

  const date1 = CreateTemporalDate(y1, mon1, d1, calendar);
  const date2 = CreateTemporalDate(y2, mon2, d2, calendar);
  const dateLargestUnit = LargerOfTwoTemporalUnits('day', largestUnit);
  const untilOptions = CopyOptions(options);
  untilOptions.largestUnit = dateLargestUnit;
  // TODO untilOptions doesn't want to compile as it seems that smallestUnit is not clamped?
  // Type 'SmallestUnit<DateTimeUnit> | undefined' is not assignable to type
  //      'SmallestUnit<"year" | "month" | "day" | "week"> | undefined'.
  // Type '"hour"' is not assignable to type
  //      'SmallestUnit<"year" | "month" | "day" | "week"> | undefined'.ts(2345)
  let { years, months, weeks, days } = CalendarDateUntil(calendar, date1, date2, untilOptions as any);
  // Signs of date part and time part may not agree; balance them together
  ({ days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = BalanceDuration(
    days,
    hours,
    minutes,
    seconds,
    milliseconds,
    microseconds,
    nanoseconds,
    largestUnit
  ));
  return { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
}

function DifferenceZonedDateTime(
  ns1: JSBI,
  ns2: JSBI,
  timeZone: string | Temporal.TimeZoneProtocol,
  calendar: CalendarSlot,
  largestUnit: Temporal.DateTimeUnit,
  options: Temporal.DifferenceOptions<Temporal.DateTimeUnit>
) {
  const nsDiff = JSBI.subtract(ns2, ns1);
  if (JSBI.equal(nsDiff, ZERO)) {
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
      nanoseconds: 0
    };
  }

  // Find the difference in dates only.
  const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
  const start = new TemporalInstant(ns1);
  const end = new TemporalInstant(ns2);
  const dtStart = GetPlainDateTimeFor(timeZone, start, calendar);
  const dtEnd = GetPlainDateTimeFor(timeZone, end, calendar);
  let { years, months, weeks, days } = DifferenceISODateTime(
    GetSlot(dtStart, ISO_YEAR),
    GetSlot(dtStart, ISO_MONTH),
    GetSlot(dtStart, ISO_DAY),
    GetSlot(dtStart, ISO_HOUR),
    GetSlot(dtStart, ISO_MINUTE),
    GetSlot(dtStart, ISO_SECOND),
    GetSlot(dtStart, ISO_MILLISECOND),
    GetSlot(dtStart, ISO_MICROSECOND),
    GetSlot(dtStart, ISO_NANOSECOND),
    GetSlot(dtEnd, ISO_YEAR),
    GetSlot(dtEnd, ISO_MONTH),
    GetSlot(dtEnd, ISO_DAY),
    GetSlot(dtEnd, ISO_HOUR),
    GetSlot(dtEnd, ISO_MINUTE),
    GetSlot(dtEnd, ISO_SECOND),
    GetSlot(dtEnd, ISO_MILLISECOND),
    GetSlot(dtEnd, ISO_MICROSECOND),
    GetSlot(dtEnd, ISO_NANOSECOND),
    calendar,
    largestUnit,
    options
  );
  const intermediateNs = AddZonedDateTime(start, timeZone, calendar, years, months, weeks, 0, 0, 0, 0, 0, 0, 0);
  // may disambiguate
  let timeRemainderNs = JSBI.subtract(ns2, intermediateNs);
  const intermediate = CreateTemporalZonedDateTime(intermediateNs, timeZone, calendar);
  ({ nanoseconds: timeRemainderNs, days } = NanosecondsToDays(timeRemainderNs, intermediate));

  // Finally, merge the date and time durations and return the merged result.
  const { hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = BalanceDuration(
    0,
    0,
    0,
    0,
    0,
    0,
    JSBI.toNumber(timeRemainderNs),
    'hour'
  );
  return { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
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
  const ALLOWED_UNITS = SINGULAR_PLURAL_UNITS.reduce((allowed, unitInfo) => {
    const p = unitInfo[0];
    const s = unitInfo[1];
    const c = unitInfo[2];
    if ((group === 'datetime' || c === group) && !disallowed.includes(s)) {
      allowed.push(s, p);
    }
    return allowed;
  }, [] as (Temporal.DateTimeUnit | Temporal.PluralUnit<Temporal.DateTimeUnit>)[]);

  let largestUnit = GetTemporalUnit(options, 'largestUnit', group, 'auto');
  if (disallowed.includes(largestUnit)) {
    throw new RangeError(`largestUnit must be one of ${ALLOWED_UNITS.join(', ')}, not ${largestUnit}`);
  }

  const roundingIncrement = ToTemporalRoundingIncrement(options);

  let roundingMode = ToTemporalRoundingMode(options, 'trunc');
  if (op === 'since') roundingMode = NegateTemporalRoundingMode(roundingMode);

  const smallestUnit = GetTemporalUnit(options, 'smallestUnit', group, fallbackSmallest);
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

  const resolvedOptions = CopyOptions(options);
  const settings = GetDifferenceSettings(operation, resolvedOptions, 'time', [], 'nanosecond', 'second');

  const onens = GetSlot(instant, EPOCHNANOSECONDS);
  const twons = GetSlot(other, EPOCHNANOSECONDS);
  let { hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = DifferenceInstant(
    onens,
    twons,
    settings.roundingIncrement,
    settings.smallestUnit,
    settings.largestUnit,
    settings.roundingMode
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
  ThrowIfCalendarsNotEqual(calendar, otherCalendar, 'compute difference between dates');

  const resolvedOptions = CopyOptions(options);
  const settings = GetDifferenceSettings(operation, resolvedOptions, 'date', [], 'day', 'day');
  resolvedOptions.largestUnit = settings.largestUnit;

  let { years, months, weeks, days } = CalendarDateUntil(calendar, plainDate, other, resolvedOptions);

  if (settings.smallestUnit !== 'day' || settings.roundingIncrement !== 1) {
    ({ years, months, weeks, days } = RoundDuration(
      years,
      months,
      weeks,
      days,
      0,
      0,
      0,
      0,
      0,
      0,
      settings.roundingIncrement,
      settings.smallestUnit,
      settings.roundingMode,
      plainDate
    ));
  }

  const Duration = GetIntrinsic('%Temporal.Duration%');
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
  ThrowIfCalendarsNotEqual(calendar, otherCalendar, 'compute difference between dates');

  const resolvedOptions = CopyOptions(options);
  const settings = GetDifferenceSettings(operation, resolvedOptions, 'datetime', [], 'nanosecond', 'day');

  let { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } =
    DifferenceISODateTime(
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
      resolvedOptions
    );

  const relativeTo = TemporalDateTimeToDate(plainDateTime);
  ({ years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = RoundDuration(
    years,
    months,
    weeks,
    days,
    hours,
    minutes,
    seconds,
    milliseconds,
    microseconds,
    nanoseconds,
    settings.roundingIncrement,
    settings.smallestUnit,
    settings.roundingMode,
    relativeTo
  ));
  ({ days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = BalanceDuration(
    days,
    hours,
    minutes,
    seconds,
    milliseconds,
    microseconds,
    nanoseconds,
    settings.largestUnit
  ));

  const Duration = GetIntrinsic('%Temporal.Duration%');
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

  const resolvedOptions = CopyOptions(options);
  const settings = GetDifferenceSettings(operation, resolvedOptions, 'time', [], 'nanosecond', 'hour');

  let { hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = DifferenceTime(
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
  ({ hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = RoundDuration(
    0,
    0,
    0,
    0,
    hours,
    minutes,
    seconds,
    milliseconds,
    microseconds,
    nanoseconds,
    settings.roundingIncrement,
    settings.smallestUnit,
    settings.roundingMode
  ));
  ({ hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = BalanceDuration(
    0,
    hours,
    minutes,
    seconds,
    milliseconds,
    microseconds,
    nanoseconds,
    settings.largestUnit
  ));
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
  ThrowIfCalendarsNotEqual(calendar, otherCalendar, 'compute difference between months');

  const resolvedOptions = CopyOptions(options);
  const settings = GetDifferenceSettings(operation, resolvedOptions, 'date', ['week', 'day'], 'month', 'year');
  resolvedOptions.largestUnit = settings.largestUnit;

  const fieldNames = CalendarFields(calendar, ['monthCode', 'year']) as AnyTemporalKey[];
  const thisFields = PrepareTemporalFields(yearMonth, fieldNames, []);
  thisFields.day = 1;
  const thisDate = CalendarDateFromFields(calendar, thisFields);
  const otherFields = PrepareTemporalFields(other, fieldNames, []);
  otherFields.day = 1;
  const otherDate = CalendarDateFromFields(calendar, otherFields);

  let { years, months } = CalendarDateUntil(calendar, thisDate, otherDate, resolvedOptions);

  if (settings.smallestUnit !== 'month' || settings.roundingIncrement !== 1) {
    ({ years, months } = RoundDuration(
      years,
      months,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      settings.roundingIncrement,
      settings.smallestUnit,
      settings.roundingMode,
      thisDate
    ));
  }

  const Duration = GetIntrinsic('%Temporal.Duration%');
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
  ThrowIfCalendarsNotEqual(calendar, otherCalendar, 'compute difference between dates');

  const resolvedOptions = CopyOptions(options);
  const settings = GetDifferenceSettings(operation, resolvedOptions, 'datetime', [], 'nanosecond', 'hour');
  resolvedOptions.largestUnit = settings.largestUnit;

  const ns1 = GetSlot(zonedDateTime, EPOCHNANOSECONDS);
  const ns2 = GetSlot(other, EPOCHNANOSECONDS);
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
    ({ hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = DifferenceInstant(
      ns1,
      ns2,
      settings.roundingIncrement,
      settings.smallestUnit as Temporal.TimeUnit,
      settings.largestUnit as Temporal.TimeUnit,
      settings.roundingMode
    ));
  } else {
    const timeZone = GetSlot(zonedDateTime, TIME_ZONE);
    if (!TimeZoneEquals(timeZone, GetSlot(other, TIME_ZONE))) {
      throw new RangeError(
        "When calculating difference between time zones, largestUnit must be 'hours' " +
          'or smaller because day lengths can vary between time zones due to DST or time zone offset changes.'
      );
    }
    ({ years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } =
      DifferenceZonedDateTime(ns1, ns2, timeZone, calendar, settings.largestUnit, resolvedOptions));
    ({ years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = RoundDuration(
      years,
      months,
      weeks,
      days,
      hours,
      minutes,
      seconds,
      milliseconds,
      microseconds,
      nanoseconds,
      settings.roundingIncrement,
      settings.smallestUnit,
      settings.roundingMode,
      zonedDateTime
    ));
    ({ years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } =
      AdjustRoundedDurationDays(
        years,
        months,
        weeks,
        days,
        hours,
        minutes,
        seconds,
        milliseconds,
        microseconds,
        nanoseconds,
        settings.roundingIncrement,
        settings.smallestUnit,
        settings.roundingMode,
        zonedDateTime
      ));
  }

  const Duration = GetIntrinsic('%Temporal.Duration%');
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
  overflow: Temporal.ArithmeticOptions['overflow']
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
  return { year, month, day };
}

function AddTime(
  hourParam: number,
  minuteParam: number,
  secondParam: number,
  millisecondParam: number,
  microsecondParam: number,
  nanosecondParam: number,
  hours: number,
  minutes: number,
  seconds: number,
  milliseconds: number,
  microseconds: number,
  nanoseconds: number
) {
  let hour = hourParam;
  let minute = minuteParam;
  let second = secondParam;
  let millisecond = millisecondParam;
  let microsecond = microsecondParam;
  let nanosecond = nanosecondParam;

  hour += hours;
  minute += minutes;
  second += seconds;
  millisecond += milliseconds;
  microsecond += microseconds;
  nanosecond += nanoseconds;
  let deltaDays = 0;
  ({ deltaDays, hour, minute, second, millisecond, microsecond, nanosecond } = BalanceTime(
    hour,
    minute,
    second,
    millisecond,
    microsecond,
    nanosecond
  ));
  return { deltaDays, hour, minute, second, millisecond, microsecond, nanosecond };
}

function AddDuration(
  y1: number,
  mon1: number,
  w1: number,
  d1: number,
  h1: number,
  min1: number,
  s1: number,
  ms1: number,
  µs1: number,
  ns1: number,
  y2: number,
  mon2: number,
  w2: number,
  d2: number,
  h2: number,
  min2: number,
  s2: number,
  ms2: number,
  µs2: number,
  ns2: number,
  relativeTo: ReturnType<typeof ToRelativeTemporalObject>
) {
  const largestUnit1 = DefaultTemporalLargestUnit(y1, mon1, w1, d1, h1, min1, s1, ms1, µs1, ns1);
  const largestUnit2 = DefaultTemporalLargestUnit(y2, mon2, w2, d2, h2, min2, s2, ms2, µs2, ns2);
  const largestUnit = LargerOfTwoTemporalUnits(largestUnit1, largestUnit2);

  let years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds;
  if (!relativeTo) {
    if (largestUnit === 'year' || largestUnit === 'month' || largestUnit === 'week') {
      throw new RangeError('relativeTo is required for years, months, or weeks arithmetic');
    }
    years = months = weeks = 0;
    ({ days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = BalanceDuration(
      d1 + d2,
      JSBI.add(JSBI.BigInt(h1), JSBI.BigInt(h2)),
      JSBI.add(JSBI.BigInt(min1), JSBI.BigInt(min2)),
      JSBI.add(JSBI.BigInt(s1), JSBI.BigInt(s2)),
      JSBI.add(JSBI.BigInt(ms1), JSBI.BigInt(ms2)),
      JSBI.add(JSBI.BigInt(µs1), JSBI.BigInt(µs2)),
      JSBI.add(JSBI.BigInt(ns1), JSBI.BigInt(ns2)),
      largestUnit
    ));
  } else if (IsTemporalDate(relativeTo)) {
    const TemporalDuration = GetIntrinsic('%Temporal.Duration%');
    const calendar = GetSlot(relativeTo, CALENDAR);

    const dateDuration1 = new TemporalDuration(y1, mon1, w1, d1, 0, 0, 0, 0, 0, 0);
    const dateDuration2 = new TemporalDuration(y2, mon2, w2, d2, 0, 0, 0, 0, 0, 0);
    const dateAdd = typeof calendar !== 'string' ? GetMethod(calendar, 'dateAdd') : undefined;
    const intermediate = CalendarDateAdd(calendar, relativeTo, dateDuration1, undefined, dateAdd);
    const end = CalendarDateAdd(calendar, intermediate, dateDuration2, undefined, dateAdd);

    const dateLargestUnit = LargerOfTwoTemporalUnits('day', largestUnit) as Temporal.DateUnit;
    const differenceOptions = ObjectCreate(null) as Temporal.DifferenceOptions<Temporal.DateUnit>;
    differenceOptions.largestUnit = dateLargestUnit;
    ({ years, months, weeks, days } = CalendarDateUntil(calendar, relativeTo, end, differenceOptions));
    // Signs of date part and time part may not agree; balance them together
    ({ days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = BalanceDuration(
      days,
      JSBI.add(JSBI.BigInt(h1), JSBI.BigInt(h2)),
      JSBI.add(JSBI.BigInt(min1), JSBI.BigInt(min2)),
      JSBI.add(JSBI.BigInt(s1), JSBI.BigInt(s2)),
      JSBI.add(JSBI.BigInt(ms1), JSBI.BigInt(ms2)),
      JSBI.add(JSBI.BigInt(µs1), JSBI.BigInt(µs2)),
      JSBI.add(JSBI.BigInt(ns1), JSBI.BigInt(ns2)),
      largestUnit
    ));
  } else {
    // relativeTo is a ZonedDateTime
    const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
    const timeZone = GetSlot(relativeTo, TIME_ZONE);
    const calendar = GetSlot(relativeTo, CALENDAR);
    const intermediateNs = AddZonedDateTime(
      GetSlot(relativeTo, INSTANT),
      timeZone,
      calendar,
      y1,
      mon1,
      w1,
      d1,
      h1,
      min1,
      s1,
      ms1,
      µs1,
      ns1
    );
    const endNs = AddZonedDateTime(
      new TemporalInstant(intermediateNs),
      timeZone,
      calendar,
      y2,
      mon2,
      w2,
      d2,
      h2,
      min2,
      s2,
      ms2,
      µs2,
      ns2
    );
    if (largestUnit !== 'year' && largestUnit !== 'month' && largestUnit !== 'week' && largestUnit !== 'day') {
      // The user is only asking for a time difference, so return difference of instants.
      years = 0;
      months = 0;
      weeks = 0;
      days = 0;
      ({ hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = DifferenceInstant(
        GetSlot(relativeTo, EPOCHNANOSECONDS),
        endNs,
        1,
        'nanosecond',
        largestUnit,
        'halfExpand'
      ));
    } else {
      ({ years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } =
        DifferenceZonedDateTime(
          GetSlot(relativeTo, EPOCHNANOSECONDS),
          endNs,
          timeZone,
          calendar,
          largestUnit,
          ObjectCreate(null) as Temporal.DifferenceOptions<Temporal.DateTimeUnit>
        ));
    }
  }

  RejectDuration(years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
  return { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
}

function AddInstant(
  epochNanoseconds: JSBI,
  h: number | JSBI,
  min: number | JSBI,
  s: number | JSBI,
  ms: number | JSBI,
  µs: number | JSBI,
  ns: number | JSBI
) {
  let sum = ZERO;
  sum = JSBI.add(sum, JSBI.BigInt(ns));
  sum = JSBI.add(sum, JSBI.multiply(JSBI.BigInt(µs), THOUSAND));
  sum = JSBI.add(sum, JSBI.multiply(JSBI.BigInt(ms), MILLION));
  sum = JSBI.add(sum, JSBI.multiply(JSBI.BigInt(s), BILLION));
  sum = JSBI.add(sum, JSBI.multiply(JSBI.BigInt(min), JSBI.BigInt(60 * 1e9)));
  sum = JSBI.add(sum, JSBI.multiply(JSBI.BigInt(h), JSBI.BigInt(60 * 60 * 1e9)));

  const result = JSBI.add(epochNanoseconds, sum);
  ValidateEpochNanoseconds(result);
  return result;
}

function AddDateTime(
  year: number,
  month: number,
  day: number,
  hourParam: number,
  minuteParam: number,
  secondParam: number,
  millisecondParam: number,
  microsecondParam: number,
  nanosecondParam: number,
  calendar: CalendarSlot,
  years: number,
  months: number,
  weeks: number,
  daysParam: number,
  hours: number,
  minutes: number,
  seconds: number,
  milliseconds: number,
  microseconds: number,
  nanoseconds: number,
  options?: Temporal.ArithmeticOptions
) {
  let days = daysParam;
  // Add the time part
  let { deltaDays, hour, minute, second, millisecond, microsecond, nanosecond } = AddTime(
    hourParam,
    minuteParam,
    secondParam,
    millisecondParam,
    microsecondParam,
    nanosecondParam,
    hours,
    minutes,
    seconds,
    milliseconds,
    microseconds,
    nanoseconds
  );
  days += deltaDays;

  // Delegate the date part addition to the calendar
  const TemporalDuration = GetIntrinsic('%Temporal.Duration%');
  const datePart = CreateTemporalDate(year, month, day, calendar);
  const dateDuration = new TemporalDuration(years, months, weeks, days, 0, 0, 0, 0, 0, 0);
  const addedDate = CalendarDateAdd(calendar, datePart, dateDuration, options);

  return {
    year: GetSlot(addedDate, ISO_YEAR),
    month: GetSlot(addedDate, ISO_MONTH),
    day: GetSlot(addedDate, ISO_DAY),
    hour,
    minute,
    second,
    millisecond,
    microsecond,
    nanosecond
  };
}

export function AddZonedDateTime(
  instant: Temporal.Instant,
  timeZone: string | Temporal.TimeZoneProtocol,
  calendar: CalendarSlot,
  years: number,
  months: number,
  weeks: number,
  days: number,
  h: number | JSBI,
  min: number | JSBI,
  s: number | JSBI,
  ms: number | JSBI,
  µs: number | JSBI,
  ns: number | JSBI,
  options?: Temporal.ArithmeticOptions
) {
  // If only time is to be added, then use Instant math. It's not OK to fall
  // through to the date/time code below because compatible disambiguation in
  // the PlainDateTime=>Instant conversion will change the offset of any
  // ZonedDateTime in the repeated clock time after a backwards transition.
  // When adding/subtracting time units and not dates, this disambiguation is
  // not expected and so is avoided below via a fast path for time-only
  // arithmetic.
  // BTW, this behavior is similar in spirit to offset: 'prefer' in `with`.
  const TemporalDuration = GetIntrinsic('%Temporal.Duration%');
  if (DurationSign(years, months, weeks, days, 0, 0, 0, 0, 0, 0) === 0) {
    return AddInstant(GetSlot(instant, EPOCHNANOSECONDS), h, min, s, ms, µs, ns);
  }

  // RFC 5545 requires the date portion to be added in calendar days and the
  // time portion to be added in exact time.
  const dt = GetPlainDateTimeFor(timeZone, instant, calendar);
  const datePart = CreateTemporalDate(GetSlot(dt, ISO_YEAR), GetSlot(dt, ISO_MONTH), GetSlot(dt, ISO_DAY), calendar);
  const dateDuration = new TemporalDuration(years, months, weeks, days, 0, 0, 0, 0, 0, 0);
  const addedDate = CalendarDateAdd(calendar, datePart, dateDuration, options);
  const dtIntermediate = CreateTemporalDateTime(
    GetSlot(addedDate, ISO_YEAR),
    GetSlot(addedDate, ISO_MONTH),
    GetSlot(addedDate, ISO_DAY),
    GetSlot(dt, ISO_HOUR),
    GetSlot(dt, ISO_MINUTE),
    GetSlot(dt, ISO_SECOND),
    GetSlot(dt, ISO_MILLISECOND),
    GetSlot(dt, ISO_MICROSECOND),
    GetSlot(dt, ISO_NANOSECOND),
    calendar
  );

  // Note that 'compatible' is used below because this disambiguation behavior
  // is required by RFC 5545.
  const instantIntermediate = GetInstantFor(timeZone, dtIntermediate, 'compatible');
  return AddInstant(GetSlot(instantIntermediate, EPOCHNANOSECONDS), h, min, s, ms, µs, ns);
}

type AddSubtractOperation = 'add' | 'subtract';

export function AddDurationToOrSubtractDurationFromDuration(
  operation: AddSubtractOperation,
  duration: Temporal.Duration,
  other: DurationParams['add'][0],
  optionsParam: DurationParams['add'][1]
): Temporal.Duration {
  const sign = operation === 'subtract' ? -1 : 1;
  let { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } =
    ToTemporalDurationRecord(other);
  const options = GetOptionsObject(optionsParam);
  const relativeTo = ToRelativeTemporalObject(options);
  ({ years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = AddDuration(
    GetSlot(duration, YEARS),
    GetSlot(duration, MONTHS),
    GetSlot(duration, WEEKS),
    GetSlot(duration, DAYS),
    GetSlot(duration, HOURS),
    GetSlot(duration, MINUTES),
    GetSlot(duration, SECONDS),
    GetSlot(duration, MILLISECONDS),
    GetSlot(duration, MICROSECONDS),
    GetSlot(duration, NANOSECONDS),
    sign * years,
    sign * months,
    sign * weeks,
    sign * days,
    sign * hours,
    sign * minutes,
    sign * seconds,
    sign * milliseconds,
    sign * microseconds,
    sign * nanoseconds,
    relativeTo
  ));
  const Duration = GetIntrinsic('%Temporal.Duration%');
  return new Duration(years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
}

export function AddDurationToOrSubtractDurationFromInstant(
  operation: AddSubtractOperation,
  instant: Temporal.Instant,
  durationLike: InstantParams['add'][0]
): Temporal.Instant {
  const sign = operation === 'subtract' ? -1 : 1;
  const { hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ToLimitedTemporalDuration(durationLike, [
    'years',
    'months',
    'weeks',
    'days'
  ]);
  const ns = AddInstant(
    GetSlot(instant, EPOCHNANOSECONDS),
    sign * hours,
    sign * minutes,
    sign * seconds,
    sign * milliseconds,
    sign * microseconds,
    sign * nanoseconds
  );
  const Instant = GetIntrinsic('%Temporal.Instant%');
  return new Instant(ns);
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
  const calendar = GetSlot(dateTime, CALENDAR);
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
    sign * hours,
    sign * minutes,
    sign * seconds,
    sign * milliseconds,
    sign * microseconds,
    sign * nanoseconds,
    options
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
  let { hour, minute, second, millisecond, microsecond, nanosecond } = AddTime(
    GetSlot(temporalTime, ISO_HOUR),
    GetSlot(temporalTime, ISO_MINUTE),
    GetSlot(temporalTime, ISO_SECOND),
    GetSlot(temporalTime, ISO_MILLISECOND),
    GetSlot(temporalTime, ISO_MICROSECOND),
    GetSlot(temporalTime, ISO_NANOSECOND),
    sign * hours,
    sign * minutes,
    sign * seconds,
    sign * milliseconds,
    sign * microseconds,
    sign * nanoseconds
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
  ({ days } = BalanceDuration(days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds, 'day'));

  const options = GetOptionsObject(optionsParam);

  const calendar = GetSlot(yearMonth, CALENDAR);
  const fieldNames = CalendarFields(calendar, ['monthCode', 'year'] as const);
  const fields = PrepareTemporalFields(yearMonth, fieldNames, []);
  const fieldsCopy = ObjectCreate(null);
  CopyDataProperties(fieldsCopy, fields, []);
  fields.day = 1;
  // PrepareTemporalFields returns a type where 'day' is potentially undefined,
  // but TS doesn't narrow the type as a result of the assignment above.
  uncheckedAssertNarrowedType<typeof fields & { day: number }>(fields, '`day` is guaranteed to be non-undefined');
  let startDate = CalendarDateFromFields(calendar, fields);
  const sign = DurationSign(years, months, weeks, days, 0, 0, 0, 0, 0, 0);
  const dateAdd = GetMethod(calendar, 'dateAdd');
  const Duration = GetIntrinsic('%Temporal.Duration%');
  if (sign < 0) {
    const oneMonthDuration = new Duration(0, 1, 0, 0, 0, 0, 0, 0, 0, 0);
    const nextMonth = CalendarDateAdd(calendar, startDate, oneMonthDuration, undefined, dateAdd);
    const minusDayDuration = new Duration(0, 0, 0, -1, 0, 0, 0, 0, 0, 0);
    const endOfMonth = CalendarDateAdd(calendar, nextMonth, minusDayDuration, undefined, dateAdd);
    fieldsCopy.day = CalendarDay(calendar, endOfMonth);
    startDate = CalendarDateFromFields(calendar, fieldsCopy);
  }
  const durationToAdd = new Duration(years, months, weeks, days, 0, 0, 0, 0, 0, 0);
  const optionsCopy = CopyOptions(options);
  const addedDate = CalendarDateAdd(calendar, startDate, durationToAdd, options, dateAdd);
  const addedDateFields = PrepareTemporalFields(addedDate, fieldNames, []);

  return CalendarYearMonthFromFields(calendar, addedDateFields, optionsCopy);
}

export function AddDurationToOrSubtractDurationFromZonedDateTime(
  operation: AddSubtractOperation,
  zonedDateTime: Temporal.ZonedDateTime,
  durationLike: ZonedDateTimeParams['add'][0],
  optionsParam: ZonedDateTimeParams['add'][1]
): Temporal.ZonedDateTime {
  const sign = operation === 'subtract' ? -1 : 1;
  const { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } =
    ToTemporalDurationRecord(durationLike);
  const options = GetOptionsObject(optionsParam);
  const timeZone = GetSlot(zonedDateTime, TIME_ZONE);
  const calendar = GetSlot(zonedDateTime, CALENDAR);
  const epochNanoseconds = AddZonedDateTime(
    GetSlot(zonedDateTime, INSTANT),
    timeZone,
    calendar,
    sign * years,
    sign * months,
    sign * weeks,
    sign * days,
    sign * hours,
    sign * minutes,
    sign * seconds,
    sign * milliseconds,
    sign * microseconds,
    sign * nanoseconds,
    options
  );
  return CreateTemporalZonedDateTime(epochNanoseconds, timeZone, calendar);
}

function RoundNumberToIncrement(quantity: JSBI, increment: JSBI, mode: Temporal.RoundingMode) {
  if (JSBI.equal(increment, ONE)) return quantity;
  let { quotient, remainder } = divmod(quantity, increment);
  if (JSBI.equal(remainder, ZERO)) return quantity;
  const sign = JSBI.lessThan(remainder, ZERO) ? -1 : 1;
  const tiebreaker = abs(JSBI.multiply(remainder, JSBI.BigInt(2)));
  const tie = JSBI.equal(tiebreaker, increment);
  const expandIsNearer = JSBI.greaterThan(tiebreaker, increment);
  switch (mode) {
    case 'ceil':
      if (sign > 0) quotient = JSBI.add(quotient, JSBI.BigInt(sign));
      break;
    case 'floor':
      if (sign < 0) quotient = JSBI.add(quotient, JSBI.BigInt(sign));
      break;
    case 'expand':
      // always expand if there is a remainder
      quotient = JSBI.add(quotient, JSBI.BigInt(sign));
      break;
    case 'trunc':
      // no change needed, because divmod is a truncation
      break;
    case 'halfCeil':
      if (expandIsNearer || (tie && sign > 0)) {
        quotient = JSBI.add(quotient, JSBI.BigInt(sign));
      }
      break;
    case 'halfFloor':
      if (expandIsNearer || (tie && sign < 0)) {
        quotient = JSBI.add(quotient, JSBI.BigInt(sign));
      }
      break;
    case 'halfExpand':
      // "half up away from zero"
      if (expandIsNearer || tie) {
        quotient = JSBI.add(quotient, JSBI.BigInt(sign));
      }
      break;
    case 'halfTrunc':
      if (expandIsNearer) {
        quotient = JSBI.add(quotient, JSBI.BigInt(sign));
      }
      break;
    case 'halfEven':
      if (expandIsNearer || (tie && JSBI.toNumber(JSBI.remainder(abs(quotient), JSBI.BigInt(2))) === 1)) {
        quotient = JSBI.add(quotient, JSBI.BigInt(sign));
      }
      break;
  }
  return JSBI.multiply(quotient, increment);
}

export function RoundInstant(
  epochNs: JSBI,
  increment: number,
  unit: keyof typeof nsPerTimeUnit,
  roundingMode: Temporal.RoundingMode
) {
  let { remainder } = NonNegativeBigIntDivmod(epochNs, DAY_NANOS);
  const wholeDays = JSBI.subtract(epochNs, remainder);
  const roundedRemainder = RoundNumberToIncrement(
    remainder,
    JSBI.BigInt(nsPerTimeUnit[unit] * increment),
    roundingMode
  );
  return JSBI.add(wholeDays, roundedRemainder);
}

export function RoundISODateTime(
  yearParam: number,
  monthParam: number,
  dayParam: number,
  hourParam: number,
  minuteParam: number,
  secondParam: number,
  millisecondParam: number,
  microsecondParam: number,
  nanosecondParam: number,
  increment: number,
  unit: UnitSmallerThanOrEqualTo<'day'>,
  roundingMode: Temporal.RoundingMode,
  dayLengthNs = 86400e9
) {
  const { deltaDays, hour, minute, second, millisecond, microsecond, nanosecond } = RoundTime(
    hourParam,
    minuteParam,
    secondParam,
    millisecondParam,
    microsecondParam,
    nanosecondParam,
    increment,
    unit,
    roundingMode,
    dayLengthNs
  );
  const { year, month, day } = BalanceISODate(yearParam, monthParam, dayParam + deltaDays);
  return { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond };
}

export function RoundTime(
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
  microsecond: number,
  nanosecond: number,
  increment: number,
  unit: keyof typeof nsPerTimeUnit | 'day',
  roundingMode: Temporal.RoundingMode,
  dayLengthNs = 86400e9
) {
  let quantity = ZERO;
  switch (unit) {
    case 'day':
    case 'hour':
      quantity = JSBI.BigInt(hour);
    // fall through
    case 'minute':
      quantity = JSBI.add(JSBI.multiply(quantity, SIXTY), JSBI.BigInt(minute));
    // fall through
    case 'second':
      quantity = JSBI.add(JSBI.multiply(quantity, SIXTY), JSBI.BigInt(second));
    // fall through
    case 'millisecond':
      quantity = JSBI.add(JSBI.multiply(quantity, THOUSAND), JSBI.BigInt(millisecond));
    // fall through
    case 'microsecond':
      quantity = JSBI.add(JSBI.multiply(quantity, THOUSAND), JSBI.BigInt(microsecond));
    // fall through
    case 'nanosecond':
      quantity = JSBI.add(JSBI.multiply(quantity, THOUSAND), JSBI.BigInt(nanosecond));
  }
  const nsPerUnit = unit === 'day' ? dayLengthNs : nsPerTimeUnit[unit];
  const rounded = RoundNumberToIncrement(quantity, JSBI.BigInt(nsPerUnit * increment), roundingMode);
  const result = JSBI.toNumber(JSBI.divide(rounded, JSBI.BigInt(nsPerUnit)));
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

function DaysUntil(
  earlier: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime,
  later: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.ZonedDateTime
) {
  return DifferenceISODate(
    GetSlot(earlier, ISO_YEAR),
    GetSlot(earlier, ISO_MONTH),
    GetSlot(earlier, ISO_DAY),
    GetSlot(later, ISO_YEAR),
    GetSlot(later, ISO_MONTH),
    GetSlot(later, ISO_DAY),
    'day'
  ).days;
}

function MoveRelativeDate(
  calendar: CalendarSlot,
  relativeToParam: NonNullable<ReturnType<typeof ToRelativeTemporalObject>>,
  duration: Temporal.Duration,
  dateAdd: Temporal.CalendarProtocol['dateAdd'] | undefined
) {
  const later = CalendarDateAdd(calendar, relativeToParam, duration, undefined, dateAdd);
  const days = DaysUntil(relativeToParam, later);
  return { relativeTo: later, days };
}

export function MoveRelativeZonedDateTime(
  relativeTo: Temporal.ZonedDateTime,
  years: number,
  months: number,
  weeks: number,
  days: number
) {
  const timeZone = GetSlot(relativeTo, TIME_ZONE);
  const calendar = GetSlot(relativeTo, CALENDAR);
  const intermediateNs = AddZonedDateTime(
    GetSlot(relativeTo, INSTANT),
    timeZone,
    calendar,
    years,
    months,
    weeks,
    days,
    0,
    0,
    0,
    0,
    0,
    0
  );
  return CreateTemporalZonedDateTime(intermediateNs, timeZone, calendar);
}

export function AdjustRoundedDurationDays(
  yearsParam: number,
  monthsParam: number,
  weeksParam: number,
  daysParam: number,
  hoursParam: number,
  minutesParam: number,
  secondsParam: number,
  millisecondsParam: number,
  microsecondsParam: number,
  nanosecondsParam: number,
  increment: number,
  unit: Temporal.DateTimeUnit,
  roundingMode: Temporal.RoundingMode,
  relativeTo: ReturnType<typeof ToRelativeTemporalObject>
) {
  let years = yearsParam;
  let months = monthsParam;
  let weeks = weeksParam;
  let days = daysParam;
  let hours = hoursParam;
  let minutes = minutesParam;
  let seconds = secondsParam;
  let milliseconds = millisecondsParam;
  let microseconds = microsecondsParam;
  let nanoseconds = nanosecondsParam;
  if (
    !IsTemporalZonedDateTime(relativeTo) ||
    unit === 'year' ||
    unit === 'month' ||
    unit === 'week' ||
    unit === 'day' ||
    (unit === 'nanosecond' && increment === 1)
  ) {
    return { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
  }

  // There's one more round of rounding possible: if relativeTo is a
  // ZonedDateTime, the time units could have rounded up into enough hours
  // to exceed the day length. If this happens, grow the date part by a
  // single day and re-run exact time rounding on the smaller remainder. DO
  // NOT RECURSE, because once the extra hours are sucked up into the date
  // duration, there's no way for another full day to come from the next
  // round of rounding. And if it were possible (e.g. contrived calendar
  // with 30-minute-long "days") then it'd risk an infinite loop.
  let timeRemainderNs = TotalDurationNanoseconds(
    0,
    hours,
    minutes,
    seconds,
    milliseconds,
    microseconds,
    nanoseconds,
    0
  );
  const direction = MathSign(JSBI.toNumber(timeRemainderNs));

  const timeZone = GetSlot(relativeTo, TIME_ZONE);
  const calendar = GetSlot(relativeTo, CALENDAR);
  const dayStart = AddZonedDateTime(
    GetSlot(relativeTo, INSTANT),
    timeZone,
    calendar,
    years,
    months,
    weeks,
    days,
    0,
    0,
    0,
    0,
    0,
    0
  );
  const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
  const dayEnd = AddZonedDateTime(
    new TemporalInstant(dayStart),
    timeZone,
    calendar,
    0,
    0,
    0,
    direction,
    0,
    0,
    0,
    0,
    0,
    0
  );
  const dayLengthNs = JSBI.subtract(dayEnd, dayStart);

  if (
    JSBI.greaterThanOrEqual(JSBI.multiply(JSBI.subtract(timeRemainderNs, dayLengthNs), JSBI.BigInt(direction)), ZERO)
  ) {
    ({ years, months, weeks, days } = AddDuration(
      years,
      months,
      weeks,
      days,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      direction,
      0,
      0,
      0,
      0,
      0,
      0,
      relativeTo
    ));
    timeRemainderNs = RoundInstant(JSBI.subtract(timeRemainderNs, dayLengthNs), increment, unit, roundingMode);
    ({ hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = BalanceDuration(
      0,
      0,
      0,
      0,
      0,
      0,
      JSBI.toNumber(timeRemainderNs),
      'hour'
    ));
  }
  return { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
}

export function RoundDuration(
  yearsParam: number,
  monthsParam: number,
  weeksParam: number,
  daysParam: number,
  hoursParam: number,
  minutesParam: number,
  secondsParam: number,
  millisecondsParam: number,
  microsecondsParam: number,
  nanosecondsParam: number,
  increment: number,
  unit: Temporal.DateTimeUnit,
  roundingMode: Temporal.RoundingMode,
  relativeToParam: ReturnType<typeof ToRelativeTemporalObject> = undefined
) {
  let years = yearsParam;
  let months = monthsParam;
  let weeks = weeksParam;
  let days = daysParam;
  let hours = hoursParam;
  let minutes = minutesParam;
  let seconds = secondsParam;
  let milliseconds = millisecondsParam;
  let microseconds = microsecondsParam;
  let nanoseconds = JSBI.BigInt(nanosecondsParam);
  const TemporalDuration = GetIntrinsic('%Temporal.Duration%');
  let calendar, zdtRelative;
  // A cast is used below because relativeTo will be either PlainDate or
  // undefined for the rest of this long method (after any ZDT=>PlainDate
  // conversion below), and TS isn't smart enough to know that the type has
  // changed. See https://github.com/microsoft/TypeScript/issues/27706.
  let relativeTo = relativeToParam as Temporal.PlainDate | undefined;
  if (relativeTo) {
    if (IsTemporalZonedDateTime(relativeTo)) {
      zdtRelative = relativeTo;
      relativeTo = ToTemporalDate(relativeTo);
    } else if (!IsTemporalDate(relativeTo)) {
      throw new TypeError('starting point must be PlainDate or ZonedDateTime');
    }
    calendar = GetSlot(relativeTo, CALENDAR);
  }

  // First convert time units up to days, if rounding to days or higher units.
  // If rounding relative to a ZonedDateTime, then some days may not be 24h.
  // TS doesn't know that `dayLengthNs` is only used if the unit is day or
  // larger. We'll cast away `undefined` when it's used lower down below.
  let dayLengthNs: JSBI | undefined;
  if (unit === 'year' || unit === 'month' || unit === 'week' || unit === 'day') {
    nanoseconds = TotalDurationNanoseconds(0, hours, minutes, seconds, milliseconds, microseconds, nanosecondsParam, 0);
    let intermediate;
    if (zdtRelative) {
      intermediate = MoveRelativeZonedDateTime(zdtRelative, years, months, weeks, days);
    }
    let deltaDays;
    let dayLength: number;
    ({ days: deltaDays, nanoseconds, dayLengthNs: dayLength } = NanosecondsToDays(nanoseconds, intermediate));
    dayLengthNs = JSBI.BigInt(dayLength);
    days += deltaDays;
    hours = minutes = seconds = milliseconds = microseconds = 0;
  }

  let total: number;
  switch (unit) {
    case 'year': {
      if (!calendar) throw new RangeError('A starting point is required for years rounding');
      assertExists(relativeTo);

      // convert months and weeks to days by calculating difference(
      // relativeTo + years, relativeTo + { years, months, weeks })
      const yearsDuration = new TemporalDuration(years);
      const dateAdd = typeof calendar !== 'string' ? GetMethod(calendar, 'dateAdd') : undefined;
      const yearsLater = CalendarDateAdd(calendar, relativeTo, yearsDuration, undefined, dateAdd);
      const yearsMonthsWeeks = new TemporalDuration(years, months, weeks);
      const yearsMonthsWeeksLater = CalendarDateAdd(calendar, relativeTo, yearsMonthsWeeks, undefined, dateAdd);
      const monthsWeeksInDays = DaysUntil(yearsLater, yearsMonthsWeeksLater);
      relativeTo = yearsLater;
      days += monthsWeeksInDays;

      const wholeDays = new TemporalDuration(0, 0, 0, days);
      const wholeDaysLater = CalendarDateAdd(calendar, relativeTo, wholeDays, undefined, dateAdd);
      const untilOptions = ObjectCreate(null) as Temporal.DifferenceOptions<typeof unit>;
      untilOptions.largestUnit = 'year';
      const yearsPassed = CalendarDateUntil(calendar, relativeTo, wholeDaysLater, untilOptions).years;
      years += yearsPassed;
      const oldRelativeTo = relativeTo;
      const yearsPassedDuration = new TemporalDuration(yearsPassed);
      relativeTo = CalendarDateAdd(calendar, relativeTo, yearsPassedDuration, undefined, dateAdd);
      const daysPassed = DaysUntil(oldRelativeTo, relativeTo);
      days -= daysPassed;
      const oneYear = new TemporalDuration(days < 0 ? -1 : 1);
      let { days: oneYearDays } = MoveRelativeDate(calendar, relativeTo, oneYear, dateAdd);

      // Note that `nanoseconds` below (here and in similar code for months,
      // weeks, and days further below) isn't actually nanoseconds for the
      // full date range.  Instead, it's a BigInt representation of total
      // days multiplied by the number of nanoseconds in the last day of
      // the duration. This lets us do days-or-larger rounding using BigInt
      // math which reduces precision loss.
      oneYearDays = MathAbs(oneYearDays);
      // dayLengthNs is never undefined if unit is `day` or larger.
      assertExists(dayLengthNs);
      const divisor = JSBI.multiply(JSBI.BigInt(oneYearDays), dayLengthNs);
      nanoseconds = JSBI.add(
        JSBI.add(JSBI.multiply(divisor, JSBI.BigInt(years)), JSBI.multiply(JSBI.BigInt(days), dayLengthNs)),
        nanoseconds
      );
      const rounded = RoundNumberToIncrement(nanoseconds, JSBI.multiply(divisor, JSBI.BigInt(increment)), roundingMode);
      total = BigIntDivideToNumber(nanoseconds, divisor);
      years = JSBI.toNumber(JSBI.divide(rounded, divisor));
      nanoseconds = ZERO;
      months = weeks = days = 0;
      break;
    }
    case 'month': {
      if (!calendar) throw new RangeError('A starting point is required for months rounding');
      assertExists(relativeTo);

      // convert weeks to days by calculating difference(relativeTo +
      //   { years, months }, relativeTo + { years, months, weeks })
      const yearsMonths = new TemporalDuration(years, months);
      const dateAdd = typeof calendar !== 'string' ? GetMethod(calendar, 'dateAdd') : undefined;
      const yearsMonthsLater = CalendarDateAdd(calendar, relativeTo, yearsMonths, undefined, dateAdd);
      const yearsMonthsWeeks = new TemporalDuration(years, months, weeks);
      const yearsMonthsWeeksLater = CalendarDateAdd(calendar, relativeTo, yearsMonthsWeeks, undefined, dateAdd);
      const weeksInDays = DaysUntil(yearsMonthsLater, yearsMonthsWeeksLater);
      relativeTo = yearsMonthsLater;
      days += weeksInDays;

      // Months may be different lengths of days depending on the calendar,
      // convert days to months in a loop as described above under 'years'.
      const sign = MathSign(days);
      const oneMonth = new TemporalDuration(0, days < 0 ? -1 : 1);
      let oneMonthDays: number;
      ({ relativeTo, days: oneMonthDays } = MoveRelativeDate(calendar, relativeTo, oneMonth, dateAdd));
      while (MathAbs(days) >= MathAbs(oneMonthDays)) {
        months += sign;
        days -= oneMonthDays;
        ({ relativeTo, days: oneMonthDays } = MoveRelativeDate(calendar, relativeTo, oneMonth, dateAdd));
      }
      oneMonthDays = MathAbs(oneMonthDays);
      // dayLengthNs is never undefined if unit is `day` or larger.
      assertExists(dayLengthNs);
      const divisor = JSBI.multiply(JSBI.BigInt(oneMonthDays), dayLengthNs);
      nanoseconds = JSBI.add(
        JSBI.add(JSBI.multiply(divisor, JSBI.BigInt(months)), JSBI.multiply(JSBI.BigInt(days), dayLengthNs)),
        nanoseconds
      );
      const rounded = RoundNumberToIncrement(nanoseconds, JSBI.multiply(divisor, JSBI.BigInt(increment)), roundingMode);
      total = BigIntDivideToNumber(nanoseconds, divisor);
      months = JSBI.toNumber(JSBI.divide(rounded, divisor));
      nanoseconds = ZERO;
      weeks = days = 0;
      break;
    }
    case 'week': {
      if (!calendar) throw new RangeError('A starting point is required for weeks rounding');
      assertExists(relativeTo);

      // Weeks may be different lengths of days depending on the calendar,
      // convert days to weeks in a loop as described above under 'years'.
      const sign = MathSign(days);
      const oneWeek = new TemporalDuration(0, 0, days < 0 ? -1 : 1);
      const dateAdd = typeof calendar !== 'string' ? GetMethod(calendar, 'dateAdd') : undefined;
      let oneWeekDays;
      ({ relativeTo, days: oneWeekDays } = MoveRelativeDate(calendar, relativeTo, oneWeek, dateAdd));
      while (MathAbs(days) >= MathAbs(oneWeekDays)) {
        weeks += sign;
        days -= oneWeekDays;
        ({ relativeTo, days: oneWeekDays } = MoveRelativeDate(calendar, relativeTo, oneWeek, dateAdd));
      }
      oneWeekDays = MathAbs(oneWeekDays);
      // dayLengthNs is never undefined if unit is `day` or larger.
      assertExists(dayLengthNs);
      const divisor = JSBI.multiply(JSBI.BigInt(oneWeekDays), dayLengthNs);
      nanoseconds = JSBI.add(
        JSBI.add(JSBI.multiply(divisor, JSBI.BigInt(weeks)), JSBI.multiply(JSBI.BigInt(days), dayLengthNs)),
        nanoseconds
      );
      const rounded = RoundNumberToIncrement(nanoseconds, JSBI.multiply(divisor, JSBI.BigInt(increment)), roundingMode);
      total = BigIntDivideToNumber(nanoseconds, divisor);
      weeks = JSBI.toNumber(JSBI.divide(rounded, divisor));
      nanoseconds = ZERO;
      days = 0;
      break;
    }
    case 'day': {
      // dayLengthNs is never undefined if unit is `day` or larger.
      assertExists(dayLengthNs);
      const divisor = dayLengthNs;
      nanoseconds = JSBI.add(JSBI.multiply(divisor, JSBI.BigInt(days)), nanoseconds);
      const rounded = RoundNumberToIncrement(nanoseconds, JSBI.multiply(divisor, JSBI.BigInt(increment)), roundingMode);
      total = BigIntDivideToNumber(nanoseconds, divisor);
      days = JSBI.toNumber(JSBI.divide(rounded, divisor));
      nanoseconds = ZERO;
      break;
    }
    case 'hour': {
      const divisor = 3600e9;
      let allNanoseconds = JSBI.multiply(JSBI.BigInt(hours), JSBI.BigInt(3600e9));
      allNanoseconds = JSBI.add(allNanoseconds, JSBI.multiply(JSBI.BigInt(minutes), JSBI.BigInt(60e9)));
      allNanoseconds = JSBI.add(allNanoseconds, JSBI.multiply(JSBI.BigInt(seconds), BILLION));
      allNanoseconds = JSBI.add(allNanoseconds, JSBI.multiply(JSBI.BigInt(milliseconds), MILLION));
      allNanoseconds = JSBI.add(allNanoseconds, JSBI.multiply(JSBI.BigInt(microseconds), THOUSAND));
      allNanoseconds = JSBI.add(allNanoseconds, nanoseconds);
      total = BigIntDivideToNumber(allNanoseconds, JSBI.BigInt(divisor));
      const rounded = RoundNumberToIncrement(allNanoseconds, JSBI.BigInt(divisor * increment), roundingMode);
      hours = JSBI.toNumber(JSBI.divide(rounded, JSBI.BigInt(divisor)));
      nanoseconds = ZERO;
      minutes = seconds = milliseconds = microseconds = 0;
      break;
    }
    case 'minute': {
      const divisor = 60e9;
      let allNanoseconds = JSBI.multiply(JSBI.BigInt(minutes), JSBI.BigInt(60e9));
      allNanoseconds = JSBI.add(allNanoseconds, JSBI.multiply(JSBI.BigInt(seconds), BILLION));
      allNanoseconds = JSBI.add(allNanoseconds, JSBI.multiply(JSBI.BigInt(milliseconds), MILLION));
      allNanoseconds = JSBI.add(allNanoseconds, JSBI.multiply(JSBI.BigInt(microseconds), THOUSAND));
      allNanoseconds = JSBI.add(allNanoseconds, nanoseconds);
      total = BigIntDivideToNumber(allNanoseconds, JSBI.BigInt(divisor));
      const rounded = RoundNumberToIncrement(allNanoseconds, JSBI.BigInt(divisor * increment), roundingMode);
      minutes = JSBI.toNumber(JSBI.divide(rounded, JSBI.BigInt(divisor)));
      nanoseconds = ZERO;
      seconds = milliseconds = microseconds = 0;
      break;
    }
    case 'second': {
      const divisor = 1e9;
      let allNanoseconds = JSBI.multiply(JSBI.BigInt(seconds), BILLION);
      allNanoseconds = JSBI.add(allNanoseconds, JSBI.multiply(JSBI.BigInt(milliseconds), MILLION));
      allNanoseconds = JSBI.add(allNanoseconds, JSBI.multiply(JSBI.BigInt(microseconds), THOUSAND));
      allNanoseconds = JSBI.add(allNanoseconds, nanoseconds);
      total = BigIntDivideToNumber(allNanoseconds, JSBI.BigInt(divisor));
      const rounded = RoundNumberToIncrement(allNanoseconds, JSBI.BigInt(divisor * increment), roundingMode);
      seconds = JSBI.toNumber(JSBI.divide(rounded, JSBI.BigInt(divisor)));
      nanoseconds = ZERO;
      milliseconds = microseconds = 0;
      break;
    }
    case 'millisecond': {
      const divisor = 1e6;
      let allNanoseconds = JSBI.multiply(JSBI.BigInt(milliseconds), MILLION);
      allNanoseconds = JSBI.add(allNanoseconds, JSBI.multiply(JSBI.BigInt(microseconds), THOUSAND));
      allNanoseconds = JSBI.add(allNanoseconds, nanoseconds);
      total = BigIntDivideToNumber(allNanoseconds, JSBI.BigInt(divisor));
      const rounded = RoundNumberToIncrement(allNanoseconds, JSBI.BigInt(divisor * increment), roundingMode);
      milliseconds = JSBI.toNumber(JSBI.divide(rounded, JSBI.BigInt(divisor)));
      nanoseconds = ZERO;
      microseconds = 0;
      break;
    }
    case 'microsecond': {
      const divisor = 1e3;
      let allNanoseconds = JSBI.multiply(JSBI.BigInt(microseconds), THOUSAND);
      allNanoseconds = JSBI.add(allNanoseconds, nanoseconds);
      total = BigIntDivideToNumber(allNanoseconds, JSBI.BigInt(divisor));
      const rounded = RoundNumberToIncrement(allNanoseconds, JSBI.BigInt(divisor * increment), roundingMode);
      microseconds = JSBI.toNumber(JSBI.divide(rounded, JSBI.BigInt(divisor)));
      nanoseconds = ZERO;
      break;
    }
    case 'nanosecond': {
      total = JSBI.toNumber(nanoseconds);
      nanoseconds = RoundNumberToIncrement(JSBI.BigInt(nanoseconds), JSBI.BigInt(increment), roundingMode);
      break;
    }
  }
  return {
    years,
    months,
    weeks,
    days,
    hours,
    minutes,
    seconds,
    milliseconds,
    microseconds,
    nanoseconds: JSBI.toNumber(nanoseconds),
    total
  };
}

export function CompareISODate(y1: number, m1: number, d1: number, y2: number, m2: number, d2: number) {
  for (const [x, y] of [
    [y1, y2],
    [m1, m2],
    [d1, d2]
  ]) {
    if (x !== y) return ComparisonResult(x - y);
  }
  return 0;
}

// Not abstract operations from the spec

function NonNegativeBigIntDivmod(x: JSBI, y: JSBI) {
  let { quotient, remainder } = divmod(x, y);
  if (JSBI.lessThan(remainder, ZERO)) {
    quotient = JSBI.subtract(quotient, ONE);
    remainder = JSBI.add(remainder, y);
  }
  return { quotient, remainder };
}

export function BigIntFloorDiv(left: JSBI, right: JSBI) {
  const { quotient, remainder } = divmod(left, right);
  if (!isZero(remainder) && !isNegativeJSBI(left) != !isNegativeJSBI(right)) {
    return JSBI.subtract(quotient, ONE);
  }
  return quotient;
}

/** Divide two JSBIs, and return the result as a Number, including the remainder. */
export function BigIntDivideToNumber(dividend: JSBI, divisor: JSBI) {
  const { quotient, remainder } = divmod(dividend, divisor);
  const result = JSBI.toNumber(quotient) + JSBI.toNumber(remainder) / JSBI.toNumber(divisor);
  return result;
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

function CopyOptions<T extends { [s in K]?: unknown }, K extends string & keyof T>(options: T | undefined) {
  const optionsCopy = ObjectCreate(null) as T;
  CopyDataProperties(optionsCopy, GetOptionsObject(options), []);
  return optionsCopy;
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
  Fallback extends Required<O>[P] | undefined
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
  return fallback;
}

export function IsBuiltinCalendar(id: string): id is BuiltinCalendarId {
  return BUILTIN_CALENDAR_IDS.includes(ASCIILowercase(id));
}

export function ASCIILowercase<T extends string>(str: T): T {
  // The spec defines this operation distinct from String.prototype.lowercase,
  // so we'll follow the spec here. Note that nasty security issues that can
  // happen for some use cases if you're comparing case-modified non-ASCII
  // values. For example, Turkish's "I" character was the source of a security
  // issue involving "file://" URLs. See
  // https://haacked.com/archive/2012/07/05/turkish-i-problem-and-why-you-should-care.aspx/.
  return str.replace(/[A-Z]/g, (l) => {
    const code = l.charCodeAt(0);
    return String.fromCharCode(code + 0x20);
  }) as T;
}

const OFFSET = new RegExp(`^${PARSE.offset.source}$`);

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

const nsPerTimeUnit = {
  hour: 3600e9,
  minute: 60e9,
  second: 1e9,
  millisecond: 1e6,
  microsecond: 1e3,
  nanosecond: 1
};
