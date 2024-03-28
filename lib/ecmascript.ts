const ArrayIncludes = Array.prototype.includes;
const ArrayPrototypeMap = Array.prototype.map;
const ArrayPrototypePush = Array.prototype.push;
const ArrayPrototypeFind = Array.prototype.find;
const ArrayPrototypeSlice = Array.prototype.slice;
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
const ObjectGetOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
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
  maxJSBI,
  MILLION,
  minJSBI,
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
  CalendarProtocolParams,
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
  FieldKey,
  TimeZoneSlot
} from './internaltypes';
import { GetIntrinsic } from './intrinsicclass';
import { ApplyUnsignedRoundingMode, FMAPowerOf10, GetUnsignedRoundingMode, TruncatingDivModByPowerOf10 } from './math';
import { CalendarMethodRecord, TimeZoneMethodRecord } from './methodrecord';
import { TimeDuration } from './timeduration';
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
  if (ENABLE_ASSERTS) {
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

type BuiltinCastFunction = (v: unknown) => string | number;
const BUILTIN_CASTS = new Map<AnyTemporalKey, BuiltinCastFunction>([
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
  ['offset', ToPrimitiveAndRequireString]
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
  if (yearString[0] === '\u2212') yearString = `-${yearString.slice(1)}`;
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
    hasTime,
    hour,
    minute,
    second,
    millisecond,
    microsecond,
    nanosecond,
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
    calendar = processAnnotations(match[3]);
    let yearString = match[1];
    if (yearString[0] === '\u2212') yearString = `-${yearString.slice(1)}`;
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

function ToTemporalPartialDurationRecord(temporalDurationLike: Temporal.DurationLike | string) {
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

export function GetTemporalRoundingIncrementOption(options: { roundingIncrement?: number }) {
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
  | { zonedRelativeTo?: Temporal.ZonedDateTime; timeZoneRec?: TimeZoneMethodRecord; plainRelativeTo?: never }
  | { plainRelativeTo?: Temporal.PlainDate; timeZoneRec?: never; zonedRelativeTo?: never } {
  const relativeTo = options.relativeTo;
  if (relativeTo === undefined) return {};

  let offsetBehaviour: OffsetBehaviour = 'option';
  let matchMinutes = false;
  let year, month, day, hour, minute, second, millisecond, microsecond, nanosecond, calendar, timeZone, offset;
  if (IsObject(relativeTo)) {
    if (IsTemporalZonedDateTime(relativeTo)) {
      const timeZoneRec = new TimeZoneMethodRecord(GetSlot(relativeTo, TIME_ZONE), [
        'getOffsetNanosecondsFor',
        'getPossibleInstantsFor'
      ]);
      return { zonedRelativeTo: relativeTo, timeZoneRec };
    }
    if (IsTemporalDate(relativeTo)) return { plainRelativeTo: relativeTo };
    if (IsTemporalDateTime(relativeTo)) return { plainRelativeTo: TemporalDateTimeToDate(relativeTo) };
    calendar = GetTemporalCalendarSlotValueWithISODefault(relativeTo);
    const calendarRec = new CalendarMethodRecord(calendar, ['dateFromFields', 'fields']);
    const fields = PrepareCalendarFields(
      calendarRec,
      relativeTo,
      ['day', 'month', 'monthCode', 'year'],
      ['hour', 'microsecond', 'millisecond', 'minute', 'nanosecond', 'offset', 'second', 'timeZone'],
      []
    );
    const dateOptions = ObjectCreate(null) as Temporal.AssignmentOptions;
    dateOptions.overflow = 'constrain';
    ({ year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } = InterpretTemporalDateTimeFields(
      calendarRec,
      fields,
      dateOptions
    ));
    offset = fields.offset;
    if (offset === undefined) offsetBehaviour = 'wall';
    timeZone = fields.timeZone;
    if (timeZone !== undefined) timeZone = ToTemporalTimeZoneSlotValue(timeZone);
  } else {
    let tzAnnotation, z;
    ({
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
      tzAnnotation,
      offset,
      z
    } = ParseISODateTime(RequireString(relativeTo)));
    if (tzAnnotation) {
      timeZone = ToTemporalTimeZoneSlotValue(tzAnnotation);
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
  if (timeZone === undefined) return { plainRelativeTo: CreateTemporalDate(year, month, day, calendar) };
  const timeZoneRec = new TimeZoneMethodRecord(timeZone, ['getOffsetNanosecondsFor', 'getPossibleInstantsFor']);
  const offsetNs = offsetBehaviour === 'option' ? ParseDateTimeUTCOffset(castExists(offset)) : 0;
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
    timeZoneRec,
    'compatible',
    'reject',
    matchMinutes
  );
  return { zonedRelativeTo: CreateTemporalZonedDateTime(epochNanoseconds, timeZone, calendar), timeZoneRec };
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
  const entries = [
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
  ] as const;
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    const prop = entry[0];
    const v = entry[1];
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

export function IsCalendarUnit(unit: Temporal.DateTimeUnit): unit is Exclude<Temporal.DateUnit, 'day'> {
  return unit === 'year' || unit === 'month' || unit === 'week';
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

export interface CalendarFieldDescriptor {
  property: string;
  conversion: (value: unknown) => unknown;
  required: boolean;
}

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
  extraFieldDescriptors: CalendarFieldDescriptor[] = [],
  duplicateBehaviour: 'throw' | 'ignore' = 'throw',
  { emptySourceErrorMessage }: FieldPrepareOptions = { emptySourceErrorMessage: 'no supported properties found' }
): PrepareTemporalFieldsReturn<FieldKeys, RequiredFields, Owner<FieldKeys>> {
  const result: Partial<Record<AnyTemporalKey, unknown>> = ObjectCreate(null);
  let any = false;
  if (extraFieldDescriptors) {
    for (let index = 0; index < extraFieldDescriptors.length; index++) {
      let desc = extraFieldDescriptors[index];
      Call(ArrayPrototypePush, fields, [desc.property]);
      if (desc.required === true && requiredFields !== 'partial') {
        Call(ArrayPrototypePush, requiredFields, [desc.property]);
      }
    }
  }
  fields.sort();
  let previousProperty = undefined;
  for (let index = 0; index < fields.length; index++) {
    const property = fields[index];
    if ((property as string) === 'constructor' || (property as string) === '__proto__') {
      throw new RangeError(`Calendar fields cannot be named ${property}`);
    }
    if (property !== previousProperty) {
      let value = bag[property];
      if (value !== undefined) {
        any = true;
        if (BUILTIN_CASTS.has(property)) {
          value = castExists(BUILTIN_CASTS.get(property))(value);
        } else if (extraFieldDescriptors) {
          const matchingDescriptor = Call(ArrayPrototypeFind, extraFieldDescriptors, [
            (desc) => desc.property === property
          ]);
          if (matchingDescriptor) {
            const convertor = matchingDescriptor.conversion;
            value = convertor(value);
          }
        }
        result[property] = value;
      } else if (requiredFields !== 'partial') {
        if (Call(ArrayIncludes, requiredFields, [property])) {
          throw new TypeError(`required property '${property}' missing or undefined`);
        }
        value = BUILTIN_DEFAULTS.get(property);
        result[property] = value;
      }
    } else if (duplicateBehaviour === 'throw') {
      throw new RangeError('Duplicate calendar fields');
    }
    previousProperty = property;
  }
  if (requiredFields === 'partial' && !any) {
    throw new TypeError(emptySourceErrorMessage);
  }
  return result as unknown as PrepareTemporalFieldsReturn<FieldKeys, RequiredFields, Owner<FieldKeys>>;
}

export function PrepareCalendarFieldsAndFieldNames(
  calendarRec: CalendarMethodRecord,
  bag: Partial<Record<FieldKey, unknown>>,
  calendarFieldNames: FieldKey[],
  nonCalendarFieldNames: FieldKey[] = [],
  requiredFieldNames: FieldKey[] = []
): {
  fields: PrepareTemporalFieldsReturn<FieldKey, FieldKey[], Owner<FieldKey>>;
  fieldNames: FieldKey[];
} {
  // Special-case built-in method, because we should skip the observable array
  // iteration in Calendar.prototype.fields
  let fieldNames: FieldKey[];
  if (typeof calendarRec.receiver === 'string') {
    if (calendarRec.receiver !== 'iso8601') {
      fieldNames = GetIntrinsic('%calendarFieldsImpl%')(calendarRec.receiver, calendarFieldNames);
    } else {
      fieldNames = Call(ArrayPrototypeSlice, calendarFieldNames, []);
    }
  } else {
    fieldNames = [];
    for (const name of calendarRec.fields(calendarFieldNames)) {
      if (typeof name !== 'string') throw new TypeError('bad return from calendar.fields()');
      Call(ArrayPrototypePush, fieldNames, [name]);
    }
  }
  Call(ArrayPrototypePush, fieldNames, nonCalendarFieldNames);
  const fields = PrepareTemporalFields(bag, fieldNames, requiredFieldNames);
  return { fields, fieldNames };
}

export function PrepareCalendarFields(
  calendarRec: CalendarMethodRecord,
  bag: Partial<Record<FieldKey, unknown>>,
  calendarFieldNames: FieldKey[],
  nonCalendarFieldNames: FieldKey[],
  requiredFieldNames: FieldKey[]
): PrepareTemporalFieldsReturn<FieldKey, FieldKey[], Owner<FieldKey>> {
  const { fields } = PrepareCalendarFieldsAndFieldNames(
    calendarRec,
    bag,
    calendarFieldNames,
    nonCalendarFieldNames,
    requiredFieldNames
  );
  return fields;
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
  const partial = PrepareTemporalFields(bag, fields, 'partial', undefined, undefined, {
    emptySourceErrorMessage: 'invalid time-like'
  });
  const result: Partial<TimeRecord> = {};
  for (let index = 0; index < fields.length; index++) {
    const field = fields[index];
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
  optionsParam?: PlainDateParams['from'][1]
): Temporal.PlainDate {
  let options = optionsParam;
  if (options !== undefined) options = SnapshotOwnProperties(GetOptionsObject(options), null);
  let item = itemParam;
  if (IsObject(item)) {
    if (IsTemporalDate(item)) return item;
    if (IsTemporalZonedDateTime(item)) {
      GetTemporalOverflowOption(options); // validate and ignore
      const timeZoneRec = new TimeZoneMethodRecord(GetSlot(item, TIME_ZONE), ['getOffsetNanosecondsFor']);
      const pdt = GetPlainDateTimeFor(timeZoneRec, GetSlot(item, INSTANT), GetSlot(item, CALENDAR));
      return CreateTemporalDate(
        GetSlot(pdt, ISO_YEAR),
        GetSlot(pdt, ISO_MONTH),
        GetSlot(pdt, ISO_DAY),
        GetSlot(pdt, CALENDAR)
      );
    }
    if (IsTemporalDateTime(item)) {
      GetTemporalOverflowOption(options); // validate and ignore
      return CreateTemporalDate(
        GetSlot(item, ISO_YEAR),
        GetSlot(item, ISO_MONTH),
        GetSlot(item, ISO_DAY),
        GetSlot(item, CALENDAR)
      );
    }
    const calendarRec = new CalendarMethodRecord(GetTemporalCalendarSlotValueWithISODefault(item), [
      'dateFromFields',
      'fields'
    ]);
    const fields = PrepareCalendarFields(calendarRec, item, ['day', 'month', 'monthCode', 'year'], [], []);
    return CalendarDateFromFields(calendarRec, fields, options);
  }
  let { year, month, day, calendar, z } = ParseTemporalDateString(RequireString(item));
  if (z) throw new RangeError('Z designator not supported for PlainDate');
  if (!calendar) calendar = 'iso8601';
  if (!IsBuiltinCalendar(calendar)) throw new RangeError(`invalid calendar identifier ${calendar}`);
  calendar = ASCIILowercase(calendar);
  GetTemporalOverflowOption(options); // validate and ignore
  return CreateTemporalDate(year, month, day, calendar);
}

export function InterpretTemporalDateTimeFields(
  calendarRec: CalendarMethodRecord,
  fields: PrimitiveFieldsOf<Temporal.PlainDateTimeLike> & Parameters<typeof CalendarDateFromFields>[1],
  options: Temporal.AssignmentOptions
) {
  // dateFromFields must be looked up
  let { hour, minute, second, millisecond, microsecond, nanosecond } = ToTemporalTimeRecord(fields);
  const overflow = GetTemporalOverflowOption(options);
  options.overflow = overflow; // options is always an internal object, so not observable
  const date = CalendarDateFromFields(calendarRec, fields, options);
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
  const resolvedOptions = SnapshotOwnProperties(GetOptionsObject(options), null);

  if (IsObject(item)) {
    if (IsTemporalDateTime(item)) return item;
    if (IsTemporalZonedDateTime(item)) {
      GetTemporalOverflowOption(resolvedOptions); // validate and ignore
      const timeZoneRec = new TimeZoneMethodRecord(GetSlot(item, TIME_ZONE), ['getOffsetNanosecondsFor']);
      return GetPlainDateTimeFor(timeZoneRec, GetSlot(item, INSTANT), GetSlot(item, CALENDAR));
    }
    if (IsTemporalDate(item)) {
      GetTemporalOverflowOption(resolvedOptions); // validate and ignore
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
    const calendarRec = new CalendarMethodRecord(calendar, ['dateFromFields', 'fields']);
    const fields = PrepareCalendarFields(
      calendarRec,
      item,
      ['day', 'month', 'monthCode', 'year'],
      ['hour', 'microsecond', 'millisecond', 'minute', 'nanosecond', 'second'],
      []
    );
    ({ year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } = InterpretTemporalDateTimeFields(
      calendarRec,
      fields,
      resolvedOptions
    ));
  } else {
    let z;
    ({ year, month, day, hour, minute, second, millisecond, microsecond, nanosecond, calendar, z } =
      ParseTemporalDateTimeString(RequireString(item)));
    if (z) throw new RangeError('Z designator not supported for PlainDateTime');
    RejectDateTime(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond);
    if (!calendar) calendar = 'iso8601';
    if (!IsBuiltinCalendar(calendar)) throw new RangeError(`invalid calendar identifier ${calendar}`);
    calendar = ASCIILowercase(calendar);
    GetTemporalOverflowOption(resolvedOptions); // validate and ignore
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
  const { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond, offset, z } =
    ParseTemporalInstantString(RequireString(item));

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

export function ToTemporalMonthDay(
  itemParam: PlainMonthDayParams['from'][0],
  optionsParam?: PlainMonthDayParams['from'][1]
) {
  let options = optionsParam;
  if (options !== undefined) options = SnapshotOwnProperties(GetOptionsObject(options), null);
  let item = itemParam;
  if (IsObject(item)) {
    if (IsTemporalMonthDay(item)) return item;
    let calendar: CalendarSlot;
    if (HasSlot(item, CALENDAR)) {
      calendar = GetSlot(item, CALENDAR);
    } else {
      let calendarFromItem = item.calendar;
      if (calendarFromItem === undefined) calendarFromItem = 'iso8601';
      calendar = ToTemporalCalendarSlotValue(calendarFromItem);
    }
    const calendarRec = new CalendarMethodRecord(calendar, ['fields', 'monthDayFromFields']);
    const fields = PrepareCalendarFields(calendarRec, item, ['day', 'month', 'monthCode', 'year'], [], []);
    return CalendarMonthDayFromFields(calendarRec, fields, options);
  }

  let { month, day, referenceISOYear, calendar } = ParseTemporalMonthDayString(RequireString(item));
  if (calendar === undefined) calendar = 'iso8601';
  if (!IsBuiltinCalendar(calendar)) throw new RangeError(`invalid calendar identifier ${calendar}`);
  calendar = ASCIILowercase(calendar);
  GetTemporalOverflowOption(options); // validate and ignore

  if (referenceISOYear === undefined) {
    if (calendar !== 'iso8601') {
      throw new Error(`assertion failed: missing year with non-"iso8601" calendar identifier ${calendar}`);
    }
    RejectISODate(1972, month, day);
    return CreateTemporalMonthDay(month, day, calendar);
  }
  const result = CreateTemporalMonthDay(month, day, calendar, referenceISOYear);
  const calendarRec = new CalendarMethodRecord(calendar, ['monthDayFromFields']);
  return CalendarMonthDayFromFields(calendarRec, result);
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
      const timeZoneRec = new TimeZoneMethodRecord(GetSlot(item, TIME_ZONE), ['getOffsetNanosecondsFor']);
      item = GetPlainDateTimeFor(timeZoneRec, GetSlot(item, INSTANT), GetSlot(item, CALENDAR));
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
    ({ hour, minute, second, millisecond, microsecond, nanosecond } = ParseTemporalTimeString(RequireString(item)));
    RejectTime(hour, minute, second, millisecond, microsecond, nanosecond);
  }
  const TemporalPlainTime = GetIntrinsic('%Temporal.PlainTime%');
  return new TemporalPlainTime(hour, minute, second, millisecond, microsecond, nanosecond);
}

export function ToTemporalTimeOrMidnight(item: string | Temporal.PlainTime | Temporal.PlainTimeLike | undefined) {
  const TemporalPlainTime = GetIntrinsic('%Temporal.PlainTime%');
  if (item === undefined) return new TemporalPlainTime();
  return ToTemporalTime(item);
}

export function ToTemporalYearMonth(
  item: PlainYearMonthParams['from'][0],
  optionsParam?: PlainYearMonthParams['from'][1]
): Temporal.PlainYearMonth {
  let options = optionsParam;
  if (options !== undefined) options = SnapshotOwnProperties(GetOptionsObject(options), null);
  if (IsObject(item)) {
    if (IsTemporalYearMonth(item)) return item;
    const calendar = GetTemporalCalendarSlotValueWithISODefault(item);
    const calendarRec = new CalendarMethodRecord(calendar, ['fields', 'yearMonthFromFields']);
    const fields = PrepareCalendarFields(calendarRec, item, ['month', 'monthCode', 'year'], [], []);
    return CalendarYearMonthFromFields(calendarRec, fields, options);
  }

  let { year, month, referenceISODay, calendar } = ParseTemporalYearMonthString(RequireString(item));
  if (calendar === undefined) calendar = 'iso8601';
  if (!IsBuiltinCalendar(calendar)) throw new RangeError(`invalid calendar identifier ${calendar}`);
  calendar = ASCIILowercase(calendar);
  GetTemporalOverflowOption(options); // validate and ignore

  const result = CreateTemporalYearMonth(year, month, calendar, referenceISODay);
  const calendarRec = new CalendarMethodRecord(calendar, ['yearMonthFromFields']);
  return CalendarYearMonthFromFields(calendarRec, result);
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
  timeZoneRec: TimeZoneMethodRecord,
  disambiguation: NonNullable<Temporal.ToInstantOptions['disambiguation']>,
  offsetOpt: Temporal.OffsetDisambiguationOptions['offset'],
  matchMinute: boolean
) {
  // getPossibleInstantsFor and getOffsetNanosecondsFor should be looked up.
  const dt = CreateTemporalDateTime(
    year,
    month,
    day,
    hour,
    minute,
    second,
    millisecond,
    microsecond,
    nanosecond,
    'iso8601'
  );

  if (offsetBehaviour === 'wall' || offsetOpt === 'ignore') {
    // Simple case: ISO string without a TZ offset (or caller wants to ignore
    // the offset), so just convert DateTime to Instant in the given time zone
    const instant = GetInstantFor(timeZoneRec, dt, disambiguation);
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
      nanosecond,
      offsetNs
    );
    ValidateEpochNanoseconds(epochNs);
    return epochNs;
  }

  // "prefer" or "reject"
  const possibleInstants = GetPossibleInstantsFor(timeZoneRec, dt);
  if (possibleInstants.length > 0) {
    for (let index = 0; index < possibleInstants.length; index++) {
      const candidate = possibleInstants[index];
      const candidateOffset = GetOffsetNanosecondsFor(timeZoneRec, candidate);
      const roundedCandidateOffset = RoundNumberToIncrement(candidateOffset, 60e9, 'halfExpand');
      if (candidateOffset === offsetNs || (matchMinute && roundedCandidateOffset === offsetNs)) {
        return GetSlot(candidate, EPOCHNANOSECONDS);
      }
    }
  }

  // the user-provided offset doesn't match any instants for this time
  // zone and date/time.
  if (offsetOpt === 'reject') {
    const offsetStr = FormatUTCOffsetNanoseconds(offsetNs);
    // prettier-ignore
    const timeZoneString = IsTemporalTimeZone(timeZoneRec.receiver)
      ? GetSlot(timeZoneRec.receiver, TIMEZONE_ID)
      : typeof timeZoneRec.receiver === 'string'
        ? timeZoneRec.receiver
        : 'time zone';
    // The tsc emit for this line rewrites to invoke the PlainDateTime's valueOf method, NOT
    // toString (which is invoked by Node when using template literals directly).
    // See https://github.com/microsoft/TypeScript/issues/39744 for the proposed fix in tsc emit
    throw new RangeError(`Offset ${offsetStr} is invalid for ${dt.toString()} in ${timeZoneString}`);
  }
  // fall through: offsetOpt === 'prefer', but the offset doesn't match
  // so fall back to use the time zone instead.
  const instant = DisambiguatePossibleInstants(possibleInstants, timeZoneRec, dt, disambiguation);
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
  const resolvedOptions = SnapshotOwnProperties(GetOptionsObject(options), null);
  let disambiguation: NonNullable<Temporal.ToInstantOptions['disambiguation']>;
  let offsetOpt: NonNullable<Temporal.OffsetDisambiguationOptions['offset']>;
  let matchMinute = false;
  let offsetBehaviour: OffsetBehaviour = 'option';
  if (IsObject(item)) {
    if (IsTemporalZonedDateTime(item)) return item;
    calendar = GetTemporalCalendarSlotValueWithISODefault(item);
    const calendarRec = new CalendarMethodRecord(calendar, ['dateFromFields', 'fields']);
    const fields = PrepareCalendarFields(
      calendarRec,
      item,
      ['day', 'month', 'monthCode', 'year'],
      ['hour', 'microsecond', 'millisecond', 'minute', 'nanosecond', 'offset', 'second', 'timeZone'],
      ['timeZone']
    );
    timeZone = ToTemporalTimeZoneSlotValue(fields.timeZone);
    offset = fields.offset;
    if (offset === undefined) {
      offsetBehaviour = 'wall';
    }
    disambiguation = GetTemporalDisambiguationOption(resolvedOptions);
    offsetOpt = GetTemporalOffsetOption(resolvedOptions, 'reject');
    ({ year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } = InterpretTemporalDateTimeFields(
      calendarRec,
      fields,
      resolvedOptions
    ));
  } else {
    let tzAnnotation, z;
    ({
      year,
      month,
      day,
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond,
      tzAnnotation,
      offset,
      z,
      calendar
    } = ParseTemporalZonedDateTimeString(RequireString(item)));
    timeZone = ToTemporalTimeZoneSlotValue(tzAnnotation);
    if (z) {
      offsetBehaviour = 'exact';
    } else if (!offset) {
      offsetBehaviour = 'wall';
    }
    if (!calendar) calendar = 'iso8601';
    if (!IsBuiltinCalendar(calendar)) throw new RangeError(`invalid calendar identifier ${calendar}`);
    calendar = ASCIILowercase(calendar);
    matchMinute = true; // ISO strings may specify offset with less precision
    disambiguation = GetTemporalDisambiguationOption(resolvedOptions);
    offsetOpt = GetTemporalOffsetOption(resolvedOptions, 'reject');
    GetTemporalOverflowOption(resolvedOptions); // validate and ignore
  }
  let offsetNs = 0;
  if (offsetBehaviour === 'option') offsetNs = ParseDateTimeUTCOffset(castExists(offset));
  const timeZoneRec = new TimeZoneMethodRecord(timeZone, ['getOffsetNanosecondsFor', 'getPossibleInstantsFor']);
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
    timeZoneRec,
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
    let repr = TemporalDateToString(result, 'never');
    if (typeof calendar === 'string') {
      repr += MaybeFormatCalendarAnnotation(calendar, 'auto');
    } else {
      repr += '[u-ca=<calendar object>]';
    }
    ObjectDefineProperty(result, '_repr_', {
      value: `Temporal.PlainDate <${repr}>`,
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
    let repr = TemporalDateTimeToString(result, 'auto', 'never');
    if (typeof calendar === 'string') {
      repr += MaybeFormatCalendarAnnotation(calendar, 'auto');
    } else {
      repr += '[u-ca=<calendar object>]';
    }
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
    let repr = TemporalMonthDayToString(result, 'never');
    if (typeof calendar === 'string') {
      repr += MaybeFormatCalendarAnnotation(calendar, 'auto');
    } else {
      repr += '[u-ca=<calendar object>]';
    }
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
    let repr = TemporalYearMonthToString(result, 'never');
    if (typeof calendar === 'string') {
      repr += MaybeFormatCalendarAnnotation(calendar, 'auto');
    } else {
      repr += '[u-ca=<calendar object>]';
    }
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
    let repr;
    const ignored = new TimeZoneMethodRecord('UTC', []);
    if (typeof timeZone === 'string') {
      let offsetNs;
      const offsetMinutes = ParseTimeZoneIdentifier(timeZone).offsetMinutes;
      if (offsetMinutes !== undefined) {
        offsetNs = offsetMinutes * 60e9;
      } else {
        offsetNs = GetNamedTimeZoneOffsetNanoseconds(timeZone, epochNanoseconds);
      }
      const dateTime = GetPlainDateTimeFor(ignored, instant, 'iso8601', offsetNs);
      repr = TemporalDateTimeToString(dateTime, 'auto', 'never');
      repr += FormatDateTimeUTCOffsetRounded(offsetNs);
      repr += `[${timeZone}]`;
    } else {
      const dateTime = GetPlainDateTimeFor(ignored, instant, 'iso8601', 0);
      repr = TemporalDateTimeToString(dateTime, 'auto', 'never') + 'Z[<time zone object>]';
    }
    if (typeof calendar === 'string') {
      repr += MaybeFormatCalendarAnnotation(calendar, 'auto');
    } else {
      repr += '[u-ca=<calendar object>]';
    }

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
  timeZone: string | Temporal.TimeZoneProtocol,
  calendar: CalendarSlot = 'iso8601'
) {
  const TemporalZonedDateTime = GetIntrinsic('%Temporal.ZonedDateTime%');
  const result = ObjectCreate(TemporalZonedDateTime.prototype);
  CreateTemporalZonedDateTimeSlots(result, epochNanoseconds, timeZone, calendar);
  return result;
}

export function CalendarMergeFields<Base extends Record<string, unknown>, ToAdd extends Record<string, unknown>>(
  calendarRec: CalendarMethodRecord,
  fields: Base,
  additionalFields: ToAdd
) {
  const result = calendarRec.mergeFields(fields, additionalFields);
  if (!calendarRec.isBuiltIn() && !IsObject(result)) {
    throw new TypeError('bad return from calendar.mergeFields()');
  }
  return result as Base & ToAdd;
}

function CalendarDateAdd(
  calendarRec: CalendarMethodRecord,
  date: Temporal.PlainDate,
  duration: Temporal.Duration,
  options: CalendarProtocolParams['dateAdd'][2] = undefined
): Temporal.PlainDate {
  const result = calendarRec.dateAdd(date, duration, options);
  if (!calendarRec.isBuiltIn() && !IsTemporalDate(result)) throw new TypeError('invalid result');
  return result;
}

function CalendarDateUntil(
  calendarRec: CalendarMethodRecord,
  date: Temporal.PlainDate,
  otherDate: Temporal.PlainDate,
  options: CalendarProtocolParams['dateUntil'][2]
) {
  const result = calendarRec.dateUntil(date, otherDate, options);
  if (!calendarRec.isBuiltIn() && !IsTemporalDuration(result)) throw new TypeError('invalid result');
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

export function CalendarDay(
  calendarRec: CalendarMethodRecord,
  dateLike: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.PlainMonthDay
) {
  const result = calendarRec.day(dateLike);
  // No validation needed for built-in method
  if (calendarRec.isBuiltIn()) return result;
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
  if (typeof result !== 'number' && result !== undefined) {
    throw new TypeError('calendar weekOfYear result must be a positive integer');
  }
  if (result !== undefined && (!IsIntegralNumber(result) || result < 1)) {
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
  if (typeof result !== 'number' && result !== undefined) {
    throw new TypeError('calendar yearOfWeek result must be an integer');
  }
  if (!IsIntegralNumber(result) && result !== undefined) {
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
  const identifier = RequireString(calendarLike);
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
  calendarRec: CalendarMethodRecord,
  fields: CalendarProtocolParams['dateFromFields'][0],
  options?: Partial<CalendarProtocolParams['dateFromFields'][1]>
) {
  const result = calendarRec.dateFromFields(fields, options);
  if (!calendarRec.isBuiltIn() && !IsTemporalDate(result)) throw new TypeError('invalid result');
  return result;
}

export function CalendarYearMonthFromFields(
  calendarRec: CalendarMethodRecord,
  fields: CalendarProtocolParams['yearMonthFromFields'][0],
  options?: CalendarProtocolParams['yearMonthFromFields'][1]
) {
  const result = calendarRec.yearMonthFromFields(fields, options);
  if (!calendarRec.isBuiltIn() && !IsTemporalYearMonth(result)) throw new TypeError('invalid result');
  return result;
}

export function CalendarMonthDayFromFields(
  calendarRec: CalendarMethodRecord,
  fields: CalendarProtocolParams['monthDayFromFields'][0],
  options?: CalendarProtocolParams['monthDayFromFields'][1]
) {
  const result = calendarRec.monthDayFromFields(fields, options);
  if (!calendarRec.isBuiltIn() && !IsTemporalMonthDay(result)) throw new TypeError('invalid result');
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
  if (tz1 === tz2) return true;
  const offsetMinutes1 = ParseTimeZoneIdentifier(tz1).offsetMinutes;
  const offsetMinutes2 = ParseTimeZoneIdentifier(tz2).offsetMinutes;
  if (offsetMinutes1 === undefined && offsetMinutes2 === undefined) {
    // Calling GetAvailableNamedTimeZoneIdentifier is costly, so (unlike the
    // spec) the polyfill will early-return if one of them isn't recognized. Try
    // the second ID first because it's more likely to be unknown, because it
    // can come from the argument of TimeZone.p.equals as opposed to the first
    // ID which comes from the receiver.
    const idRecord2 = GetAvailableNamedTimeZoneIdentifier(tz2);
    if (!idRecord2) return false;
    const idRecord1 = GetAvailableNamedTimeZoneIdentifier(tz1);
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

export function GetOffsetNanosecondsFor(timeZoneRec: TimeZoneMethodRecord, instant: Temporal.Instant) {
  const offsetNs = timeZoneRec.getOffsetNanosecondsFor(instant);
  // No validation needed for built-in method
  if (timeZoneRec.isBuiltIn()) return offsetNs;

  if (typeof offsetNs !== 'number') {
    throw new TypeError('bad return from getOffsetNanosecondsFor');
  }
  if (!IsIntegralNumber(offsetNs) || MathAbs(offsetNs) >= 86400e9) {
    throw new RangeError('out-of-range return from getOffsetNanosecondsFor');
  }
  return offsetNs;
}

export function GetOffsetStringFor(timeZoneRec: TimeZoneMethodRecord, instant: Temporal.Instant) {
  const offsetNs = GetOffsetNanosecondsFor(timeZoneRec, instant);
  return FormatUTCOffsetNanoseconds(offsetNs);
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

export function GetPlainDateTimeFor(
  timeZoneRec: TimeZoneMethodRecord,
  instant: Temporal.Instant,
  calendar: CalendarSlot,
  precalculatedOffsetNs: number | undefined = undefined
) {
  // Either getOffsetNanosecondsFor must be looked up, or
  // precalculatedOffsetNs should be supplied
  const ns = GetSlot(instant, EPOCHNANOSECONDS);
  const offsetNs = precalculatedOffsetNs ?? GetOffsetNanosecondsFor(timeZoneRec, instant);
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
  timeZoneRec: TimeZoneMethodRecord,
  dateTime: Temporal.PlainDateTime,
  disambiguation: NonNullable<Temporal.ToInstantOptions['disambiguation']>
) {
  // getPossibleInstantsFor and getOffsetNanosecondsFor must be looked up.
  const possibleInstants = GetPossibleInstantsFor(timeZoneRec, dateTime);
  return DisambiguatePossibleInstants(possibleInstants, timeZoneRec, dateTime, disambiguation);
}

function DisambiguatePossibleInstants(
  possibleInstants: Temporal.Instant[],
  timeZoneRec: TimeZoneMethodRecord,
  dateTime: Temporal.PlainDateTime,
  disambiguation: NonNullable<Temporal.ToInstantOptions['disambiguation']>
) {
  // getPossibleInstantsFor must be looked up already.
  // getOffsetNanosecondsFor must be be looked up if possibleInstants is empty
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

  if (disambiguation === 'reject') throw new RangeError('multiple instants found');
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

  // In the spec, range validation of `dayBefore` and `dayAfter` happens here.
  // In the polyfill, it happens in the Instant constructor.
  const dayBefore = new Instant(JSBI.subtract(utcns, DAY_NANOS_JSBI));
  const dayAfter = new Instant(JSBI.add(utcns, DAY_NANOS_JSBI));

  const offsetBefore = GetOffsetNanosecondsFor(timeZoneRec, dayBefore);
  const offsetAfter = GetOffsetNanosecondsFor(timeZoneRec, dayAfter);
  const nanoseconds = offsetAfter - offsetBefore;
  if (MathAbs(nanoseconds) > DAY_NANOS) {
    throw new RangeError('bad return from getOffsetNanosecondsFor: UTC offset shift longer than 24 hours');
  }

  switch (disambiguation) {
    case 'earlier': {
      const norm = TimeDuration.normalize(0, 0, 0, 0, 0, -nanoseconds);
      const earlierTime = AddTime(hour, minute, second, millisecond, microsecond, nanosecond, norm);
      const earlierDate = BalanceISODate(year, month, day + earlierTime.deltaDays);
      const earlierPlainDateTime = CreateTemporalDateTime(
        earlierDate.year,
        earlierDate.month,
        earlierDate.day,
        earlierTime.hour,
        earlierTime.minute,
        earlierTime.second,
        earlierTime.millisecond,
        earlierTime.microsecond,
        earlierTime.nanosecond
      );
      return GetPossibleInstantsFor(timeZoneRec, earlierPlainDateTime)[0];
    }
    case 'compatible':
    // fall through because 'compatible' means 'later' for "spring forward" transitions
    case 'later': {
      const norm = TimeDuration.normalize(0, 0, 0, 0, 0, nanoseconds);
      const laterTime = AddTime(hour, minute, second, millisecond, microsecond, nanosecond, norm);
      const laterDate = BalanceISODate(year, month, day + laterTime.deltaDays);
      const laterPlainDateTime = CreateTemporalDateTime(
        laterDate.year,
        laterDate.month,
        laterDate.day,
        laterTime.hour,
        laterTime.minute,
        laterTime.second,
        laterTime.millisecond,
        laterTime.microsecond,
        laterTime.nanosecond
      );
      const possible = GetPossibleInstantsFor(timeZoneRec, laterPlainDateTime);
      return possible[possible.length - 1];
    }
  }
}

function GetPossibleInstantsFor(timeZoneRec: TimeZoneMethodRecord, dateTime: Temporal.PlainDateTime) {
  const possibleInstants = timeZoneRec.getPossibleInstantsFor(dateTime);
  // No validation needed for built-in method
  if (timeZoneRec.isBuiltIn()) return possibleInstants;

  const result: Temporal.Instant[] = [];
  for (const instant of possibleInstants) {
    if (!IsTemporalInstant(instant)) {
      throw new TypeError('bad return from getPossibleInstantsFor');
    }
    ArrayPrototypePush.call(result, instant);
  }

  const numResults = result.length;
  if (numResults > 1) {
    const mapped = Call(ArrayPrototypeMap<JSBI>, result, [(i) => GetSlot(i, EPOCHNANOSECONDS)]);
    const min = minJSBI(...mapped);
    const max = maxJSBI(...mapped);
    if (JSBI.greaterThan(abs(JSBI.subtract(max, min)), DAY_NANOS_JSBI)) {
      throw new RangeError('bad return from getPossibleInstantsFor: UTC offset shift longer than 24 hours');
    }
  }

  return result;
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
  timeZone: string | Temporal.TimeZoneProtocol | undefined,
  precision: SecondsStringPrecisionRecord['precision']
) {
  let outputTimeZone = timeZone;
  if (outputTimeZone === undefined) outputTimeZone = 'UTC';
  const timeZoneRec = new TimeZoneMethodRecord(outputTimeZone, ['getOffsetNanosecondsFor']);
  const offsetNs = GetOffsetNanosecondsFor(timeZoneRec, instant);
  const dateTime = GetPlainDateTimeFor(timeZoneRec, instant, 'iso8601', offsetNs);
  const dateTimeString = TemporalDateTimeToString(dateTime, precision, 'never');
  let timeZoneString = 'Z';
  if (timeZone !== undefined) {
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
  dateTime: Temporal.PlainDateTime,
  precision: SecondsStringPrecisionRecord['precision'],
  showCalendar: ReturnType<typeof GetTemporalShowCalendarNameOption> = 'auto',
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
  const subSecondNanoseconds = millisecond * 1e6 + microsecond * 1e3 + nanosecond;
  const timeString = FormatTimeString(hour, minute, second, subSecondNanoseconds, precision);
  const calendar = MaybeFormatCalendarAnnotation(GetSlot(dateTime, CALENDAR), showCalendar);
  return `${yearString}-${monthString}-${dayString}T${timeString}${calendar}`;
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
  precision: SecondsStringPrecisionRecord['precision'],
  showCalendar: ReturnType<typeof GetTemporalShowCalendarNameOption> = 'auto',
  showTimeZone: ReturnType<typeof GetTemporalShowTimeZoneNameOption> = 'auto',
  showOffset: ReturnType<typeof GetTemporalShowOffsetOption> = 'auto',
  options: ToStringOptions | undefined = undefined
) {
  let instant = GetSlot(zdt, INSTANT);

  if (options) {
    const { unit, increment, roundingMode } = options;
    const ns = RoundTemporalInstant(GetSlot(zdt, EPOCHNANOSECONDS), increment, unit, roundingMode);
    const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
    instant = new TemporalInstant(ns);
  }

  const tz = GetSlot(zdt, TIME_ZONE);
  const timeZoneRec = new TimeZoneMethodRecord(tz, ['getOffsetNanosecondsFor']);
  const offsetNs = GetOffsetNanosecondsFor(timeZoneRec, instant);
  const dateTime = GetPlainDateTimeFor(timeZoneRec, instant, 'iso8601', offsetNs);
  let dateTimeString = TemporalDateTimeToString(dateTime, precision, 'never');
  if (showOffset !== 'never') {
    dateTimeString += FormatDateTimeUTCOffsetRounded(offsetNs);
  }
  if (showTimeZone !== 'never') {
    const identifier = ToTemporalTimeZoneIdentifier(tz);
    const flag = showTimeZone === 'critical' ? '!' : '';
    dateTimeString += `[${flag}${identifier}]`;
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
  const sign = match[1] === '-' || match[1] === '\u2212' ? -1 : +1;
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

export function GetNamedTimeZoneOffsetNanoseconds(id: string, epochNanoseconds: JSBI) {
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
export function GetUTCEpochNanoseconds(
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

export function NormalizedTimeDurationToDays(
  normParam: TimeDuration,
  zonedRelativeTo: Temporal.ZonedDateTime,
  timeZoneRec: TimeZoneMethodRecord,
  precalculatedPlainDateTime?: Temporal.PlainDateTime | undefined
) {
  // getOffsetNanosecondsFor and getPossibleInstantsFor must be looked up
  let norm = normParam;

  const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
  const sign = norm.sign();
  if (sign === 0) return { days: 0, norm, dayLengthNs: DAY_NANOS };

  const startNs = GetSlot(zonedRelativeTo, EPOCHNANOSECONDS);
  const start = GetSlot(zonedRelativeTo, INSTANT);
  const endNs = norm.addToEpochNs(startNs);
  const end = new TemporalInstant(endNs);
  const calendar = GetSlot(zonedRelativeTo, CALENDAR);

  // Find the difference in days only. Inline DifferenceISODateTime because we
  // don't need the path that potentially calls calendar methods.
  const dtStart = precalculatedPlainDateTime ?? GetPlainDateTimeFor(timeZoneRec, start, 'iso8601');
  const dtEnd = GetPlainDateTimeFor(timeZoneRec, end, 'iso8601');
  const date1 = TemporalDateTimeToDate(dtStart);
  const date2 = TemporalDateTimeToDate(dtEnd);
  let days = DaysUntil(date1, date2);

  const timeSign = CompareTemporalTime(
    GetSlot(dtStart, ISO_HOUR),
    GetSlot(dtStart, ISO_MINUTE),
    GetSlot(dtStart, ISO_SECOND),
    GetSlot(dtStart, ISO_MILLISECOND),
    GetSlot(dtStart, ISO_MICROSECOND),
    GetSlot(dtStart, ISO_NANOSECOND),
    GetSlot(dtEnd, ISO_HOUR),
    GetSlot(dtEnd, ISO_MINUTE),
    GetSlot(dtEnd, ISO_SECOND),
    GetSlot(dtEnd, ISO_MILLISECOND),
    GetSlot(dtEnd, ISO_MICROSECOND),
    GetSlot(dtEnd, ISO_NANOSECOND)
  );

  if (days > 0 && timeSign > 0) {
    days--;
  } else if (days < 0 && timeSign < 0) {
    days++;
  }

  let relativeResult = AddDaysToZonedDateTime(start, dtStart, timeZoneRec, calendar, days);
  // may disambiguate

  // If clock time after addition was in the middle of a skipped period, the
  // endpoint was disambiguated to a later clock time. So it's possible that
  // the resulting disambiguated result is later than endNs. If so, then back
  // up one day and try again. Repeat if necessary (some transitions are
  // > 24 hours) until either there's zero days left or the date duration is
  // back inside the period where it belongs. Note that this case only can
  // happen for positive durations because the only direction that
  // `disambiguation: 'compatible'` can change clock time is forwards.
  if (sign === 1 && days > 0 && JSBI.greaterThan(relativeResult.epochNs, endNs)) {
    days--;
    relativeResult = AddDaysToZonedDateTime(start, dtStart, timeZoneRec, calendar, days);
    // may do disambiguation
    if (days > 0 && JSBI.greaterThan(relativeResult.epochNs, endNs)) {
      throw new RangeError('inconsistent result from custom time zone getInstantFor()');
    }
  }
  norm = TimeDuration.fromEpochNsDiff(endNs, relativeResult.epochNs);

  // calculate length of the next day (day that contains the time remainder)
  let oneDayFarther = AddDaysToZonedDateTime(
    relativeResult.instant,
    relativeResult.dateTime,
    timeZoneRec,
    calendar,
    sign
  );
  let dayLengthNs = TimeDuration.fromEpochNsDiff(oneDayFarther.epochNs, relativeResult.epochNs);
  const oneDayLess = norm.subtract(dayLengthNs);
  let isOverflow = oneDayLess.sign() * sign >= 0;
  if (isOverflow) {
    norm = oneDayLess;
    relativeResult = oneDayFarther;
    days += sign;

    // ensure there was no more overflow
    oneDayFarther = AddDaysToZonedDateTime(
      relativeResult.instant,
      relativeResult.dateTime,
      timeZoneRec,
      calendar,
      sign
    );

    dayLengthNs = TimeDuration.fromEpochNsDiff(oneDayFarther.epochNs, relativeResult.epochNs);
    isOverflow = norm.subtract(dayLengthNs).sign() * sign >= 0;
    if (isOverflow) throw new RangeError('inconsistent result from custom time zone getPossibleInstantsFor()');
  }
  if (days !== 0 && MathSign(days) != sign) {
    throw new RangeError('Time zone or calendar converted nanoseconds into a number of days with the opposite sign');
  }
  if (sign === -1) {
    if (norm.sign() === 1) {
      throw new RangeError('Time zone or calendar ended up with a remainder of nanoseconds with the opposite sign');
    }
  } else if (norm.sign() === -1) {
    throw new Error('assert not reached');
  }
  if (norm.abs().cmp(dayLengthNs.abs()) >= 0) {
    throw new Error('assert not reached');
  }
  const daylen = JSBI.toNumber(dayLengthNs.abs().totalNs);
  if (!NumberIsSafeInteger(daylen)) {
    const h = daylen / 3600e9;
    throw new RangeError(`Time zone calculated a day length of ${h} h, longer than ~2502 h causes precision loss`);
  }
  if (MathAbs(days) > NumberMaxSafeInteger / 86400) throw new Error('assert not reached');
  return { days, norm, dayLengthNs: daylen };
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

export function BalanceTimeDurationRelative(
  daysParam: number,
  normParam: TimeDuration,
  largestUnitParam: Temporal.DateTimeUnit,
  zonedRelativeTo: Temporal.ZonedDateTime,
  timeZoneRec: TimeZoneMethodRecord,
  precalculatedPlainDateTimeParam?: Temporal.PlainDateTime | undefined
) {
  let largestUnit = largestUnitParam;
  let days = daysParam;
  let norm = normParam;
  let precalculatedPlainDateTime = precalculatedPlainDateTimeParam;

  const startNs = GetSlot(zonedRelativeTo, EPOCHNANOSECONDS);
  const startInstant = GetSlot(zonedRelativeTo, INSTANT);

  let intermediateNs = startNs;
  if (days !== 0) {
    precalculatedPlainDateTime ??= GetPlainDateTimeFor(timeZoneRec, startInstant, 'iso8601');
    intermediateNs = AddDaysToZonedDateTime(
      startInstant,
      precalculatedPlainDateTime,
      timeZoneRec,
      'iso8601',
      days
    ).epochNs;
  }

  const endNs = AddInstant(intermediateNs, norm);
  norm = TimeDuration.fromEpochNsDiff(endNs, startNs);
  if (norm.isZero()) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, milliseconds: 0, microseconds: 0, nanoseconds: 0 };
  }

  if (IsCalendarUnit(largestUnit) || largestUnit === 'day') {
    precalculatedPlainDateTime ??= GetPlainDateTimeFor(timeZoneRec, startInstant, 'iso8601');
    ({ days, norm } = NormalizedTimeDurationToDays(norm, zonedRelativeTo, timeZoneRec, precalculatedPlainDateTime));
    largestUnit = 'hour';
  } else {
    days = 0;
  }

  const { hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = BalanceTimeDuration(norm, largestUnit);
  return { days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
}

export function UnbalanceDateDurationRelative(
  years: number,
  months: number,
  weeks: number,
  days: number,
  largestUnit: Temporal.DateTimeUnit,
  plainRelativeTo: Temporal.PlainDate | undefined,
  calendarRec: CalendarMethodRecord | undefined
): {
  years: number;
  months: number;
  weeks: number;
  days: number;
} {
  // calendarRec must have looked up dateAdd and dateUntil
  const TemporalDuration = GetIntrinsic('%Temporal.Duration%');
  const defaultLargestUnit = DefaultTemporalLargestUnit(years, months, weeks, days, 0, 0, 0, 0, 0, 0);
  const effectiveLargestUnit = LargerOfTwoTemporalUnits(largestUnit, 'day');
  if (LargerOfTwoTemporalUnits(defaultLargestUnit, effectiveLargestUnit) === effectiveLargestUnit) {
    // no-op
    return { years, months, weeks, days };
  }
  if (!calendarRec) throw new RangeError(`a starting point is required for ${largestUnit}s balancing`);

  switch (effectiveLargestUnit) {
    case 'year':
      throw new Error('assert not reached');
    case 'month': {
      // balance years down to months
      assertExists(plainRelativeTo);
      const later = CalendarDateAdd(calendarRec, plainRelativeTo, new TemporalDuration(years));
      const untilOptions = ObjectCreate(null);
      untilOptions.largestUnit = 'month';
      const untilResult = CalendarDateUntil(calendarRec, plainRelativeTo, later, untilOptions);
      const yearsInMonths = GetSlot(untilResult, MONTHS);
      return { years: 0, months: months + yearsInMonths, weeks, days };
    }
    case 'week': {
      // balance years and months down to days
      assertExists(plainRelativeTo);
      const later = CalendarDateAdd(calendarRec, plainRelativeTo, new TemporalDuration(years, months));
      const yearsMonthsInDays = DaysUntil(plainRelativeTo, later);
      return { years: 0, months: 0, weeks, days: days + yearsMonthsInDays };
    }
    default: {
      // largestUnit is "day", or any time unit
      // balance years, months, and weeks down to days
      assertExists(plainRelativeTo);
      const later = CalendarDateAdd(calendarRec, plainRelativeTo, new TemporalDuration(years, months, weeks));
      const yearsMonthsWeeksInDays = DaysUntil(plainRelativeTo, later);
      return { years: 0, months: 0, weeks: 0, days: days + yearsMonthsWeeksInDays };
    }
  }
}

export function BalanceDateDurationRelative(
  years: number,
  months: number,
  weeks: number,
  days: number,
  largestUnit: Temporal.DateTimeUnit,
  smallestUnit: Temporal.DateTimeUnit,
  plainRelativeTo: Temporal.PlainDate | undefined,
  calendarRec: CalendarMethodRecord | undefined
): {
  years: number;
  months: number;
  weeks: number;
  days: number;
} {
  // calendarRec must have looked up dateAdd and dateUntil
  const TemporalDuration = GetIntrinsic('%Temporal.Duration%');

  // If no nonzero calendar units, then there's nothing to balance.
  // If largestUnit is 'day' or lower, then the balance is a no-op.
  // In both cases, return early. Anything after this requires a calendar.
  if (
    (years === 0 && months === 0 && weeks === 0 && days === 0) ||
    (largestUnit !== 'year' && largestUnit !== 'month' && largestUnit !== 'week')
  ) {
    return { years, months, weeks, days };
  }

  if (!plainRelativeTo) throw new RangeError(`a starting point is required for ${largestUnit}s balancing`);
  assertExists(calendarRec);

  const untilOptions = ObjectCreate(null);
  untilOptions.largestUnit = largestUnit;

  switch (largestUnit) {
    case 'year': {
      // There is a special case for smallestUnit === week, because months and
      // years aren't equal to an integer number of weeks. We don't want "1 year
      // and 5 weeks" to balance to "1 year, 1 month, and 5 days" which would
      // contravene the requested smallestUnit.
      if (smallestUnit === 'week') {
        // balance months up to years
        const later = AddDate(calendarRec, plainRelativeTo, new TemporalDuration(years, months));
        const untilResult = CalendarDateUntil(calendarRec, plainRelativeTo, later, untilOptions);
        return {
          years: GetSlot(untilResult, YEARS),
          months: GetSlot(untilResult, MONTHS),
          weeks,
          days: 0
        };
      }
      // balance weeks, months and days up to years
      const later = AddDate(calendarRec, plainRelativeTo, new TemporalDuration(years, months, weeks, days));
      const untilResult = CalendarDateUntil(calendarRec, plainRelativeTo, later, untilOptions);
      return {
        years: GetSlot(untilResult, YEARS),
        months: GetSlot(untilResult, MONTHS),
        weeks: GetSlot(untilResult, WEEKS),
        days: GetSlot(untilResult, DAYS)
      };
    }
    case 'month': {
      // Same special case for rounding to weeks as above; in this case we
      // don't need to balance.
      if (smallestUnit === 'week') {
        return { years: 0, months, weeks, days: 0 };
      }
      // balance weeks and days up to months
      const later = AddDate(calendarRec, plainRelativeTo, new TemporalDuration(0, months, weeks, days));
      const untilResult = CalendarDateUntil(calendarRec, plainRelativeTo, later, untilOptions);
      return {
        years: 0,
        months: GetSlot(untilResult, MONTHS),
        weeks: GetSlot(untilResult, WEEKS),
        days: GetSlot(untilResult, DAYS)
      };
    }
    case 'week': {
      // balance days up to weeks
      const later = AddDate(calendarRec, plainRelativeTo, new TemporalDuration(0, 0, weeks, days));
      const untilResult = CalendarDateUntil(calendarRec, plainRelativeTo, later, untilOptions);
      return {
        years: 0,
        months: 0,
        weeks: GetSlot(untilResult, WEEKS),
        days: GetSlot(untilResult, DAYS)
      };
    }
  }
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
  if (smallestUnit === 'nanosecond' && increment === 1) return diff;

  return RoundDuration(0, 0, 0, 0, diff, increment, smallestUnit, roundingMode).norm;
}

function DifferenceDate(
  calendarRec: CalendarMethodRecord,
  plainDate1: Temporal.PlainDate,
  plainDate2: Temporal.PlainDate,
  options: NonNullable<CalendarProtocolParams['dateUntil'][2]>
): Temporal.Duration {
  const TemporalDuration = GetIntrinsic('%Temporal.Duration%');
  if (
    GetSlot(plainDate1, ISO_YEAR) === GetSlot(plainDate2, ISO_YEAR) &&
    GetSlot(plainDate1, ISO_MONTH) === GetSlot(plainDate2, ISO_MONTH) &&
    GetSlot(plainDate1, ISO_DAY) === GetSlot(plainDate2, ISO_DAY)
  ) {
    return new TemporalDuration();
  }
  if (options.largestUnit === 'day') {
    return new TemporalDuration(0, 0, 0, DaysUntil(plainDate1, plainDate2));
  }
  return CalendarDateUntil(calendarRec, plainDate1, plainDate2, options);
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
  calendarRec: CalendarMethodRecord,
  largestUnit: Temporal.DateTimeUnit,
  options: Temporal.DifferenceOptions<Temporal.DateTimeUnit>
) {
  // dateUntil must be looked up if date parts are not identical and largestUnit
  // is greater than 'day'
  let y1 = y1Param;
  let mon1 = mon1Param;
  let d1 = d1Param;

  let timeDuration = DifferenceTime(h1, min1, s1, ms1, µs1, ns1, h2, min2, s2, ms2, µs2, ns2);

  const timeSign = timeDuration.sign();
  const dateSign = CompareISODate(y2, mon2, d2, y1, mon1, d1);
  if (dateSign === -timeSign) {
    ({ year: y1, month: mon1, day: d1 } = BalanceISODate(y1, mon1, d1 - timeSign));
    timeDuration = timeDuration.add24HourDays(-timeSign);
  }

  const date1 = CreateTemporalDate(y1, mon1, d1, calendarRec.receiver);
  const date2 = CreateTemporalDate(y2, mon2, d2, calendarRec.receiver);
  const dateLargestUnit = LargerOfTwoTemporalUnits('day', largestUnit);
  const untilOptions = SnapshotOwnProperties(options, null);
  untilOptions.largestUnit = dateLargestUnit;
  uncheckedAssertNarrowedType<Temporal.DifferenceOptions<Temporal.DateUnit>>(
    untilOptions,
    '`largestUnit` is already a date unit, and `smallestUnit` is ignored by CalendarDateUntil'
  );
  const untilResult = DifferenceDate(calendarRec, date1, date2, untilOptions);
  const years = GetSlot(untilResult, YEARS);
  const months = GetSlot(untilResult, MONTHS);
  const weeks = GetSlot(untilResult, WEEKS);
  const days = GetSlot(untilResult, DAYS);
  CombineDateAndNormalizedTimeDuration(years, months, weeks, days, timeDuration);
  return { years, months, weeks, days, norm: timeDuration };
}

function DifferenceZonedDateTime(
  ns1: JSBI,
  ns2: JSBI,
  timeZoneRec: TimeZoneMethodRecord,
  calendarRec: CalendarMethodRecord,
  largestUnit: Temporal.DateTimeUnit,
  options: Temporal.DifferenceOptions<Temporal.DateTimeUnit>,
  precalculatedDtStart?: Temporal.PlainDateTime | undefined
) {
  // getOffsetNanosecondsFor and getPossibleInstantsFor must be looked up
  // dateAdd must be looked up if the instants are not identical (and the date
  // difference has no years, months, or weeks, which can't be determined)
  // dateUntil must be looked up if the instants are not identical, the date
  // parts are not identical, and largestUnit is greater than 'day'
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
  const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
  const start = new TemporalInstant(ns1);
  const end = new TemporalInstant(ns2);
  const dtStart = precalculatedDtStart ?? GetPlainDateTimeFor(timeZoneRec, start, calendarRec.receiver);
  const dtEnd = GetPlainDateTimeFor(timeZoneRec, end, calendarRec.receiver);

  // Simulate moving ns1 as many years/months/weeks/days as possible without
  // surpassing ns2. This value is stored in intermediateDateTime/intermediateInstant/intermediateNs.
  // We do not literally move years/months/weeks/days with calendar arithmetic,
  // but rather assume intermediateDateTime will have the same time-parts as
  // dtStart and the date-parts from dtEnd, and move backward from there.
  // The number of days we move backward is stored in dayCorrection.
  // Credit to Adam Shaw for devising this algorithm.
  let dayCorrection = 0;
  let intermediateDateTime;
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
    GetSlot(dtStart, ISO_HOUR),
    GetSlot(dtStart, ISO_MINUTE),
    GetSlot(dtStart, ISO_SECOND),
    GetSlot(dtStart, ISO_MILLISECOND),
    GetSlot(dtStart, ISO_MICROSECOND),
    GetSlot(dtStart, ISO_NANOSECOND),
    GetSlot(dtEnd, ISO_HOUR),
    GetSlot(dtEnd, ISO_MINUTE),
    GetSlot(dtEnd, ISO_SECOND),
    GetSlot(dtEnd, ISO_MILLISECOND),
    GetSlot(dtEnd, ISO_MICROSECOND),
    GetSlot(dtEnd, ISO_NANOSECOND)
  );
  if (timeDuration.sign() === -sign) {
    dayCorrection++;
  }

  for (; dayCorrection <= maxDayCorrection; dayCorrection++) {
    const intermediateDate = BalanceISODate(
      GetSlot(dtEnd, ISO_YEAR),
      GetSlot(dtEnd, ISO_MONTH),
      GetSlot(dtEnd, ISO_DAY) - dayCorrection * sign
    );

    // Incorporate time parts from dtStart
    intermediateDateTime = CreateTemporalDateTime(
      intermediateDate.year,
      intermediateDate.month,
      intermediateDate.day,
      GetSlot(dtStart, ISO_HOUR),
      GetSlot(dtStart, ISO_MINUTE),
      GetSlot(dtStart, ISO_SECOND),
      GetSlot(dtStart, ISO_MILLISECOND),
      GetSlot(dtStart, ISO_MICROSECOND),
      GetSlot(dtStart, ISO_NANOSECOND),
      calendarRec.receiver
    );

    // Convert intermediate datetime to epoch-nanoseconds (may disambiguate)
    const intermediateInstant = GetInstantFor(timeZoneRec, intermediateDateTime, 'compatible');
    const intermediateNs = GetSlot(intermediateInstant, EPOCHNANOSECONDS);

    // Compute the nanosecond diff between the intermediate instant and the final destination
    norm = TimeDuration.fromEpochNsDiff(ns2, intermediateNs);

    // Did intermediateNs NOT surpass ns2?
    // If so, exit the loop with success (without incrementing dayCorrection past maxDayCorrection)
    if (norm.sign() !== -sign) {
      break;
    }
  }

  if (dayCorrection > maxDayCorrection) {
    throw new RangeError(
      `inconsistent return from calendar or time zone method: more than ${maxDayCorrection} day correction needed`
    );
  }

  // Output of the above loop
  assertExists(intermediateDateTime);
  assertExists(norm);

  // Similar to what happens in DifferenceISODateTime with date parts only:
  const date1 = TemporalDateTimeToDate(dtStart);
  const date2 = TemporalDateTimeToDate(intermediateDateTime);
  const dateLargestUnit = LargerOfTwoTemporalUnits('day', largestUnit) as Temporal.DateUnit;
  // We can cast options to Temporal.DifferenceOptions<Temporal.DateUnit>
  // because we are going to overwrite the largestUnit property anyway
  const untilOptions = SnapshotOwnProperties(options as Temporal.DifferenceOptions<Temporal.DateUnit>, null);
  untilOptions.largestUnit = dateLargestUnit;
  const dateDifference = DifferenceDate(calendarRec, date1, date2, untilOptions);
  const years = GetSlot(dateDifference, YEARS);
  const months = GetSlot(dateDifference, MONTHS);
  const weeks = GetSlot(dateDifference, WEEKS);
  const days = GetSlot(dateDifference, DAYS);

  CombineDateAndNormalizedTimeDuration(years, months, weeks, days, norm);
  return { years, months, weeks, days, norm };
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

  const resolvedOptions = SnapshotOwnProperties(GetOptionsObject(options), null);
  const settings = GetDifferenceSettings(operation, resolvedOptions, 'time', [], 'nanosecond', 'second');

  const onens = GetSlot(instant, EPOCHNANOSECONDS);
  const twons = GetSlot(other, EPOCHNANOSECONDS);
  const norm = DifferenceInstant(
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
  ThrowIfCalendarsNotEqual(calendar, otherCalendar, 'compute difference between dates');

  const resolvedOptions = SnapshotOwnProperties(GetOptionsObject(options), null);
  const settings = GetDifferenceSettings(operation, resolvedOptions, 'date', [], 'day', 'day');

  const Duration = GetIntrinsic('%Temporal.Duration%');
  if (
    GetSlot(plainDate, ISO_YEAR) === GetSlot(other, ISO_YEAR) &&
    GetSlot(plainDate, ISO_MONTH) === GetSlot(other, ISO_MONTH) &&
    GetSlot(plainDate, ISO_DAY) === GetSlot(other, ISO_DAY)
  ) {
    return new Duration();
  }

  const calendarRec = new CalendarMethodRecord(calendar, ['dateAdd', 'dateUntil']);

  resolvedOptions.largestUnit = settings.largestUnit;
  const untilResult = DifferenceDate(calendarRec, plainDate, other, resolvedOptions);
  let years = GetSlot(untilResult, YEARS);
  let months = GetSlot(untilResult, MONTHS);
  let weeks = GetSlot(untilResult, WEEKS);
  let days = GetSlot(untilResult, DAYS);

  const roundingIsNoop = settings.smallestUnit === 'day' && settings.roundingIncrement === 1;
  if (!roundingIsNoop) {
    ({ years, months, weeks, days } = RoundDuration(
      years,
      months,
      weeks,
      days,
      TimeDuration.ZERO,
      settings.roundingIncrement,
      settings.smallestUnit,
      settings.roundingMode,
      plainDate,
      calendarRec
    ));
    ({ years, months, weeks, days } = BalanceDateDurationRelative(
      years,
      months,
      weeks,
      days,
      settings.largestUnit,
      settings.smallestUnit,
      plainDate,
      calendarRec
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
  ThrowIfCalendarsNotEqual(calendar, otherCalendar, 'compute difference between dates');

  const resolvedOptions = SnapshotOwnProperties(GetOptionsObject(options), null);
  const settings = GetDifferenceSettings(operation, resolvedOptions, 'datetime', [], 'nanosecond', 'day');

  const Duration = GetIntrinsic('%Temporal.Duration%');
  const datePartsIdentical =
    GetSlot(plainDateTime, ISO_YEAR) === GetSlot(other, ISO_YEAR) &&
    GetSlot(plainDateTime, ISO_MONTH) === GetSlot(other, ISO_MONTH) &&
    GetSlot(plainDateTime, ISO_DAY) === GetSlot(other, ISO_DAY);
  if (
    datePartsIdentical &&
    GetSlot(plainDateTime, ISO_HOUR) == GetSlot(other, ISO_HOUR) &&
    GetSlot(plainDateTime, ISO_MINUTE) == GetSlot(other, ISO_MINUTE) &&
    GetSlot(plainDateTime, ISO_SECOND) == GetSlot(other, ISO_SECOND) &&
    GetSlot(plainDateTime, ISO_MILLISECOND) == GetSlot(other, ISO_MILLISECOND) &&
    GetSlot(plainDateTime, ISO_MICROSECOND) == GetSlot(other, ISO_MICROSECOND) &&
    GetSlot(plainDateTime, ISO_NANOSECOND) == GetSlot(other, ISO_NANOSECOND)
  ) {
    return new Duration();
  }

  const calendarRec = new CalendarMethodRecord(calendar, ['dateAdd', 'dateUntil']);

  let { years, months, weeks, days, norm } = DifferenceISODateTime(
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
    calendarRec,
    settings.largestUnit,
    resolvedOptions
  );

  let hours, minutes, seconds, milliseconds, microseconds, nanoseconds;
  const roundingIsNoop = settings.smallestUnit === 'nanosecond' && settings.roundingIncrement === 1;
  if (!roundingIsNoop) {
    const relativeTo = TemporalDateTimeToDate(plainDateTime);
    ({ years, months, weeks, days, norm } = RoundDuration(
      years,
      months,
      weeks,
      days,
      norm,
      settings.roundingIncrement,
      settings.smallestUnit,
      settings.roundingMode,
      relativeTo,
      calendarRec
    ));
    ({ days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = BalanceTimeDuration(
      norm.add24HourDays(days),
      settings.largestUnit
    ));
    ({ years, months, weeks, days } = BalanceDateDurationRelative(
      years,
      months,
      weeks,
      days,
      settings.largestUnit,
      settings.smallestUnit,
      relativeTo,
      calendarRec
    ));
  } else {
    ({ days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = BalanceTimeDuration(
      norm.add24HourDays(days),
      settings.largestUnit
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

export function DifferenceTemporalPlainTime(
  operation: DifferenceOperation,
  plainTime: Temporal.PlainTime,
  otherParam: PlainTimeParams['until'][0],
  options: PlainTimeParams['until'][1]
): Temporal.Duration {
  const sign = operation === 'since' ? -1 : 1;
  const other = ToTemporalTime(otherParam);

  const resolvedOptions = SnapshotOwnProperties(GetOptionsObject(options), null);
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
    ({ norm } = RoundDuration(
      0,
      0,
      0,
      0,
      norm,
      settings.roundingIncrement,
      settings.smallestUnit,
      settings.roundingMode
    ));
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
  ThrowIfCalendarsNotEqual(calendar, otherCalendar, 'compute difference between months');

  const resolvedOptions = SnapshotOwnProperties(GetOptionsObject(options), null);
  const settings = GetDifferenceSettings(operation, resolvedOptions, 'date', ['week', 'day'], 'month', 'year');

  const Duration = GetIntrinsic('%Temporal.Duration%');
  if (
    GetSlot(yearMonth, ISO_YEAR) === GetSlot(other, ISO_YEAR) &&
    GetSlot(yearMonth, ISO_MONTH) === GetSlot(other, ISO_MONTH) &&
    GetSlot(yearMonth, ISO_DAY) === GetSlot(other, ISO_DAY)
  ) {
    return new Duration();
  }

  const calendarRec = new CalendarMethodRecord(calendar, ['dateAdd', 'dateFromFields', 'dateUntil', 'fields']);

  const { fields: thisFields, fieldNames } = PrepareCalendarFieldsAndFieldNames(calendarRec, yearMonth, [
    'monthCode',
    'year'
  ]);
  thisFields.day = 1;
  const thisDate = CalendarDateFromFields(calendarRec, thisFields);
  const otherFields = PrepareTemporalFields(other, fieldNames, []);
  otherFields.day = 1;
  const otherDate = CalendarDateFromFields(calendarRec, otherFields);

  resolvedOptions.largestUnit = settings.largestUnit;
  let { years, months } = CalendarDateUntil(calendarRec, thisDate, otherDate, resolvedOptions);

  if (settings.smallestUnit !== 'month' || settings.roundingIncrement !== 1) {
    ({ years, months } = RoundDuration(
      years,
      months,
      0,
      0,
      TimeDuration.ZERO,
      settings.roundingIncrement,
      settings.smallestUnit,
      settings.roundingMode,
      thisDate,
      calendarRec
    ));
    ({ years, months } = BalanceDateDurationRelative(
      years,
      months,
      0,
      0,
      settings.largestUnit,
      settings.smallestUnit,
      thisDate,
      calendarRec
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
  ThrowIfCalendarsNotEqual(calendar, otherCalendar, 'compute difference between dates');

  const resolvedOptions = SnapshotOwnProperties(GetOptionsObject(options), null);
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
    const norm = DifferenceInstant(
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

    const timeZoneRec = new TimeZoneMethodRecord(timeZone, ['getOffsetNanosecondsFor', 'getPossibleInstantsFor']);
    // dateAdd and dateUntil may not be needed if the two exact times resolve to
    // the same wall-clock time in the time zone, but there's no way to predict
    // that in advance
    const calendarRec = new CalendarMethodRecord(calendar, ['dateAdd', 'dateUntil']);

    const precalculatedPlainDateTime = GetPlainDateTimeFor(
      timeZoneRec,
      GetSlot(zonedDateTime, INSTANT),
      calendarRec.receiver
    );
    const plainRelativeTo = TemporalDateTimeToDate(precalculatedPlainDateTime);

    let norm;
    ({ years, months, weeks, days, norm } = DifferenceZonedDateTime(
      ns1,
      ns2,
      timeZoneRec,
      calendarRec,
      settings.largestUnit,
      resolvedOptions,
      precalculatedPlainDateTime
    ));

    const roundingIsNoop = settings.smallestUnit === 'nanosecond' && settings.roundingIncrement === 1;
    if (!roundingIsNoop) {
      ({ years, months, weeks, days, norm } = RoundDuration(
        years,
        months,
        weeks,
        days,
        norm,
        settings.roundingIncrement,
        settings.smallestUnit,
        settings.roundingMode,
        plainRelativeTo,
        calendarRec,
        zonedDateTime,
        timeZoneRec,
        precalculatedPlainDateTime
      ));
      let deltaDays;
      ({ days: deltaDays, norm } = NormalizedTimeDurationToDays(norm, zonedDateTime, timeZoneRec));
      days += deltaDays;
      ({ years, months, weeks, days, norm } = AdjustRoundedDurationDays(
        years,
        months,
        weeks,
        days,
        norm,
        settings.roundingIncrement,
        settings.smallestUnit,
        settings.roundingMode,
        zonedDateTime,
        calendarRec,
        timeZoneRec,
        precalculatedPlainDateTime
      ));
      // BalanceTimeDuration already performed in AdjustRoundedDurationDays
      ({ years, months, weeks, days } = BalanceDateDurationRelative(
        years,
        months,
        weeks,
        days,
        settings.largestUnit,
        settings.smallestUnit,
        plainRelativeTo,
        calendarRec
      ));
      CombineDateAndNormalizedTimeDuration(years, months, weeks, days, norm);
    }
    ({ hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = BalanceTimeDuration(norm, 'hour'));
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

export function AddDate(
  calendarRec: CalendarMethodRecord,
  plainDate: Temporal.PlainDate,
  duration: Temporal.Duration,
  options?: CalendarProtocolParams['dateAdd'][2]
): Temporal.PlainDate {
  // dateAdd must be looked up
  const years = GetSlot(duration, YEARS);
  const months = GetSlot(duration, MONTHS);
  const weeks = GetSlot(duration, WEEKS);
  if (years !== 0 || months !== 0 || weeks !== 0) {
    return CalendarDateAdd(calendarRec, plainDate, duration, options);
  }

  // Fast path skipping the calendar call if we are only adding days
  let year = GetSlot(plainDate, ISO_YEAR);
  let month = GetSlot(plainDate, ISO_MONTH);
  let day = GetSlot(plainDate, ISO_DAY);
  const overflow = GetTemporalOverflowOption(options);
  const norm = TimeDuration.normalize(
    GetSlot(duration, HOURS),
    GetSlot(duration, MINUTES),
    GetSlot(duration, SECONDS),
    GetSlot(duration, MILLISECONDS),
    GetSlot(duration, MICROSECONDS),
    GetSlot(duration, NANOSECONDS)
  );
  const days = GetSlot(duration, DAYS) + BalanceTimeDuration(norm, 'day').days;
  ({ year, month, day } = AddISODate(year, month, day, 0, 0, 0, days, overflow));
  return CreateTemporalDate(year, month, day, calendarRec.receiver);
}

function AddTime(
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
  plainRelativeTo: Temporal.PlainDate | undefined,
  zonedRelativeTo: Temporal.ZonedDateTime | undefined,
  calendarRec: CalendarMethodRecord | undefined,
  timeZoneRec: TimeZoneMethodRecord | undefined,
  precalculatedPlainDateTime?: Temporal.PlainDateTime | undefined
) {
  // dateAdd must be looked up if zonedRelativeTo or plainRelativeTo not
  // undefined, and years...weeks != 0 in either duration
  // dateUntil must additionally be looked up if duration 2 not zero
  const largestUnit1 = DefaultTemporalLargestUnit(y1, mon1, w1, d1, h1, min1, s1, ms1, µs1, ns1);
  const largestUnit2 = DefaultTemporalLargestUnit(y2, mon2, w2, d2, h2, min2, s2, ms2, µs2, ns2);
  const largestUnit = LargerOfTwoTemporalUnits(largestUnit1, largestUnit2);

  let years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds;
  const norm1 = TimeDuration.normalize(h1, min1, s1, ms1, µs1, ns1);
  const norm2 = TimeDuration.normalize(h2, min2, s2, ms2, µs2, ns2);
  if (!zonedRelativeTo && !plainRelativeTo) {
    if (IsCalendarUnit(largestUnit)) {
      throw new RangeError('relativeTo is required for years, months, or weeks arithmetic');
    }
    years = months = weeks = 0;
    ({ days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = BalanceTimeDuration(
      norm1.add(norm2).add24HourDays(d1 + d2),
      largestUnit
    ));
  } else if (plainRelativeTo) {
    assertExists(calendarRec);
    const TemporalDuration = GetIntrinsic('%Temporal.Duration%');

    const dateDuration1 = new TemporalDuration(y1, mon1, w1, d1, 0, 0, 0, 0, 0, 0);
    const dateDuration2 = new TemporalDuration(y2, mon2, w2, d2, 0, 0, 0, 0, 0, 0);
    const intermediate = AddDate(calendarRec, plainRelativeTo, dateDuration1);
    const end = AddDate(calendarRec, intermediate, dateDuration2);

    const dateLargestUnit = LargerOfTwoTemporalUnits('day', largestUnit) as Temporal.DateUnit;
    const differenceOptions = ObjectCreate(null) as Temporal.DifferenceOptions<Temporal.DateUnit>;
    differenceOptions.largestUnit = dateLargestUnit;
    const untilResult = DifferenceDate(calendarRec, plainRelativeTo, end, differenceOptions);
    years = GetSlot(untilResult, YEARS);
    months = GetSlot(untilResult, MONTHS);
    weeks = GetSlot(untilResult, WEEKS);
    days = GetSlot(untilResult, DAYS);
    // Signs of date part and time part may not agree; balance them together
    ({ days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = BalanceTimeDuration(
      norm1.add(norm2).add24HourDays(days),
      largestUnit
    ));
  } else {
    assertExists(zonedRelativeTo);
    assertExists(timeZoneRec);
    assertExists(calendarRec);
    const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
    const calendar = GetSlot(zonedRelativeTo, CALENDAR);
    const startInstant = GetSlot(zonedRelativeTo, INSTANT);
    let startDateTime = precalculatedPlainDateTime;
    if (IsCalendarUnit(largestUnit) || largestUnit === 'day') {
      startDateTime ??= GetPlainDateTimeFor(timeZoneRec, startInstant, calendar);
    }
    const intermediateNs = AddZonedDateTime(
      startInstant,
      timeZoneRec,
      calendarRec,
      y1,
      mon1,
      w1,
      d1,
      norm1,
      startDateTime
    );
    const endNs = AddZonedDateTime(
      new TemporalInstant(intermediateNs),
      timeZoneRec,
      calendarRec,
      y2,
      mon2,
      w2,
      d2,
      norm2
    );
    if (largestUnit !== 'year' && largestUnit !== 'month' && largestUnit !== 'week' && largestUnit !== 'day') {
      // The user is only asking for a time difference, so return difference of instants.
      years = 0;
      months = 0;
      weeks = 0;
      days = 0;
      const norm = TimeDuration.fromEpochNsDiff(endNs, GetSlot(zonedRelativeTo, EPOCHNANOSECONDS));
      ({ hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = BalanceTimeDuration(norm, largestUnit));
    } else {
      let norm;
      ({ years, months, weeks, days, norm } = DifferenceZonedDateTime(
        GetSlot(zonedRelativeTo, EPOCHNANOSECONDS),
        endNs,
        timeZoneRec,
        calendarRec,
        largestUnit,
        ObjectCreate(null) as Temporal.DifferenceOptions<Temporal.DateTimeUnit>,
        startDateTime
      ));
      ({ hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = BalanceTimeDuration(norm, 'hour'));
    }
  }

  return { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
}

export function AddInstant(epochNanoseconds: JSBI, norm: TimeDuration) {
  const result = norm.addToEpochNs(epochNanoseconds);
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
  calendarRec: CalendarMethodRecord,
  years: number,
  months: number,
  weeks: number,
  daysParam: number,
  norm: TimeDuration,
  options?: Temporal.ArithmeticOptions
) {
  // dateAdd must be looked up if years, months, weeks != 0
  let days = daysParam;
  // Add the time part
  let { deltaDays, hour, minute, second, millisecond, microsecond, nanosecond } = AddTime(
    hourParam,
    minuteParam,
    secondParam,
    millisecondParam,
    microsecondParam,
    nanosecondParam,
    norm
  );
  days += deltaDays;

  // Delegate the date part addition to the calendar
  const TemporalDuration = GetIntrinsic('%Temporal.Duration%');
  const datePart = CreateTemporalDate(year, month, day, calendarRec.receiver);
  const dateDuration = new TemporalDuration(years, months, weeks, days, 0, 0, 0, 0, 0, 0);
  const addedDate = AddDate(calendarRec, datePart, dateDuration, options);

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
  timeZoneRec: TimeZoneMethodRecord,
  calendarRec: CalendarMethodRecord,
  years: number,
  months: number,
  weeks: number,
  days: number,
  norm: TimeDuration,
  precalculatedPlainDateTime?: Temporal.PlainDateTime,
  options?: Temporal.ArithmeticOptions
) {
  // getPossibleInstantsFor must be looked up
  // getOffsetNanosecondsFor must be looked up if precalculatedDateTime is not
  // supplied
  // getOffsetNanosecondsFor may be looked up and timeZoneRec modified, if
  // precalculatedDateTime is supplied but converting to instant requires
  // disambiguation
  // dateAdd must be looked up if years, months, or weeks are not 0

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
    return AddInstant(GetSlot(instant, EPOCHNANOSECONDS), norm);
  }

  const dt = precalculatedPlainDateTime ?? GetPlainDateTimeFor(timeZoneRec, instant, calendarRec.receiver);
  if (DurationSign(years, months, weeks, 0, 0, 0, 0, 0, 0, 0) === 0) {
    const overflow = GetTemporalOverflowOption(options);
    const intermediate = AddDaysToZonedDateTime(instant, dt, timeZoneRec, calendarRec.receiver, days, overflow).epochNs;
    return AddInstant(intermediate, norm);
  }

  // RFC 5545 requires the date portion to be added in calendar days and the
  // time portion to be added in exact time.
  const datePart = CreateTemporalDate(
    GetSlot(dt, ISO_YEAR),
    GetSlot(dt, ISO_MONTH),
    GetSlot(dt, ISO_DAY),
    calendarRec.receiver
  );
  const dateDuration = new TemporalDuration(years, months, weeks, days, 0, 0, 0, 0, 0, 0);
  const addedDate = CalendarDateAdd(calendarRec, datePart, dateDuration, options);
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
    calendarRec.receiver
  );

  // Note that 'compatible' is used below because this disambiguation behavior
  // is required by RFC 5545.
  const instantIntermediate = GetInstantFor(timeZoneRec, dtIntermediate, 'compatible');
  return AddInstant(GetSlot(instantIntermediate, EPOCHNANOSECONDS), norm);
}

type AddDaysRecord = {
  instant: Temporal.Instant;
  dateTime: Temporal.PlainDateTime;
  epochNs: JSBI;
};

export function AddDaysToZonedDateTime(
  instant: Temporal.Instant,
  dateTime: Temporal.PlainDateTime,
  timeZoneRec: TimeZoneMethodRecord,
  calendar: CalendarSlot,
  days: number,
  overflow: Temporal.ArithmeticOptions['overflow'] = 'constrain'
): AddDaysRecord {
  // getPossibleInstantsFor must be looked up
  // getOffsetNanosecondsFor may be looked up for disambiguation, modifying timeZoneRec

  // Same as AddZonedDateTime above, but an optimized version with fewer
  // observable calls that only adds a number of days. Returns an object with
  // all three versions of the ZonedDateTime: epoch nanoseconds, Instant, and
  // PlainDateTime
  if (days === 0) {
    return { instant, dateTime, epochNs: GetSlot(instant, EPOCHNANOSECONDS) };
  }

  const addedDate = AddISODate(
    GetSlot(dateTime, ISO_YEAR),
    GetSlot(dateTime, ISO_MONTH),
    GetSlot(dateTime, ISO_DAY),
    0,
    0,
    0,
    days,
    overflow
  );
  const dateTimeResult = CreateTemporalDateTime(
    addedDate.year,
    addedDate.month,
    addedDate.day,
    GetSlot(dateTime, ISO_HOUR),
    GetSlot(dateTime, ISO_MINUTE),
    GetSlot(dateTime, ISO_SECOND),
    GetSlot(dateTime, ISO_MILLISECOND),
    GetSlot(dateTime, ISO_MICROSECOND),
    GetSlot(dateTime, ISO_NANOSECOND),
    calendar
  );

  const instantResult = GetInstantFor(timeZoneRec, dateTimeResult, 'compatible');
  return {
    instant: instantResult,
    dateTime: dateTimeResult,
    epochNs: GetSlot(instantResult, EPOCHNANOSECONDS)
  };
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
  const { plainRelativeTo, zonedRelativeTo, timeZoneRec } = GetTemporalRelativeToOption(options);

  const calendarRec = CalendarMethodRecord.CreateFromRelativeTo(plainRelativeTo, zonedRelativeTo, [
    'dateAdd',
    'dateUntil'
  ]);

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
    plainRelativeTo,
    zonedRelativeTo,
    calendarRec,
    timeZoneRec
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
  const norm = TimeDuration.normalize(
    sign * hours,
    sign * minutes,
    sign * seconds,
    sign * milliseconds,
    sign * microseconds,
    sign * nanoseconds
  );
  const ns = AddInstant(GetSlot(instant, EPOCHNANOSECONDS), norm);
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

  const calendarRec = new CalendarMethodRecord(GetSlot(dateTime, CALENDAR), ['dateAdd']);

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
    calendarRec,
    sign * years,
    sign * months,
    sign * weeks,
    sign * days,
    norm,
    options
  );
  return CreateTemporalDateTime(
    year,
    month,
    day,
    hour,
    minute,
    second,
    millisecond,
    microsecond,
    nanosecond,
    calendarRec.receiver
  );
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
  const norm = TimeDuration.normalize(hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
  days += BalanceTimeDuration(norm, 'day').days;
  const sign = DurationSign(years, months, weeks, days, 0, 0, 0, 0, 0, 0);

  const calendarRec = new CalendarMethodRecord(GetSlot(yearMonth, CALENDAR), [
    'dateAdd',
    'dateFromFields',
    'day',
    'fields',
    'yearMonthFromFields'
  ]);

  const { fields, fieldNames } = PrepareCalendarFieldsAndFieldNames(calendarRec, yearMonth, ['monthCode', 'year']);
  const fieldsCopy = SnapshotOwnProperties(fields, null);
  fields.day = 1;
  // PrepareTemporalFields returns a type where 'day' is potentially undefined,
  // but TS doesn't narrow the type as a result of the assignment above.
  uncheckedAssertNarrowedType<typeof fields & { day: number }>(fields, '`day` is guaranteed to be non-undefined');
  uncheckedAssertNarrowedType<typeof fields & { day: number }>(fieldsCopy, '`day` is guaranteed to be non-undefined');
  let startDate = CalendarDateFromFields(calendarRec, fields);
  const Duration = GetIntrinsic('%Temporal.Duration%');
  if (sign < 0) {
    const oneMonthDuration = new Duration(0, 1, 0, 0, 0, 0, 0, 0, 0, 0);
    const nextMonth = CalendarDateAdd(calendarRec, startDate, oneMonthDuration);
    const endOfMonthISO = BalanceISODate(
      GetSlot(nextMonth, ISO_YEAR),
      GetSlot(nextMonth, ISO_MONTH),
      GetSlot(nextMonth, ISO_DAY) - 1
    );
    const endOfMonth = CreateTemporalDate(
      endOfMonthISO.year,
      endOfMonthISO.month,
      endOfMonthISO.day,
      calendarRec.receiver
    );
    fieldsCopy.day = CalendarDay(calendarRec, endOfMonth);
    startDate = CalendarDateFromFields(calendarRec, fieldsCopy);
  }
  const durationToAdd = new Duration(years, months, weeks, days, 0, 0, 0, 0, 0, 0);
  const optionsCopy = SnapshotOwnProperties(options, null);
  const addedDate = AddDate(calendarRec, startDate, durationToAdd, options);
  const addedDateFields = PrepareTemporalFields(addedDate, fieldNames, []);

  return CalendarYearMonthFromFields(calendarRec, addedDateFields, optionsCopy);
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
  const timeZoneRec = new TimeZoneMethodRecord(GetSlot(zonedDateTime, TIME_ZONE), [
    'getOffsetNanosecondsFor',
    'getPossibleInstantsFor'
  ]);
  const calendarRec = new CalendarMethodRecord(GetSlot(zonedDateTime, CALENDAR), ['dateAdd']);
  const norm = TimeDuration.normalize(
    sign * hours,
    sign * minutes,
    sign * seconds,
    sign * milliseconds,
    sign * microseconds,
    sign * nanoseconds
  );
  const epochNanoseconds = AddZonedDateTime(
    GetSlot(zonedDateTime, INSTANT),
    timeZoneRec,
    calendarRec,
    sign * years,
    sign * months,
    sign * weeks,
    sign * days,
    norm,
    undefined,
    options
  );
  return CreateTemporalZonedDateTime(epochNanoseconds, timeZoneRec.receiver, calendarRec.receiver);
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
  roundingMode: Temporal.RoundingMode
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
    roundingMode
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
  calendarRec: CalendarMethodRecord,
  relativeTo: Temporal.PlainDate,
  duration: Temporal.Duration
) {
  // dateAdd must be looked up if years, months, weeks != 0
  const later = AddDate(calendarRec, relativeTo, duration, undefined);
  const days = DaysUntil(relativeTo, later);
  return { relativeTo: later, days };
}

export function MoveRelativeZonedDateTime(
  relativeTo: Temporal.ZonedDateTime,
  calendarRec: CalendarMethodRecord,
  timeZoneRec: TimeZoneMethodRecord,
  years: number,
  months: number,
  weeks: number,
  days: number,
  precalculatedPlainDateTime: Temporal.PlainDateTime | undefined
) {
  // getOffsetNanosecondsFor and getPossibleInstantsFor must be looked up
  // dateAdd must be looked up if years, months, weeks != 0
  const intermediateNs = AddZonedDateTime(
    GetSlot(relativeTo, INSTANT),
    timeZoneRec,
    calendarRec,
    years,
    months,
    weeks,
    days,
    TimeDuration.ZERO,
    precalculatedPlainDateTime
  );
  return CreateTemporalZonedDateTime(intermediateNs, timeZoneRec.receiver, calendarRec.receiver);
}

export function AdjustRoundedDurationDays(
  yearsParam: number,
  monthsParam: number,
  weeksParam: number,
  daysParam: number,
  normParam: TimeDuration,
  increment: number,
  unit: Temporal.DateTimeUnit,
  roundingMode: Temporal.RoundingMode,
  zonedRelativeTo: Temporal.ZonedDateTime,
  calendarRec: CalendarMethodRecord,
  timeZoneRec: TimeZoneMethodRecord,
  precalculatedPlainDateTime: Temporal.PlainDateTime | undefined
) {
  // both dateAdd and dateUntil must be looked up if unit <= hour, any rounding
  // is requested, and any of years...weeks != 0
  let years = yearsParam;
  let months = monthsParam;
  let weeks = weeksParam;
  let days = daysParam;
  let norm = normParam;
  if (IsCalendarUnit(unit) || unit === 'day' || (unit === 'nanosecond' && increment === 1)) {
    return { years, months, weeks, days, norm };
  }

  // There's one more round of rounding possible: if relativeTo is a
  // ZonedDateTime, the time units could have rounded up into enough hours
  // to exceed the day length. If this happens, grow the date part by a
  // single day and re-run exact time rounding on the smaller remainder. DO
  // NOT RECURSE, because once the extra hours are sucked up into the date
  // duration, there's no way for another full day to come from the next
  // round of rounding. And if it were possible (e.g. contrived calendar
  // with 30-minute-long "days") then it'd risk an infinite loop.
  const direction = norm.sign();

  const calendar = GetSlot(zonedRelativeTo, CALENDAR);
  // requires dateAdd if years...weeks != 0
  const dayStart = AddZonedDateTime(
    GetSlot(zonedRelativeTo, INSTANT),
    timeZoneRec,
    calendarRec,
    years,
    months,
    weeks,
    days,
    TimeDuration.ZERO,
    precalculatedPlainDateTime
  );
  const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
  const dayStartInstant = new TemporalInstant(dayStart);
  const dayStartDateTime = GetPlainDateTimeFor(timeZoneRec, dayStartInstant, calendar);
  const dayEnd = AddDaysToZonedDateTime(dayStartInstant, dayStartDateTime, timeZoneRec, calendar, direction).epochNs;
  const dayLength = TimeDuration.fromEpochNsDiff(dayEnd, dayStart);

  const oneDayLess = norm.subtract(dayLength);
  if (oneDayLess.sign() * direction >= 0) {
    // requires dateAdd and dateUntil if years...weeks != 0
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
      /* plainRelativeTo = */ undefined,
      zonedRelativeTo,
      calendarRec,
      timeZoneRec,
      precalculatedPlainDateTime
    ));
    ({ norm } = RoundDuration(0, 0, 0, 0, oneDayLess, increment, unit, roundingMode));
  }
  CombineDateAndNormalizedTimeDuration(years, months, weeks, days, norm);
  return { years, months, weeks, days, norm };
}

export function RoundDuration(
  yearsParam: number,
  monthsParam: number,
  weeksParam: number,
  daysParam: number,
  normParam: TimeDuration,
  increment: number,
  unit: Temporal.DateTimeUnit,
  roundingMode: Temporal.RoundingMode,
  plainRelativeToParam: Temporal.PlainDate | undefined = undefined,
  calendarRec: CalendarMethodRecord | undefined = undefined,
  zonedRelativeTo: Temporal.ZonedDateTime | undefined = undefined,
  timeZoneRec?: TimeZoneMethodRecord | undefined,
  precalculatedPlainDateTime?: Temporal.PlainDateTime | undefined
) {
  // dateAdd and dateUntil must be looked up
  let years = yearsParam;
  let months = monthsParam;
  let weeks = weeksParam;
  let days = daysParam;
  let norm = normParam;
  let plainRelativeTo = plainRelativeToParam;
  const TemporalDuration = GetIntrinsic('%Temporal.Duration%');

  if (IsCalendarUnit(unit) && !plainRelativeTo) {
    throw new RangeError(`A starting point is required for ${unit}s rounding`);
  }

  // First convert time units up to days, if rounding to days or higher units.
  // If rounding relative to a ZonedDateTime, then some days may not be 24h.
  // TS doesn't know that `dayLengthNs` is only used if the unit is day or
  // larger. We'll cast away `undefined` when it's used lower down below.
  let dayLengthNs: number | undefined;
  if (IsCalendarUnit(unit) || unit === 'day') {
    let deltaDays;
    if (zonedRelativeTo) {
      assertExists(calendarRec);
      assertExists(timeZoneRec);
      const intermediate = MoveRelativeZonedDateTime(
        zonedRelativeTo,
        calendarRec,
        timeZoneRec,
        years,
        months,
        weeks,
        days,
        precalculatedPlainDateTime
      );
      ({ days: deltaDays, norm, dayLengthNs } = NormalizedTimeDurationToDays(norm, intermediate, timeZoneRec));
    } else {
      ({ quotient: deltaDays, remainder: norm } = norm.divmod(JSBI.toNumber(DAY_NANOS_JSBI)));
      dayLengthNs = DAY_NANOS;
    }
    days += deltaDays;
  }

  let total: number;
  switch (unit) {
    case 'year': {
      assertExists(plainRelativeTo);
      assertExists(calendarRec);

      // convert months and weeks to days by calculating difference(
      // relativeTo + years, relativeTo + { years, months, weeks })
      const yearsDuration = new TemporalDuration(years);
      const yearsLater = AddDate(calendarRec, plainRelativeTo, yearsDuration);
      const yearsMonthsWeeks = new TemporalDuration(years, months, weeks);
      const yearsMonthsWeeksLater = AddDate(calendarRec, plainRelativeTo, yearsMonthsWeeks);
      const monthsWeeksInDays = DaysUntil(yearsLater, yearsMonthsWeeksLater);
      plainRelativeTo = yearsLater;
      days += monthsWeeksInDays;

      const isoResult = BalanceISODate(
        GetSlot(plainRelativeTo, ISO_YEAR),
        GetSlot(plainRelativeTo, ISO_MONTH),
        GetSlot(plainRelativeTo, ISO_DAY) + days
      );
      const wholeDaysLater = CreateTemporalDate(isoResult.year, isoResult.month, isoResult.day, calendarRec.receiver);
      const untilOptions = ObjectCreate(null) as Temporal.DifferenceOptions<typeof unit>;
      untilOptions.largestUnit = 'year';
      const yearsPassed = GetSlot(DifferenceDate(calendarRec, plainRelativeTo, wholeDaysLater, untilOptions), YEARS);
      years += yearsPassed;
      const yearsPassedDuration = new TemporalDuration(yearsPassed);
      let daysPassed;
      ({ relativeTo: plainRelativeTo, days: daysPassed } = MoveRelativeDate(
        calendarRec,
        plainRelativeTo,
        yearsPassedDuration
      ));
      days -= daysPassed;
      const oneYear = new TemporalDuration(days < 0 ? -1 : 1);
      let { days: oneYearDays } = MoveRelativeDate(calendarRec, plainRelativeTo, oneYear);

      oneYearDays = MathAbs(oneYearDays);
      // dayLengthNs is never undefined if unit is `day` or larger.
      assertExists(dayLengthNs);
      if (oneYearDays === 0) throw new RangeError('custom calendar reported that a year is 0 days long');
      total = years + (days + norm.fdiv(dayLengthNs)) / oneYearDays;
      years = RoundNumberToIncrement(total, increment, roundingMode);
      months = weeks = days = 0;
      norm = TimeDuration.ZERO;
      break;
    }
    case 'month': {
      assertExists(plainRelativeTo);
      assertExists(calendarRec);

      // convert weeks to days by calculating difference(relativeTo +
      //   { years, months }, relativeTo + { years, months, weeks })
      const yearsMonths = new TemporalDuration(years, months);
      const yearsMonthsLater = AddDate(calendarRec, plainRelativeTo, yearsMonths);
      const yearsMonthsWeeks = new TemporalDuration(years, months, weeks);
      const yearsMonthsWeeksLater = AddDate(calendarRec, plainRelativeTo, yearsMonthsWeeks);
      const weeksInDays = DaysUntil(yearsMonthsLater, yearsMonthsWeeksLater);
      plainRelativeTo = yearsMonthsLater;
      days += weeksInDays;

      const isoResult = BalanceISODate(
        GetSlot(plainRelativeTo, ISO_YEAR),
        GetSlot(plainRelativeTo, ISO_MONTH),
        GetSlot(plainRelativeTo, ISO_DAY) + days
      );
      const wholeDaysLater = CreateTemporalDate(isoResult.year, isoResult.month, isoResult.day, calendarRec.receiver);
      const untilOptions = ObjectCreate(null);
      untilOptions.largestUnit = 'month';
      const monthsPassed = GetSlot(DifferenceDate(calendarRec, plainRelativeTo, wholeDaysLater, untilOptions), MONTHS);
      months += monthsPassed;
      const monthsPassedDuration = new TemporalDuration(0, monthsPassed);
      let daysPassed;
      ({ relativeTo: plainRelativeTo, days: daysPassed } = MoveRelativeDate(
        calendarRec,
        plainRelativeTo,
        monthsPassedDuration
      ));
      days -= daysPassed;
      const oneMonth = new TemporalDuration(0, days < 0 ? -1 : 1);
      let { days: oneMonthDays } = MoveRelativeDate(calendarRec, plainRelativeTo, oneMonth);

      oneMonthDays = MathAbs(oneMonthDays);
      if (oneMonthDays === 0) throw new RangeError('custom calendar reported that a month is 0 days long');
      // dayLengthNs is never undefined if unit is `day` or larger.
      assertExists(dayLengthNs);
      total = months + (days + norm.fdiv(dayLengthNs)) / oneMonthDays;
      months = RoundNumberToIncrement(total, increment, roundingMode);
      weeks = days = 0;
      norm = TimeDuration.ZERO;
      break;
    }
    case 'week': {
      assertExists(plainRelativeTo);
      assertExists(calendarRec);

      const isoResult = BalanceISODate(
        GetSlot(plainRelativeTo, ISO_YEAR),
        GetSlot(plainRelativeTo, ISO_MONTH),
        GetSlot(plainRelativeTo, ISO_DAY) + days
      );
      const wholeDaysLater = CreateTemporalDate(isoResult.year, isoResult.month, isoResult.day, calendarRec.receiver);
      const untilOptions = ObjectCreate(null);
      untilOptions.largestUnit = 'week';
      const weeksPassed = GetSlot(DifferenceDate(calendarRec, plainRelativeTo, wholeDaysLater, untilOptions), WEEKS);
      weeks += weeksPassed;
      const weeksPassedDuration = new TemporalDuration(0, 0, weeksPassed);
      let daysPassed;
      ({ relativeTo: plainRelativeTo, days: daysPassed } = MoveRelativeDate(
        calendarRec,
        plainRelativeTo,
        weeksPassedDuration
      ));
      days -= daysPassed;
      const oneWeek = new TemporalDuration(0, 0, days < 0 ? -1 : 1);
      let { days: oneWeekDays } = MoveRelativeDate(calendarRec, plainRelativeTo, oneWeek);

      oneWeekDays = MathAbs(oneWeekDays);
      if (oneWeekDays === 0) throw new RangeError('custom calendar reported that a week is 0 days long');
      // dayLengthNs is never undefined if unit is `day` or larger.
      assertExists(dayLengthNs);
      total = weeks + (days + norm.fdiv(dayLengthNs)) / oneWeekDays;
      weeks = RoundNumberToIncrement(total, increment, roundingMode);
      days = 0;
      norm = TimeDuration.ZERO;
      break;
    }
    case 'day':
      // dayLengthNs is never undefined if unit is `day` or larger.
      assertExists(dayLengthNs);
      total = days + norm.fdiv(dayLengthNs);
      days = RoundNumberToIncrement(total, increment, roundingMode);
      norm = TimeDuration.ZERO;
      break;
    default: {
      const divisor = NS_PER_TIME_UNIT.get(unit);
      total = norm.fdiv(divisor);
      norm = norm.round(JSBI.BigInt(divisor * increment), roundingMode);
    }
  }
  CombineDateAndNormalizedTimeDuration(years, months, weeks, days, norm);
  return { years, months, weeks, days, norm, total };
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

export function SnapshotOwnProperties<T extends { [s in K]?: unknown }, K extends PropertyKey & keyof T>(
  source: T | undefined,
  proto: Record<PropertyKey, unknown> | null,
  excludedKeys: (keyof T)[] = [],
  excludedValues: unknown[] = []
) {
  const copy = ObjectCreate(proto) as NonNullable<T>;
  CopyDataProperties(copy, source, excludedKeys, excludedValues);
  return copy;
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
