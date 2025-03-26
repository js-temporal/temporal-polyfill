import { DEBUG, ENABLE_ASSERTS } from './debug';
import JSBI from 'jsbi';

import type { Temporal } from '..';
import { assert, assertNotReached } from './assert';
import { abs, compare, DAY_NANOS_JSBI, divmod, ensureJSBI, isEven, MILLION, ONE, TWO, ZERO } from './bigintmath';
import type { CalendarImpl } from './calendar';
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
  Resolve,
  AnySlottedType
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
  ISO_DATE,
  ISO_DATE_TIME,
  TIME,
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

const DAY_MS = 86400_000;
export const DAY_NANOS = DAY_MS * 1e6;
const MINUTE_NANOS = 60e9;
// Instant range is 100 million days (inclusive) before or after epoch.
const MS_MAX = DAY_MS * 1e8;
const NS_MAX = epochMsToNs(MS_MAX);
const NS_MIN = JSBI.unaryMinus(NS_MAX);
// PlainDateTime range is 24 hours wider (exclusive) than the Instant range on
// both ends, to allow for valid Instant=>PlainDateTime conversion for all
// built-in time zones (whose offsets must have a magnitude less than 24 hours).
const DATETIME_NS_MIN = JSBI.add(JSBI.subtract(NS_MIN, DAY_NANOS_JSBI), ONE);
const DATETIME_NS_MAX = JSBI.subtract(JSBI.add(NS_MAX, DAY_NANOS_JSBI), ONE);
// The pattern of leap years in the ISO 8601 calendar repeats every 400 years.
// The constant below is the number of nanoseconds in 400 years. It is used to
// avoid overflows when dealing with values at the edge legacy Date's range.
const MS_IN_400_YEAR_CYCLE = (400 * 365 + 97) * DAY_MS;
const YEAR_MIN = -271821;
const YEAR_MAX = 275760;
const BEFORE_FIRST_DST = Date.UTC(1847, 0, 1); // 1847-01-01T00:00:00Z

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
  return Number(value);
}

function IsIntegralNumber(argument: unknown) {
  if (typeof argument !== 'number' || Number.isNaN(argument) || argument === Infinity || argument === -Infinity) {
    return false;
  }
  const absValue = Math.abs(argument);
  return Math.floor(absValue) === absValue;
}

export function ToString(value: unknown): string {
  if (typeof value === 'symbol') {
    throw new TypeError('Cannot convert a Symbol value to a String');
  }
  return String(value);
}

export function ToIntegerWithTruncation(value: unknown): number {
  const number = ToNumber(value);
  if (number === 0) return 0;
  if (Number.isNaN(number) || number === Infinity || number === -Infinity) {
    throw new RangeError('invalid number value');
  }
  const integer = Math.trunc(number);
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
  if (Number.isNaN(number)) throw new RangeError('not a number');
  if (number === Infinity || number === -Infinity) throw new RangeError('infinity is out of range');
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
    throw new TypeError(`expected a string, not ${String(value)}`);
  }
  return value;
}

function ToSyntacticallyValidMonthCode(valueParam: unknown) {
  const value = RequireString(ToPrimitive(valueParam, String));
  if (
    value.length < 3 ||
    value.length > 4 ||
    value[0] !== 'M' ||
    '0123456789'.indexOf(value[1]) === -1 ||
    '0123456789'.indexOf(value[2]) === -1 ||
    (value[1] + value[2] === '00' && value[3] !== 'L') ||
    (value[3] !== 'L' && value[3] !== undefined)
  ) {
    throw new RangeError(`bad month code ${value}; must match M01-M99 or M00L-M99L`);
  }
  return value;
}

function ToOffsetString(valueParam: unknown) {
  const value = RequireString(ToPrimitive(valueParam, String));
  ParseDateTimeUTCOffset(value);
  return value;
}

// Limited implementation of ToPrimitive that only handles the string case,
// because that's all that's used in this polyfill.
function ToPrimitive(value: unknown, preferredType: typeof String): string | number {
  assertExists(preferredType === String);
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
const BUILTIN_CASTS: Partial<Record<FieldKey, BuiltinCastFunction>> = {
  era: ToString,
  eraYear: ToIntegerWithTruncation,
  year: ToIntegerWithTruncation,
  month: ToPositiveIntegerWithTruncation,
  monthCode: ToSyntacticallyValidMonthCode,
  day: ToPositiveIntegerWithTruncation,
  hour: ToIntegerWithTruncation,
  minute: ToIntegerWithTruncation,
  second: ToIntegerWithTruncation,
  millisecond: ToIntegerWithTruncation,
  microsecond: ToIntegerWithTruncation,
  nanosecond: ToIntegerWithTruncation,
  offset: ToOffsetString,
  timeZone: ToTemporalTimeZoneIdentifier
};

const BUILTIN_DEFAULTS: Partial<Record<FieldKey, number>> = {
  hour: 0,
  minute: 0,
  second: 0,
  millisecond: 0,
  microsecond: 0,
  nanosecond: 0
};

// each item is [plural, singular, category, (length in ns)]
const TEMPORAL_UNITS = [
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
const SINGULAR_FOR = Object.fromEntries(TEMPORAL_UNITS.map((e) => [e[0], e[1]] as const));
const PLURAL_FOR = Object.fromEntries(TEMPORAL_UNITS.map(([p, s]) => [s, p] as const));
const UNITS_DESCENDING = TEMPORAL_UNITS.map(([, s]) => s);
type TimeUnitOrDay = Temporal.TimeUnit | 'day';
const NS_PER_TIME_UNIT = {
  day: DAY_NANOS,
  hour: 3600e9,
  minute: 60e9,
  second: 1e9,
  millisecond: 1e6,
  microsecond: 1e3,
  nanosecond: 1
};

const DURATION_FIELDS = [
  'days',
  'hours',
  'microseconds',
  'milliseconds',
  'minutes',
  'months',
  'nanoseconds',
  'seconds',
  'weeks',
  'years'
] as const;

import * as PARSE from './regex';

// Save the original Intl.DateTimeFormat, it will likely be overwritten with the
// one from this polyfill. Caching the formatter below may be reentrant, so we
// need to use the original one
const OriginalIntlDateTimeFormat = Intl.DateTimeFormat;
const IntlDateTimeFormatEnUsCache = new Map<string, Intl.DateTimeFormat>();

function getIntlDateTimeFormatEnUsForTimeZone(timeZoneIdentifier: string) {
  const lowercaseIdentifier = ASCIILowercase(timeZoneIdentifier);
  let instance = IntlDateTimeFormatEnUsCache.get(lowercaseIdentifier);
  if (instance === undefined) {
    instance = new OriginalIntlDateTimeFormat('en-us', {
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

  const keys = Reflect.ownKeys(source) as (keyof T)[];
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
  return HasSlot(item, TIME);
}

export function IsTemporalDateTime(item: unknown): item is Temporal.PlainDateTime {
  return HasSlot(item, ISO_DATE_TIME);
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

export function CheckReceiver<T extends AnySlottedType>(
  item: unknown,
  test: (item: unknown) => item is T
): asserts item is T {
  if (!test(item)) throw new TypeError('invalid receiver: method called with the wrong type of this-object');
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
  // Avoid the user code minefield of matchAll.
  let match;
  PARSE.annotation.lastIndex = 0;
  while ((match = PARSE.annotation.exec(annotations))) {
    const { 1: critical, 2: key, 3: value } = match;
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
  if (!match) throw new RangeError(`invalid RFC 9557 string: ${isoString}`);
  const calendar = processAnnotations(match[16]);
  let yearString = match[1];
  if (yearString === '-000000') throw new RangeError(`invalid RFC 9557 string: ${isoString}`);
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
  let hour, minute, second, millisecond, microsecond, nanosecond, calendar;
  if (match) {
    calendar = processAnnotations(match[10]);
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
    let time, z;
    ({ time, z, calendar } = ParseISODateTime(isoString));
    if (time === 'start-of-day') throw new RangeError(`time is missing in string: ${isoString}`);
    if (z) throw new RangeError('Z designator not supported for PlainTime');
    ({ hour, minute, second, millisecond, microsecond, nanosecond } = time);
  }
  RejectTime(hour, minute, second, millisecond, microsecond, nanosecond);
  // if it's a date-time string, OK
  if (/[tT ][0-9][0-9]/.test(isoString)) {
    return { hour, minute, second, millisecond, microsecond, nanosecond, calendar };
  }
  try {
    const { month, day } = ParseTemporalMonthDayString(isoString);
    RejectISODate(1972, month, day);
  } catch {
    try {
      const { year, month } = ParseTemporalYearMonthString(isoString);
      RejectISODate(year, month, 1);
    } catch {
      return { hour, minute, second, millisecond, microsecond, nanosecond, calendar };
    }
  }
  throw new RangeError(`invalid RFC 9557 time-only string ${isoString}; may need a T prefix`);
}

// ts-prune-ignore-next TODO: remove if test/validStrings is converted to TS.
export function ParseTemporalYearMonthString(isoString: string) {
  const match = PARSE.yearmonth.exec(isoString);
  let year, month, calendar, referenceISODay;
  if (match) {
    calendar = processAnnotations(match[3]);
    let yearString = match[1];
    if (yearString === '-000000') throw new RangeError(`invalid RFC 9557 string: ${isoString}`);
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
  /* c8 ignore next */ assertNotReached();
}

// ts-prune-ignore-next TODO: remove if test/validStrings is converted to TS.
export function ParseTemporalDurationStringRaw(isoString: string) {
  const match = PARSE.duration.exec(isoString);
  if (!match) throw new RangeError(`invalid duration: ${isoString}`);
  if (match.every((part, i) => i < 2 || part === undefined)) {
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
  const microseconds = Math.trunc(excessNanoseconds / 1000) % 1000;
  const milliseconds = Math.trunc(excessNanoseconds / 1e6) % 1000;
  seconds += Math.trunc(excessNanoseconds / 1e9) % 60;
  minutes += Math.trunc(excessNanoseconds / 60e9);

  RejectDuration(years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
  return { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
}

function ParseTemporalDurationString(isoString: string) {
  const { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } =
    ParseTemporalDurationStringRaw(isoString);
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
      hour = ConstrainToRange(hour, 0, 23);
      minute = ConstrainToRange(minute, 0, 59);
      second = ConstrainToRange(second, 0, 59);
      millisecond = ConstrainToRange(millisecond, 0, 999);
      microsecond = ConstrainToRange(microsecond, 0, 999);
      nanosecond = ConstrainToRange(nanosecond, 0, 999);
      break;
  }
  return { hour, minute, second, millisecond, microsecond, nanosecond };
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

export function AdjustDateDurationRecord(
  { years, months, weeks, days }: DateDuration,
  newDays: number,
  newWeeks?: number,
  newMonths?: number
) {
  return {
    years,
    months: newMonths ?? months,
    weeks: newWeeks ?? weeks,
    days: newDays ?? days
  };
}

export function ZeroDateDuration() {
  return { years: 0, months: 0, weeks: 0, days: 0 };
}

export function CombineISODateAndTimeRecord(isoDate: ISODate, time: TimeRecord) {
  return { isoDate, time };
}

export function MidnightTimeRecord() {
  return { deltaDays: 0, hour: 0, minute: 0, second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 };
}

export function NoonTimeRecord() {
  return { deltaDays: 0, hour: 12, minute: 0, second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 };
}

export function GetTemporalOverflowOption(options: Temporal.AssignmentOptions) {
  return GetOption(options, 'overflow', ['constrain', 'reject'], 'constrain');
}

export function GetTemporalDisambiguationOption(options: Temporal.ToInstantOptions) {
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
  options: Temporal.OffsetDisambiguationOptions,
  fallback: Required<Temporal.OffsetDisambiguationOptions>['offset']
) {
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
  const digitCount = Math.floor(digitsValue);
  if (!Number.isFinite(digitCount) || digitCount < 0 || digitCount > 9) {
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
  let allowedSingular: Array<Temporal.DateTimeUnit | 'auto'> = [];
  for (let index = 0; index < TEMPORAL_UNITS.length; index++) {
    const unitInfo = TEMPORAL_UNITS[index];
    const singular = unitInfo[1];
    const category = unitInfo[2];
    if (unitGroup === 'datetime' || unitGroup === category) {
      allowedSingular.push(singular);
    }
  }
  allowedSingular = allowedSingular.concat(extraValues);
  let defaultVal: typeof REQUIRED | Temporal.DateTimeUnit | 'auto' | undefined = requiredOrDefault;
  if (defaultVal === REQUIRED) {
    defaultVal = undefined;
  } else if (defaultVal !== undefined) {
    allowedSingular.push(defaultVal);
  }
  let allowedValues: Array<Temporal.DateTimeUnit | Temporal.PluralUnit<Temporal.DateTimeUnit> | 'auto'> = [];
  allowedValues = allowedValues.concat(allowedSingular);
  for (let index = 0; index < allowedSingular.length; index++) {
    const singular = allowedSingular[index];
    const plural = PLURAL_FOR[singular];
    if (plural !== undefined) allowedValues.push(plural);
  }
  let retval = GetOption(options, key, allowedValues, defaultVal);
  if (retval === undefined && requiredOrDefault === REQUIRED) {
    throw new RangeError(`${key} is required`);
  }
  // Coerce any plural units into their singular form
  return (retval && retval in SINGULAR_FOR ? SINGULAR_FOR[retval] : retval) as R;
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
  let isoDate, time, calendar, timeZone, offset;
  if (IsObject(relativeTo)) {
    if (IsTemporalZonedDateTime(relativeTo)) {
      return { zonedRelativeTo: relativeTo };
    }
    if (IsTemporalDate(relativeTo)) return { plainRelativeTo: relativeTo };
    if (IsTemporalDateTime(relativeTo)) {
      return {
        plainRelativeTo: CreateTemporalDate(GetSlot(relativeTo, ISO_DATE_TIME).isoDate, GetSlot(relativeTo, CALENDAR))
      };
    }
    calendar = GetTemporalCalendarIdentifierWithISODefault(relativeTo);
    const fields = PrepareCalendarFields(
      calendar,
      relativeTo,
      ['year', 'month', 'monthCode', 'day'],
      ['hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond', 'offset', 'timeZone'],
      []
    );
    ({ isoDate, time } = InterpretTemporalDateTimeFields(calendar, fields, 'constrain'));
    ({ offset, timeZone } = fields);
    if (offset === undefined) offsetBehaviour = 'wall';
  } else {
    let tzAnnotation, z, year, month, day;
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
    calendar = CanonicalizeCalendar(calendar);
    isoDate = { year, month, day };
  }
  if (timeZone === undefined) {
    return { plainRelativeTo: CreateTemporalDate(isoDate, calendar) };
  }
  const offsetNs = offsetBehaviour === 'option' ? ParseDateTimeUTCOffset(castExists(offset)) : 0;
  const epochNanoseconds = InterpretISODateTimeOffset(
    isoDate,
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
  const i1 = UNITS_DESCENDING.indexOf(unit1);
  const i2 = UNITS_DESCENDING.indexOf(unit2);
  if (i1 > i2) {
    return unit2;
  }
  return unit1;
}

export function IsCalendarUnit(unit: Temporal.DateTimeUnit): unit is Exclude<Temporal.DateUnit, 'day'> {
  return unit === 'year' || unit === 'month' || unit === 'week';
}

export function TemporalUnitCategory(unit: Temporal.DateTimeUnit) {
  if (IsCalendarUnit(unit) || unit === 'day') return 'date';
  return 'time';
}

function calendarImplForID(calendar: BuiltinCalendarId) {
  return GetIntrinsic('%calendarImpl%')(calendar);
}

export function calendarImplForObj(
  temporalObj:
    | Temporal.PlainDate
    | Temporal.PlainDateTime
    | Temporal.PlainMonthDay
    | Temporal.PlainYearMonth
    | Temporal.ZonedDateTime
) {
  return GetIntrinsic('%calendarImpl%')(GetSlot(temporalObj, CALENDAR));
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
  const fields = Object.create(null);
  const calendarImpl = calendarImplForID(calendar);
  const calendarDate = calendarImpl.isoToDate(isoDate, { year: true, monthCode: true, day: true });

  fields.monthCode = calendarDate.monthCode;
  if (type === 'month-day' || type === 'date') {
    fields.day = calendarDate.day;
  }
  if (type === 'year-month' || type === 'date') {
    fields.year = calendarDate.year;
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
  const extraFieldNames = calendarImplForID(calendar).extraFields(calendarFieldNames) as FieldKeys[];
  const fields = calendarFieldNames.concat(nonCalendarFieldNames, extraFieldNames);
  const result: Partial<Record<AnyTemporalKey, unknown>> = Object.create(null);
  let any = false;
  fields.sort();
  for (let index = 0; index < fields.length; index++) {
    const property = fields[index];
    const value = bag[property];
    if (value !== undefined) {
      any = true;
      result[property] = castExists(BUILTIN_CASTS[property])(value);
    } else if (requiredFields !== 'partial') {
      if (requiredFields.includes(property)) {
        throw new TypeError(`required property '${property}' missing or undefined`);
      }
      result[property] = BUILTIN_DEFAULTS[property];
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
  const result: Partial<TimeRecord> = Object.create(null);
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
      return CreateTemporalDate(GetSlot(item, ISO_DATE), GetSlot(item, CALENDAR));
    }
    if (IsTemporalZonedDateTime(item)) {
      const isoDateTime = GetISODateTimeFor(GetSlot(item, TIME_ZONE), GetSlot(item, EPOCHNANOSECONDS));
      GetTemporalOverflowOption(GetOptionsObject(options)); // validate and ignore
      const isoDate = isoDateTime.isoDate;
      return CreateTemporalDate(isoDate, GetSlot(item, CALENDAR));
    }
    if (IsTemporalDateTime(item)) {
      GetTemporalOverflowOption(GetOptionsObject(options)); // validate and ignore
      return CreateTemporalDate(GetSlot(item, ISO_DATE_TIME).isoDate, GetSlot(item, CALENDAR));
    }
    const calendar = GetTemporalCalendarIdentifierWithISODefault(item);
    const fields = PrepareCalendarFields(calendar, item, ['year', 'month', 'monthCode', 'day'], [], []);
    const overflow = GetTemporalOverflowOption(GetOptionsObject(options));
    const isoDate = CalendarDateFromFields(calendar, fields, overflow);
    return CreateTemporalDate(isoDate, calendar);
  }
  let { year, month, day, calendar, z } = ParseTemporalDateString(RequireString(item));
  if (z) throw new RangeError('Z designator not supported for PlainDate');
  if (!calendar) calendar = 'iso8601';
  calendar = CanonicalizeCalendar(calendar);
  uncheckedAssertNarrowedType<BuiltinCalendarId>(calendar, 'lowercased and canonicalized');
  GetTemporalOverflowOption(GetOptionsObject(options)); // validate and ignore
  return CreateTemporalDate({ year, month, day }, calendar);
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
  return CombineISODateAndTimeRecord(isoDate, time);
}

export function ToTemporalDateTime(item: PlainDateTimeParams['from'][0], options?: PlainDateTimeParams['from'][1]) {
  let isoDate, time, calendar;

  if (IsObject(item)) {
    if (IsTemporalDateTime(item)) {
      GetTemporalOverflowOption(GetOptionsObject(options));
      return CreateTemporalDateTime(GetSlot(item, ISO_DATE_TIME), GetSlot(item, CALENDAR));
    }
    if (IsTemporalZonedDateTime(item)) {
      const isoDateTime = GetISODateTimeFor(GetSlot(item, TIME_ZONE), GetSlot(item, EPOCHNANOSECONDS));
      GetTemporalOverflowOption(GetOptionsObject(options));
      return CreateTemporalDateTime(isoDateTime, GetSlot(item, CALENDAR));
    }
    if (IsTemporalDate(item)) {
      GetTemporalOverflowOption(GetOptionsObject(options));
      return CreateTemporalDateTime(
        CombineISODateAndTimeRecord(GetSlot(item, ISO_DATE), MidnightTimeRecord()),
        GetSlot(item, CALENDAR)
      );
    }

    calendar = GetTemporalCalendarIdentifierWithISODefault(item);
    const fields = PrepareCalendarFields(
      calendar,
      item,
      ['year', 'month', 'monthCode', 'day'],
      ['hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond'],
      []
    );
    const overflow = GetTemporalOverflowOption(GetOptionsObject(options));
    ({ isoDate, time } = InterpretTemporalDateTimeFields(calendar, fields, overflow));
  } else {
    let z, year, month, day;
    ({ year, month, day, time, calendar, z } = ParseTemporalDateTimeString(RequireString(item)));
    if (z) throw new RangeError('Z designator not supported for PlainDateTime');
    if (time === 'start-of-day') time = MidnightTimeRecord();
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
    calendar = CanonicalizeCalendar(calendar);
    GetTemporalOverflowOption(GetOptionsObject(options));
    isoDate = { year, month, day };
  }
  const isoDateTime = CombineISODateAndTimeRecord(isoDate, time);
  return CreateTemporalDateTime(isoDateTime, calendar);
}

export function ToTemporalDuration(item: DurationParams['from'][0]) {
  const TemporalDuration = GetIntrinsic('%Temporal.Duration%');
  if (IsTemporalDuration(item)) {
    return new TemporalDuration(
      GetSlot(item, YEARS),
      GetSlot(item, MONTHS),
      GetSlot(item, WEEKS),
      GetSlot(item, DAYS),
      GetSlot(item, HOURS),
      GetSlot(item, MINUTES),
      GetSlot(item, SECONDS),
      GetSlot(item, MILLISECONDS),
      GetSlot(item, MICROSECONDS),
      GetSlot(item, NANOSECONDS)
    );
  }
  if (!IsObject(item)) {
    return ParseTemporalDurationString(RequireString(item));
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
  return new TemporalDuration(
    result.years,
    result.months,
    result.weeks,
    result.days,
    result.hours,
    result.minutes,
    result.seconds,
    result.milliseconds,
    result.microseconds,
    result.nanoseconds
  );
}

export function ToTemporalInstant(itemParam: InstantParams['from'][0]) {
  let item: string | number;
  if (IsObject(itemParam)) {
    if (IsTemporalInstant(itemParam) || IsTemporalZonedDateTime(itemParam)) {
      return CreateTemporalInstant(GetSlot(itemParam, EPOCHNANOSECONDS));
    }
    item = ToPrimitive(itemParam, String);
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
  const offsetNanoseconds = z ? 0 : ParseDateTimeUTCOffset(castExists(offset));
  const balanced = BalanceISODateTime(
    year,
    month,
    day,
    hour,
    minute,
    second,
    millisecond,
    microsecond,
    nanosecond - offsetNanoseconds
  );
  CheckISODaysRange(balanced.isoDate);
  const epochNanoseconds = GetUTCEpochNanoseconds(balanced);
  return CreateTemporalInstant(epochNanoseconds);
}

export function ToTemporalMonthDay(item: PlainMonthDayParams['from'][0], options?: PlainMonthDayParams['from'][1]) {
  if (IsObject(item)) {
    if (IsTemporalMonthDay(item)) {
      GetTemporalOverflowOption(GetOptionsObject(options));
      return CreateTemporalMonthDay(GetSlot(item, ISO_DATE), GetSlot(item, CALENDAR));
    }
    let calendar;
    if (HasSlot(item, CALENDAR)) {
      calendar = GetSlot(item, CALENDAR);
    } else {
      calendar = item.calendar;
      if (calendar === undefined) calendar = 'iso8601';
      calendar = ToTemporalCalendarIdentifier(calendar);
    }
    const fields = PrepareCalendarFields(calendar, item, ['year', 'month', 'monthCode', 'day'], [], []);
    const overflow = GetTemporalOverflowOption(GetOptionsObject(options));
    const isoDate = CalendarMonthDayFromFields(calendar, fields, overflow);
    return CreateTemporalMonthDay(isoDate, calendar);
  }

  let { month, day, referenceISOYear, calendar } = ParseTemporalMonthDayString(RequireString(item));
  if (calendar === undefined) calendar = 'iso8601';
  calendar = CanonicalizeCalendar(calendar);
  uncheckedAssertNarrowedType<BuiltinCalendarId>(calendar, 'lowercased and canonicalized');

  GetTemporalOverflowOption(GetOptionsObject(options));
  if (calendar === 'iso8601') {
    const isoCalendarReferenceYear = 1972; // First leap year after Unix epoch
    return CreateTemporalMonthDay({ year: isoCalendarReferenceYear, month, day }, calendar);
  }
  assertExists(referenceISOYear);
  let isoDate = { year: referenceISOYear, month, day };
  RejectDateRange(isoDate);
  const result = ISODateToFields(calendar, isoDate, 'month-day');
  isoDate = CalendarMonthDayFromFields(calendar, result, 'constrain');
  return CreateTemporalMonthDay(isoDate, calendar);
}

export function ToTemporalTime(item: PlainTimeParams['from'][0], options?: PlainTimeParams['from'][1]) {
  let time;
  if (IsObject(item)) {
    if (IsTemporalTime(item)) {
      GetTemporalOverflowOption(GetOptionsObject(options));
      return CreateTemporalTime(GetSlot(item, TIME));
    }
    if (IsTemporalDateTime(item)) {
      GetTemporalOverflowOption(GetOptionsObject(options));
      return CreateTemporalTime(GetSlot(item, ISO_DATE_TIME).time);
    }
    if (IsTemporalZonedDateTime(item)) {
      const isoDateTime = GetISODateTimeFor(GetSlot(item, TIME_ZONE), GetSlot(item, EPOCHNANOSECONDS));
      GetTemporalOverflowOption(GetOptionsObject(options));
      return CreateTemporalTime(isoDateTime.time);
    }
    const { hour, minute, second, millisecond, microsecond, nanosecond } = ToTemporalTimeRecord(item);
    const overflow = GetTemporalOverflowOption(GetOptionsObject(options));
    time = RegulateTime(hour, minute, second, millisecond, microsecond, nanosecond, overflow);
  } else {
    time = ParseTemporalTimeString(RequireString(item));
    GetTemporalOverflowOption(GetOptionsObject(options));
  }
  return CreateTemporalTime(time);
}

export function ToTimeRecordOrMidnight(item: PlainTimeParams['from'][0] | undefined) {
  if (item === undefined) return MidnightTimeRecord();
  return GetSlot(ToTemporalTime(item), TIME);
}

export function ToTemporalYearMonth(
  item: PlainYearMonthParams['from'][0],
  options?: PlainYearMonthParams['from'][1]
): Temporal.PlainYearMonth {
  if (IsObject(item)) {
    if (IsTemporalYearMonth(item)) {
      GetTemporalOverflowOption(GetOptionsObject(options));
      return CreateTemporalYearMonth(GetSlot(item, ISO_DATE), GetSlot(item, CALENDAR));
    }
    const calendar = GetTemporalCalendarIdentifierWithISODefault(item);
    const fields = PrepareCalendarFields(calendar, item, ['year', 'month', 'monthCode'], [], []);
    const overflow = GetTemporalOverflowOption(GetOptionsObject(options));
    const isoDate = CalendarYearMonthFromFields(calendar, fields, overflow);
    return CreateTemporalYearMonth(isoDate, calendar);
  }

  let { year, month, referenceISODay, calendar } = ParseTemporalYearMonthString(RequireString(item));
  if (calendar === undefined) calendar = 'iso8601';
  calendar = CanonicalizeCalendar(calendar);
  uncheckedAssertNarrowedType<BuiltinCalendarId>(calendar, 'lowercased and canonicalized');

  GetTemporalOverflowOption(GetOptionsObject(options));
  let isoDate = { year, month, day: referenceISODay };
  RejectYearMonthRange(isoDate);
  const result = ISODateToFields(calendar, isoDate, 'year-month');
  isoDate = CalendarYearMonthFromFields(calendar, result, 'constrain');
  return CreateTemporalYearMonth(isoDate, calendar);
}

type OffsetBehaviour = 'wall' | 'exact' | 'option';

export function InterpretISODateTimeOffset(
  isoDate: ISODate,
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
    assert(offsetBehaviour === 'wall', 'offset cannot be provided in YYYY-MM-DD[Zone] string');
    assert(offsetNs === 0, 'offset cannot be provided in YYYY-MM-DD[Zone] string');
    return GetStartOfDay(timeZone, isoDate);
  }

  const dt = CombineISODateAndTimeRecord(isoDate, time);

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
    const balanced = BalanceISODateTime(
      isoDate.year,
      isoDate.month,
      isoDate.day,
      time.hour,
      time.minute,
      time.second,
      time.millisecond,
      time.microsecond,
      time.nanosecond - offsetNs
    );
    CheckISODaysRange(balanced.isoDate);
    const epochNs = GetUTCEpochNanoseconds(balanced);
    ValidateEpochNanoseconds(epochNs);
    return epochNs;
  }

  CheckISODaysRange(isoDate);
  const utcEpochNs = GetUTCEpochNanoseconds(dt);

  // "prefer" or "reject"
  const possibleEpochNs = GetPossibleEpochNanoseconds(timeZone, dt);
  for (let index = 0; index < possibleEpochNs.length; index++) {
    const candidate = possibleEpochNs[index];
    const candidateOffset = JSBI.toNumber(JSBI.subtract(utcEpochNs, candidate));
    const roundedCandidateOffset = RoundNumberToIncrement(candidateOffset, 60e9, 'halfExpand');
    if (candidateOffset === offsetNs || (matchMinute && roundedCandidateOffset === offsetNs)) {
      return candidate;
    }
  }

  // the user-provided offset doesn't match any instants for this time
  // zone and date/time.
  if (offsetOpt === 'reject') {
    const offsetStr = FormatUTCOffsetNanoseconds(offsetNs);
    const dtStr = ISODateTimeToString(dt, 'iso8601', 'auto');
    throw new RangeError(`Offset ${offsetStr} is invalid for ${dtStr} in ${timeZone}`);
  }
  // fall through: offsetOpt === 'prefer', but the offset doesn't match
  // so fall back to use the time zone instead.
  return DisambiguatePossibleEpochNanoseconds(possibleEpochNs, timeZone, dt, disambiguation);
}

export function ToTemporalZonedDateTime(
  item: ZonedDateTimeParams['from'][0],
  options?: ZonedDateTimeParams['from'][1]
) {
  let isoDate, time, timeZone, offset, calendar;
  let matchMinute = false;
  let offsetBehaviour: OffsetBehaviour = 'option';
  let disambiguation, offsetOpt;
  if (IsObject(item)) {
    if (IsTemporalZonedDateTime(item)) {
      const resolvedOptions = GetOptionsObject(options);
      GetTemporalDisambiguationOption(resolvedOptions); // validate and ignore
      GetTemporalOffsetOption(resolvedOptions, 'reject');
      GetTemporalOverflowOption(resolvedOptions);
      return CreateTemporalZonedDateTime(
        GetSlot(item, EPOCHNANOSECONDS),
        GetSlot(item, TIME_ZONE),
        GetSlot(item, CALENDAR)
      );
    }
    calendar = GetTemporalCalendarIdentifierWithISODefault(item);
    const fields = PrepareCalendarFields(
      calendar,
      item,
      ['year', 'month', 'monthCode', 'day'],
      ['hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond', 'offset', 'timeZone'],
      ['timeZone']
    );
    ({ offset, timeZone } = fields);
    if (offset === undefined) {
      offsetBehaviour = 'wall';
    }
    const resolvedOptions = GetOptionsObject(options);
    disambiguation = GetTemporalDisambiguationOption(resolvedOptions);
    offsetOpt = GetTemporalOffsetOption(resolvedOptions, 'reject');
    const overflow = GetTemporalOverflowOption(resolvedOptions);
    ({ isoDate, time } = InterpretTemporalDateTimeFields(calendar, fields, overflow));
  } else {
    let tzAnnotation, z, year, month, day;
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
    calendar = CanonicalizeCalendar(calendar);
    matchMinute = true; // ISO strings may specify offset with less precision
    const resolvedOptions = GetOptionsObject(options);
    disambiguation = GetTemporalDisambiguationOption(resolvedOptions);
    offsetOpt = GetTemporalOffsetOption(resolvedOptions, 'reject');
    GetTemporalOverflowOption(resolvedOptions); // validate and ignore
    isoDate = { year, month, day };
  }
  let offsetNs = 0;
  if (offsetBehaviour === 'option') offsetNs = ParseDateTimeUTCOffset(castExists(offset));
  const epochNanoseconds = InterpretISODateTimeOffset(
    isoDate,
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

export function CreateTemporalDateSlots(result: Temporal.PlainDate, isoDate: ISODate, calendar: BuiltinCalendarId) {
  RejectDateRange(isoDate);

  CreateSlots(result);
  SetSlot(result, ISO_DATE, isoDate);
  SetSlot(result, CALENDAR, calendar);
  SetSlot(result, DATE_BRAND, true);

  if (DEBUG) {
    const repr = TemporalDateToString(result, 'auto');
    Object.defineProperty(result, '_repr_', {
      value: `Temporal.PlainDate <${repr}>`,
      writable: false,
      enumerable: false,
      configurable: false
    });
  }
}

export function CreateTemporalDate(isoDate: ISODate, calendar: BuiltinCalendarId) {
  const TemporalPlainDate = GetIntrinsic('%Temporal.PlainDate%');
  const result = Object.create(TemporalPlainDate.prototype);
  CreateTemporalDateSlots(result, isoDate, calendar);
  return result;
}

export function CreateTemporalDateTimeSlots(
  result: Temporal.PlainDateTime,
  isoDateTime: ISODateTime,
  calendar: BuiltinCalendarId
) {
  RejectDateTimeRange(isoDateTime);

  CreateSlots(result);
  SetSlot(result, ISO_DATE_TIME, isoDateTime);
  SetSlot(result, CALENDAR, calendar);

  if (DEBUG) {
    let repr = ISODateTimeToString(isoDateTime, calendar, 'auto');
    Object.defineProperty(result, '_repr_', {
      value: `Temporal.PlainDateTime <${repr}>`,
      writable: false,
      enumerable: false,
      configurable: false
    });
  }
}

export function CreateTemporalDateTime(isoDateTime: ISODateTime, calendar: BuiltinCalendarId) {
  const TemporalPlainDateTime = GetIntrinsic('%Temporal.PlainDateTime%');
  const result = Object.create(TemporalPlainDateTime.prototype);
  CreateTemporalDateTimeSlots(result, isoDateTime, calendar);
  return result;
}

export function CreateTemporalMonthDaySlots(
  result: Temporal.PlainMonthDay,
  isoDate: ISODate,
  calendar: BuiltinCalendarId
) {
  RejectDateRange(isoDate);

  CreateSlots(result);
  SetSlot(result, ISO_DATE, isoDate);
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

export function CreateTemporalMonthDay(isoDate: ISODate, calendar: BuiltinCalendarId) {
  const TemporalPlainMonthDay = GetIntrinsic('%Temporal.PlainMonthDay%');
  const result = Object.create(TemporalPlainMonthDay.prototype);
  CreateTemporalMonthDaySlots(result, isoDate, calendar);
  return result;
}

export function CreateTemporalTimeSlots(result: Temporal.PlainTime, time: TimeRecord) {
  CreateSlots(result);
  SetSlot(result, TIME, time);

  if (DEBUG) {
    Object.defineProperty(result, '_repr_', {
      value: `Temporal.PlainTime <${TimeRecordToString(time, 'auto')}>`,
      writable: false,
      enumerable: false,
      configurable: false
    });
  }
}

export function CreateTemporalTime(time: TimeRecord) {
  const TemporalPlainTime = GetIntrinsic('%Temporal.PlainTime%');
  const result = Object.create(TemporalPlainTime.prototype);
  CreateTemporalTimeSlots(result, time);
  return result;
}

export function CreateTemporalYearMonthSlots(
  result: Temporal.PlainYearMonth,
  isoDate: ISODate,
  calendar: BuiltinCalendarId
) {
  RejectYearMonthRange(isoDate);

  CreateSlots(result);
  SetSlot(result, ISO_DATE, isoDate);
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

export function CreateTemporalYearMonth(isoDate: ISODate, calendar: BuiltinCalendarId) {
  const TemporalPlainYearMonth = GetIntrinsic('%Temporal.PlainYearMonth%');
  const result = Object.create(TemporalPlainYearMonth.prototype);
  CreateTemporalYearMonthSlots(result, isoDate, calendar);
  return result;
}

export function CreateTemporalInstantSlots(result: Temporal.Instant, epochNanoseconds: JSBI) {
  ValidateEpochNanoseconds(epochNanoseconds);
  CreateSlots(result);
  SetSlot(result, EPOCHNANOSECONDS, epochNanoseconds);

  if (DEBUG) {
    const iso = GetISOPartsFromEpoch(epochNanoseconds);
    const repr = ISODateTimeToString(iso, 'iso8601', 'auto', 'never') + 'Z';
    Object.defineProperty(result, '_repr_', {
      value: `${result[Symbol.toStringTag]} <${repr}>`,
      writable: false,
      enumerable: false,
      configurable: false
    });
  }
}

export function CreateTemporalInstant(epochNanoseconds: JSBI) {
  const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
  const result: Temporal.Instant = Object.create(TemporalInstant.prototype);
  CreateTemporalInstantSlots(result, epochNanoseconds);
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
  const result: Temporal.ZonedDateTime = Object.create(TemporalZonedDateTime.prototype);
  CreateTemporalZonedDateTimeSlots(result, epochNanoseconds, timeZone, calendar);
  return result;
}

function CalendarFieldKeysPresent(fields: Record<FieldKey, unknown>) {
  return CALENDAR_FIELD_KEYS.filter((key) => fields[key] !== undefined);
}

export function CalendarMergeFields<Base extends Record<string, unknown>, ToAdd extends Record<string, unknown>>(
  calendar: BuiltinCalendarId,
  fields: Base,
  additionalFields: ToAdd
) {
  const additionalKeys = CalendarFieldKeysPresent(additionalFields);
  const overriddenKeys = calendarImplForID(calendar).fieldKeysToIgnore(additionalKeys);
  const merged = Object.create(null);
  const fieldsKeys = CalendarFieldKeysPresent(fields);
  for (let ix = 0; ix < CALENDAR_FIELD_KEYS.length; ix++) {
    let propValue = undefined;
    const key = CALENDAR_FIELD_KEYS[ix];
    if (fieldsKeys.includes(key) && !overriddenKeys.includes(key)) {
      propValue = fields[key];
    }
    if (additionalKeys.includes(key)) {
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
  const result = calendarImplForID(calendar).dateAdd(isoDate, dateDuration, overflow);
  RejectDateRange(result);
  return result;
}

function CalendarDateUntil(
  calendar: BuiltinCalendarId,
  isoDate: ISODate,
  isoOtherDate: ISODate,
  largestUnit: Temporal.DateUnit
) {
  return calendarImplForID(calendar).dateUntil(isoDate, isoOtherDate, largestUnit);
}

export function ToTemporalCalendarIdentifier(calendarLike: Temporal.CalendarLike): BuiltinCalendarId {
  if (IsObject(calendarLike)) {
    if (HasSlot(calendarLike, CALENDAR)) return GetSlot(calendarLike, CALENDAR);
  }
  const identifier = RequireString(calendarLike);
  try {
    // Fast path: identifier is a calendar type, no ISO string parsing needed
    return CanonicalizeCalendar(identifier);
  } catch {
    // fall through
  }
  let calendar;
  try {
    ({ calendar } = ParseISODateTime(identifier));
  } catch {
    try {
      ({ calendar } = ParseTemporalTimeString(identifier));
    } catch {
      try {
        ({ calendar } = ParseTemporalYearMonthString(identifier));
      } catch {
        ({ calendar } = ParseTemporalMonthDayString(identifier));
      }
    }
  }
  if (!calendar) calendar = 'iso8601';
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
  const calendarImpl: CalendarImpl = calendarImplForID(calendar);
  calendarImpl.resolveFields(fields, 'date');
  const result = calendarImpl.dateToISO(fields, overflow);
  RejectDateRange(result);
  return result;
}

export function CalendarYearMonthFromFields(
  calendar: BuiltinCalendarId,
  fields: CalendarFieldsRecord,
  overflow: Overflow
) {
  const calendarImpl: CalendarImpl = calendarImplForID(calendar);
  calendarImpl.resolveFields(fields, 'year-month');
  fields.day = 1;
  const result = calendarImpl.dateToISO(fields, overflow);
  RejectYearMonthRange(result);
  return result;
}

export function CalendarMonthDayFromFields(
  calendar: BuiltinCalendarId,
  fields: MonthDayFromFieldsObject,
  overflow: Overflow
) {
  const calendarImpl: CalendarImpl = calendarImplForID(calendar);
  calendarImpl.resolveFields(fields, 'month-day');
  const result = calendarImpl.monthDayToISOReferenceDate(fields, overflow);
  RejectDateRange(result);
  return result;
}

export function ToTemporalTimeZoneIdentifier(temporalTimeZoneLike: unknown): string {
  if (IsObject(temporalTimeZoneLike)) {
    if (IsTemporalZonedDateTime(temporalTimeZoneLike)) return GetSlot(temporalTimeZoneLike, TIME_ZONE);
  }
  const timeZoneString = RequireString(temporalTimeZoneLike);
  if (timeZoneString === 'UTC') return 'UTC'; // UTC fast path

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

export function GetOffsetNanosecondsFor(timeZone: string, epochNs: JSBI) {
  const offsetMinutes = ParseTimeZoneIdentifier(timeZone).offsetMinutes;
  if (offsetMinutes !== undefined) return offsetMinutes * 60e9;

  return GetNamedTimeZoneOffsetNanoseconds(timeZone, epochNs);
}

export function FormatUTCOffsetNanoseconds(offsetNs: number): string {
  const sign = offsetNs < 0 ? '-' : '+';
  const absoluteNs = Math.abs(offsetNs);
  const hour = Math.floor(absoluteNs / 3600e9);
  const minute = Math.floor(absoluteNs / 60e9) % 60;
  const second = Math.floor(absoluteNs / 1e9) % 60;
  const subSecondNs = absoluteNs % 1e9;
  const precision = second === 0 && subSecondNs === 0 ? 'minute' : 'auto';
  const timeString = FormatTimeString(hour, minute, second, subSecondNs, precision);
  return `${sign}${timeString}`;
}

export function GetISODateTimeFor(timeZone: string, epochNs: JSBI) {
  const offsetNs = GetOffsetNanosecondsFor(timeZone, epochNs);
  let {
    isoDate: { year, month, day },
    time: { hour, minute, second, millisecond, microsecond, nanosecond }
  } = GetISOPartsFromEpoch(epochNs);
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
  isoDateTime: ISODateTime,
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
  const utcns = GetUTCEpochNanoseconds(isoDateTime);

  const dayBefore = JSBI.subtract(utcns, DAY_NANOS_JSBI);
  ValidateEpochNanoseconds(dayBefore);
  const offsetBefore = GetOffsetNanosecondsFor(timeZone, dayBefore);
  const dayAfter = JSBI.add(utcns, DAY_NANOS_JSBI);
  ValidateEpochNanoseconds(dayAfter);
  const offsetAfter = GetOffsetNanosecondsFor(timeZone, dayAfter);
  const nanoseconds = offsetAfter - offsetBefore;
  assert(Math.abs(nanoseconds) <= DAY_NANOS, 'UTC offset shift longer than 24 hours');

  switch (disambiguation) {
    case 'earlier': {
      const timeDuration = TimeDuration.fromComponents(0, 0, 0, 0, 0, -nanoseconds);
      const earlierTime = AddTime(isoDateTime.time, timeDuration);
      const earlierDate = BalanceISODate(
        isoDateTime.isoDate.year,
        isoDateTime.isoDate.month,
        isoDateTime.isoDate.day + earlierTime.deltaDays
      );
      const earlier = CombineISODateAndTimeRecord(earlierDate, earlierTime);
      return GetPossibleEpochNanoseconds(timeZone, earlier)[0];
    }
    case 'compatible':
    // fall through because 'compatible' means 'later' for "spring forward" transitions
    case 'later': {
      const timeDuration = TimeDuration.fromComponents(0, 0, 0, 0, 0, nanoseconds);
      const laterTime = AddTime(isoDateTime.time, timeDuration);
      const laterDate = BalanceISODate(
        isoDateTime.isoDate.year,
        isoDateTime.isoDate.month,
        isoDateTime.isoDate.day + laterTime.deltaDays
      );
      const later = CombineISODateAndTimeRecord(laterDate, laterTime);
      const possible = GetPossibleEpochNanoseconds(timeZone, later);
      return possible[possible.length - 1];
    }
  }
}

function GetPossibleEpochNanoseconds(timeZone: string, isoDateTime: ISODateTime) {
  // UTC fast path
  if (timeZone === 'UTC') {
    CheckISODaysRange(isoDateTime.isoDate);
    return [GetUTCEpochNanoseconds(isoDateTime)];
  }

  const offsetMinutes = ParseTimeZoneIdentifier(timeZone).offsetMinutes;
  if (offsetMinutes !== undefined) {
    const balanced = BalanceISODateTime(
      isoDateTime.isoDate.year,
      isoDateTime.isoDate.month,
      isoDateTime.isoDate.day,
      isoDateTime.time.hour,
      isoDateTime.time.minute - offsetMinutes,
      isoDateTime.time.second,
      isoDateTime.time.millisecond,
      isoDateTime.time.microsecond,
      isoDateTime.time.nanosecond
    );
    CheckISODaysRange(balanced.isoDate);
    const epochNs = GetUTCEpochNanoseconds(balanced);
    ValidateEpochNanoseconds(epochNs);
    return [epochNs];
  }

  CheckISODaysRange(isoDateTime.isoDate);
  return GetNamedTimeZoneEpochNanoseconds(timeZone, isoDateTime);
}

export function GetStartOfDay(timeZone: string, isoDate: ISODate) {
  const isoDateTime = CombineISODateAndTimeRecord(isoDate, MidnightTimeRecord());
  const possibleEpochNs = GetPossibleEpochNanoseconds(timeZone, isoDateTime);
  // If not a DST gap, return the single or earlier epochNs
  if (possibleEpochNs.length) return possibleEpochNs[0];

  // Otherwise, 00:00:00 lies within a DST gap. Compute an epochNs that's
  // guaranteed to be before the transition
  assert(!IsOffsetTimeZoneIdentifier(timeZone), 'should only be reached with named time zone');

  const utcns = GetUTCEpochNanoseconds(isoDateTime);
  const dayBefore = JSBI.subtract(utcns, DAY_NANOS_JSBI);
  ValidateEpochNanoseconds(dayBefore);
  return castExists(GetNamedTimeZoneNextTransition(timeZone, dayBefore));
}

export function ISOYearString(year: number) {
  let yearString;
  if (year < 0 || year > 9999) {
    const sign = year < 0 ? '-' : '+';
    const yearNumber = Math.abs(year);
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
    fraction = fractionFullPrecision.slice(0, precision);
  }
  return `.${fraction}`;
}

function FormatTimeString(
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
  const dateTimeString = ISODateTimeToString(iso, 'iso8601', precision, 'never');
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

export function TemporalDurationToString(
  duration: Temporal.Duration,
  precision: Exclude<SecondsStringPrecisionRecord['precision'], 'minute'>
) {
  const years = GetSlot(duration, YEARS);
  const months = GetSlot(duration, MONTHS);
  const weeks = GetSlot(duration, WEEKS);
  const days = GetSlot(duration, DAYS);
  const hours = GetSlot(duration, HOURS);
  const minutes = GetSlot(duration, MINUTES);
  const sign = DurationSign(duration);

  let datePart = '';
  if (years !== 0) datePart += `${Math.abs(years)}Y`;
  if (months !== 0) datePart += `${Math.abs(months)}M`;
  if (weeks !== 0) datePart += `${Math.abs(weeks)}W`;
  if (days !== 0) datePart += `${Math.abs(days)}D`;

  let timePart = '';
  if (hours !== 0) timePart += `${Math.abs(hours)}H`;
  if (minutes !== 0) timePart += `${Math.abs(minutes)}M`;

  // Keeping sub-second units separate avoids losing precision after resolving
  // any overflows from rounding
  const secondsDuration = TimeDuration.fromComponents(
    0,
    0,
    GetSlot(duration, SECONDS),
    GetSlot(duration, MILLISECONDS),
    GetSlot(duration, MICROSECONDS),
    GetSlot(duration, NANOSECONDS)
  );
  if (
    !secondsDuration.isZero() ||
    ['second', 'millisecond', 'microsecond', 'nanosecond'].includes(DefaultTemporalLargestUnit(duration)) ||
    precision !== 'auto'
  ) {
    const secondsPart = Math.abs(secondsDuration.sec);
    const subSecondsPart = FormatFractionalSeconds(Math.abs(secondsDuration.subsec), precision);
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
  const { year, month, day } = GetSlot(date, ISO_DATE);
  const yearString = ISOYearString(year);
  const monthString = ISODateTimePartString(month);
  const dayString = ISODateTimePartString(day);
  const calendar = FormatCalendarAnnotation(GetSlot(date, CALENDAR), showCalendar);
  return `${yearString}-${monthString}-${dayString}${calendar}`;
}

export function TimeRecordToString(
  { hour, minute, second, millisecond, microsecond, nanosecond }: TimeRecord,
  precision: SecondsStringPrecisionRecord['precision']
) {
  const subSecondNanoseconds = millisecond * 1e6 + microsecond * 1e3 + nanosecond;
  return FormatTimeString(hour, minute, second, subSecondNanoseconds, precision);
}

export function ISODateTimeToString(
  isoDateTime: ISODateTime,
  calendar: BuiltinCalendarId,
  precision: SecondsStringPrecisionRecord['precision'],
  showCalendar: ReturnType<typeof GetTemporalShowCalendarNameOption> = 'auto'
) {
  const {
    isoDate: { year, month, day },
    time: { hour, minute, second, millisecond, microsecond, nanosecond }
  } = isoDateTime;
  const yearString = ISOYearString(year);
  const monthString = ISODateTimePartString(month);
  const dayString = ISODateTimePartString(day);
  const subSecondNanoseconds = millisecond * 1e6 + microsecond * 1e3 + nanosecond;
  const timeString = FormatTimeString(hour, minute, second, subSecondNanoseconds, precision);
  const calendarString = FormatCalendarAnnotation(calendar, showCalendar);
  return `${yearString}-${monthString}-${dayString}T${timeString}${calendarString}`;
}

export function TemporalMonthDayToString(
  monthDay: Temporal.PlainMonthDay,
  showCalendar: Temporal.ShowCalendarOption['calendarName'] = 'auto'
) {
  const { year, month, day } = GetSlot(monthDay, ISO_DATE);
  const monthString = ISODateTimePartString(month);
  const dayString = ISODateTimePartString(day);
  let resultString = `${monthString}-${dayString}`;
  const calendar = GetSlot(monthDay, CALENDAR);
  if (showCalendar === 'always' || showCalendar === 'critical' || calendar !== 'iso8601') {
    const yearString = ISOYearString(year);
    resultString = `${yearString}-${resultString}`;
  }
  const calendarString = FormatCalendarAnnotation(calendar, showCalendar);
  if (calendarString) resultString += calendarString;
  return resultString;
}

export function TemporalYearMonthToString(
  yearMonth: Temporal.PlainYearMonth,
  showCalendar: Temporal.ShowCalendarOption['calendarName'] = 'auto'
) {
  const { year, month, day } = GetSlot(yearMonth, ISO_DATE);
  const yearString = ISOYearString(year);
  const monthString = ISODateTimePartString(month);
  let resultString = `${yearString}-${monthString}`;
  const calendar = GetSlot(yearMonth, CALENDAR);
  if (showCalendar === 'always' || showCalendar === 'critical' || calendar !== 'iso8601') {
    const dayString = ISODateTimePartString(day);
    resultString += `-${dayString}`;
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
  let dateTimeString = ISODateTimeToString(iso, 'iso8601', precision, 'never');
  if (showOffset !== 'never') {
    dateTimeString += FormatDateTimeUTCOffsetRounded(offsetNs);
  }
  if (showTimeZone !== 'never') {
    const flag = showTimeZone === 'critical' ? '!' : '';
    dateTimeString += `[${flag}${tz}]`;
  }
  dateTimeString += FormatCalendarAnnotation(GetSlot(zdt, CALENDAR), showCalendar);
  return dateTimeString;
}

export function IsOffsetTimeZoneIdentifier(string: string) {
  return OFFSET_IDENTIFIER.test(string);
}

export function ParseDateTimeUTCOffset(string: string): number {
  const match = OFFSET_WITH_PARTS.exec(string);
  if (!match) {
    throw new RangeError(`invalid time zone offset: ${string}; must match ±HH:MM[:SS.SSSSSSSSS]`);
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
const isTZIDSep = Object.assign(Object.create(null), { '/': true, '-': true, _: true });

export function GetAvailableNamedTimeZoneIdentifier(
  identifier: string
): { identifier: string; primaryIdentifier: string } | undefined {
  // The most common case is when the identifier is a canonical time zone ID.
  // Fast-path that case by caching all canonical IDs. For old ECMAScript
  // implementations lacking this API, set the cache to `null` to avoid retries.
  if (canonicalTimeZoneIdsCache === undefined) {
    const canonicalTimeZoneIds = Intl.supportedValuesOf?.('timeZone');
    if (canonicalTimeZoneIds) {
      canonicalTimeZoneIdsCache = new Map();
      for (let ix = 0; ix < canonicalTimeZoneIds.length; ix++) {
        const id = canonicalTimeZoneIds[ix];
        canonicalTimeZoneIdsCache.set(ASCIILowercase(id), id);
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

  // Special case this legacy identifier that is listed both in `backzone` and
  // `backward` in the TZDB. Work around implementations that incorrectly use
  // the `backward` data.
  if (lower === 'antarctica/south_pole') primaryIdentifier = 'Antarctica/McMurdo';

  // Some legacy identifiers are aliases in ICU but not legal IANA identifiers.
  // Reject them even if the implementation's Intl supports them, as they are
  // not present in the IANA time zone database.
  if (ICU_LEGACY_TIME_ZONE_IDS.has(identifier)) {
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
  const chars = [...lower].map((c, i) => (i === 0 || isTZIDSep[lower[i - 1]] ? c.toUpperCase() : c));
  const standardCase = chars.join('');
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

function GetNamedTimeZoneOffsetNanosecondsImpl(id: string, epochMilliseconds: number) {
  const { year, month, day, hour, minute, second } = GetFormatterParts(id, epochMilliseconds);
  let millisecond = epochMilliseconds % 1000;
  if (millisecond < 0) millisecond += 1000;
  const utc = GetUTCEpochMilliseconds({ isoDate: { year, month, day }, time: { hour, minute, second, millisecond } });
  return (utc - epochMilliseconds) * 1e6;
}

function GetNamedTimeZoneOffsetNanoseconds(id: string, epochNanoseconds: JSBI) {
  // Optimization: We get the offset nanoseconds only with millisecond
  // resolution, assuming that time zone offset changes don't happen in the
  // middle of a millisecond
  return GetNamedTimeZoneOffsetNanosecondsImpl(id, epochNsToMs(epochNanoseconds, 'floor'));
}

export function FormatOffsetTimeZoneIdentifier(offsetMinutes: number): string {
  const sign = offsetMinutes < 0 ? '-' : '+';
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hour = Math.floor(absoluteMinutes / 60);
  const minute = absoluteMinutes % 60;
  const timeString = FormatTimeString(hour, minute, 0, 0, 'minute');
  return `${sign}${timeString}`;
}

function FormatDateTimeUTCOffsetRounded(offsetNanosecondsParam: number): string {
  const offsetNanoseconds = RoundNumberToIncrement(offsetNanosecondsParam, MINUTE_NANOS, 'halfExpand');
  return FormatOffsetTimeZoneIdentifier(offsetNanoseconds / 60e9);
}

function GetUTCEpochMilliseconds({
  isoDate: { year, month, day },
  time: { hour, minute, second, millisecond }
}: {
  isoDate: ISODate;
  time: Omit<TimeRecord, 'microsecond' | 'nanosecond'>;
}) {
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
  return ms + MS_IN_400_YEAR_CYCLE * yearCycles;
}

function GetUTCEpochNanoseconds(isoDateTime: ISODateTime) {
  const ms = GetUTCEpochMilliseconds(isoDateTime);
  const subMs = isoDateTime.time.microsecond * 1e3 + isoDateTime.time.nanosecond;
  return JSBI.add(epochMsToNs(ms), JSBI.BigInt(subMs));
}

function GetISOPartsFromEpoch(epochNanoseconds: JSBI) {
  let epochMilliseconds = epochNsToMs(epochNanoseconds, 'trunc');
  let nanos = JSBI.toNumber(JSBI.remainder(epochNanoseconds, MILLION));
  if (nanos < 0) {
    nanos += 1e6;
    epochMilliseconds -= 1;
  }
  const microsecond = Math.floor(nanos / 1e3) % 1e3;
  const nanosecond = nanos % 1e3;

  const item = new Date(epochMilliseconds);
  const year = item.getUTCFullYear();
  const month = item.getUTCMonth() + 1;
  const day = item.getUTCDate();
  const hour = item.getUTCHours();
  const minute = item.getUTCMinutes();
  const second = item.getUTCSeconds();
  const millisecond = item.getUTCMilliseconds();

  return {
    epochMilliseconds,
    isoDate: { year, month, day },
    time: { hour, minute, second, millisecond, microsecond, nanosecond }
  };
}

// ts-prune-ignore-next TODO: remove this after tests are converted to TS
export function GetNamedTimeZoneDateTimeParts(id: string, epochNanoseconds: JSBI) {
  const {
    epochMilliseconds,
    time: { millisecond, microsecond, nanosecond }
  } = GetISOPartsFromEpoch(epochNanoseconds);
  const { year, month, day, hour, minute, second } = GetFormatterParts(id, epochMilliseconds);
  return BalanceISODateTime(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond);
}

export function GetNamedTimeZoneNextTransition(id: string, epochNanoseconds: JSBI): JSBI | null {
  if (id === 'UTC') return null; // UTC fast path

  // Optimization: we floor the instant to the previous millisecond boundary
  // so that we can do Number math instead of BigInt math. This assumes that
  // time zone transitions don't happen in the middle of a millisecond.
  const epochMilliseconds = epochNsToMs(epochNanoseconds, 'floor');
  if (epochMilliseconds < BEFORE_FIRST_DST) {
    return GetNamedTimeZoneNextTransition(id, epochMsToNs(BEFORE_FIRST_DST));
  }

  // Optimization: the farthest that we'll look for a next transition is 3 years
  // after the later of epochNanoseconds or the current time. If there are no
  // transitions found before then, we'll assume that there will not be any more
  // transitions after that.
  const now = Date.now();
  const base = Math.max(epochMilliseconds, now);
  const uppercap = base + DAY_MS * 366 * 3;
  let leftMs = epochMilliseconds;
  let leftOffsetNs = GetNamedTimeZoneOffsetNanosecondsImpl(id, leftMs);
  let rightMs = leftMs;
  let rightOffsetNs = leftOffsetNs;
  while (leftOffsetNs === rightOffsetNs && leftMs < uppercap) {
    rightMs = leftMs + DAY_MS * 2 * 7;
    if (rightMs > MS_MAX) return null;
    rightOffsetNs = GetNamedTimeZoneOffsetNanosecondsImpl(id, rightMs);
    if (leftOffsetNs === rightOffsetNs) {
      leftMs = rightMs;
    }
  }
  if (leftOffsetNs === rightOffsetNs) return null;
  const result = bisect(
    (epochMs: number) => GetNamedTimeZoneOffsetNanosecondsImpl(id, epochMs),
    leftMs,
    rightMs,
    leftOffsetNs,
    rightOffsetNs
  );
  return epochMsToNs(result);
}

export function GetNamedTimeZonePreviousTransition(id: string, epochNanoseconds: JSBI): JSBI | null {
  if (id === 'UTC') return null; // UTC fast path

  // Optimization: we raise the instant to the next millisecond boundary so
  // that we can do Number math instead of BigInt math. This assumes that time
  // zone transitions don't happen in the middle of a millisecond.
  const epochMilliseconds = epochNsToMs(epochNanoseconds, 'ceil');

  // Optimization: if the instant is more than 3 years in the future and there
  // are no transitions between the present day and 3 years from now, assume
  // there are none after.
  const now = Date.now();
  const lookahead = now + DAY_MS * 366 * 3;
  if (epochMilliseconds > lookahead) {
    const prevBeforeLookahead = GetNamedTimeZonePreviousTransition(id, epochMsToNs(lookahead));
    if (prevBeforeLookahead === null || JSBI.lessThan(prevBeforeLookahead, epochMsToNs(now))) {
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
    const lastPrecomputed = Date.UTC(2088, 0, 1); // 2088-01-01T00Z
    if (lastPrecomputed < epochMilliseconds) {
      return GetNamedTimeZonePreviousTransition(id, epochMsToNs(lastPrecomputed));
    }
  }

  let rightMs = epochMilliseconds - 1;
  if (rightMs < BEFORE_FIRST_DST) return null;
  let rightOffsetNs = GetNamedTimeZoneOffsetNanosecondsImpl(id, rightMs);
  let leftMs = rightMs;
  let leftOffsetNs = rightOffsetNs;
  while (rightOffsetNs === leftOffsetNs && rightMs > BEFORE_FIRST_DST) {
    leftMs = rightMs - DAY_MS * 2 * 7;
    if (leftMs < BEFORE_FIRST_DST) return null;
    leftOffsetNs = GetNamedTimeZoneOffsetNanosecondsImpl(id, leftMs);
    if (rightOffsetNs === leftOffsetNs) {
      rightMs = leftMs;
    }
  }
  if (rightOffsetNs === leftOffsetNs) return null;
  const result = bisect(
    (epochMs: number) => GetNamedTimeZoneOffsetNanosecondsImpl(id, epochMs),
    leftMs,
    rightMs,
    leftOffsetNs,
    rightOffsetNs
  );
  return epochMsToNs(result);
}

// ts-prune-ignore-next TODO: remove this after tests are converted to TS
export function parseFromEnUsFormat(datetime: string) {
  const splits = datetime.split(/[^\w]+/);

  if (splits.length !== 7) {
    throw new RangeError(`expected 7 parts in "${datetime}`);
  }

  const month = +splits[0];
  const day = +splits[1];
  let year = +splits[2];
  const era = splits[3];
  if (era[0] === 'b' || era[0] === 'B') {
    year = -year + 1;
  } else if (era[0] !== 'a' && era[0] !== 'A') {
    throw new RangeError(`Unknown era ${era} in "${datetime}`);
  }
  const hour = splits[4] === '24' ? 0 : +splits[4]; // bugs.chromium.org/p/chromium/issues/detail?id=1045791
  const minute = +splits[5];
  const second = +splits[6];

  if (
    !Number.isFinite(year) ||
    !Number.isFinite(month) ||
    !Number.isFinite(day) ||
    !Number.isFinite(hour) ||
    !Number.isFinite(minute) ||
    !Number.isFinite(second)
  ) {
    throw new RangeError(`Invalid number in "${datetime}`);
  }

  return { year, month, day, hour, minute, second };
}

// ts-prune-ignore-next TODO: remove this after tests are converted to TS
export function GetFormatterParts(timeZone: string, epochMilliseconds: number) {
  const formatter = getIntlDateTimeFormatEnUsForTimeZone(timeZone);
  // Using `format` instead of `formatToParts` for compatibility with older
  // clients and because it is twice as fast
  const datetime = formatter.format(epochMilliseconds);
  return parseFromEnUsFormat(datetime);
}

// The goal of this function is to find the exact time(s) that correspond to a
// calendar date and clock time in a particular time zone. Normally there will
// be only one match. But for repeated clock times after backwards transitions
// (like when DST ends) there may be two matches. And for skipped clock times
// after forward transitions, there will be no matches.
function GetNamedTimeZoneEpochNanoseconds(id: string, isoDateTime: ISODateTime) {
  // Get the offset of one day before and after the requested calendar date and
  // clock time, avoiding overflows if near the edge of the Instant range.
  let ns = GetUTCEpochNanoseconds(isoDateTime);
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
  const candidates = found.map((offsetNanoseconds) => {
    const epochNanoseconds = JSBI.subtract(ns, JSBI.BigInt(offsetNanoseconds));
    const parts = GetNamedTimeZoneDateTimeParts(id, epochNanoseconds);
    if (CompareISODateTime(isoDateTime, parts) !== 0) return undefined;
    ValidateEpochNanoseconds(epochNanoseconds);
    return epochNanoseconds;
  });
  return candidates.filter((x) => x !== undefined) as JSBI[];
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

export function DurationSign(duration: Temporal.Duration) {
  const fields = [
    GetSlot(duration, YEARS),
    GetSlot(duration, MONTHS),
    GetSlot(duration, WEEKS),
    GetSlot(duration, DAYS),
    GetSlot(duration, HOURS),
    GetSlot(duration, MINUTES),
    GetSlot(duration, SECONDS),
    GetSlot(duration, MILLISECONDS),
    GetSlot(duration, MICROSECONDS),
    GetSlot(duration, NANOSECONDS)
  ];
  for (let index = 0; index < fields.length; index++) {
    const prop = fields[index];
    if (prop !== 0) return prop < 0 ? -1 : 1;
  }
  return 0;
}

function DateDurationSign(dateDuration: DateDuration) {
  const fieldNames = ['years', 'months', 'weeks', 'days'] as const;
  for (let index = 0; index < fieldNames.length; index++) {
    const prop = dateDuration[fieldNames[index]];
    if (prop !== 0) return prop < 0 ? -1 : 1;
  }
  return 0;
}

function InternalDurationSign(duration: InternalDuration) {
  const dateSign = DateDurationSign(duration.date);
  if (dateSign !== 0) return dateSign;
  return duration.time.sign();
}

export function BalanceISOYearMonth(yearParam: number, monthParam: number) {
  let year = yearParam;
  let month = monthParam;
  if (!Number.isFinite(year) || !Number.isFinite(month)) throw new RangeError('infinity is out of range');
  month -= 1;
  year += Math.floor(month / 12);
  month %= 12;
  if (month < 0) month += 12;
  month += 1;
  return { year, month };
}

export function BalanceISODate(yearParam: number, monthParam: number, dayParam: number) {
  let year = yearParam;
  let month = monthParam;
  let day = dayParam;
  if (!Number.isFinite(day)) throw new RangeError('infinity is out of range');
  ({ year, month } = BalanceISOYearMonth(year, month));

  // The pattern of leap years in the ISO 8601 calendar repeats every 400
  // years. So if we have more than 400 years in days, there's no need to
  // convert days to a year 400 times. We can convert a multiple of 400 all at
  // once.
  const daysIn400YearCycle = 400 * 365 + 97;
  if (Math.abs(day) > daysIn400YearCycle) {
    const nCycles = Math.trunc(day / daysIn400YearCycle);
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
  let hour = hourParam;
  let minute = minuteParam;
  let second = secondParam;
  let millisecond = millisecondParam;
  let microsecond = microsecondParam;
  let nanosecond = nanosecondParam;
  let div;

  ({ div, mod: nanosecond } = TruncatingDivModByPowerOf10(nanosecond, 3));
  microsecond += div;
  if (nanosecond < 0) {
    microsecond -= 1;
    nanosecond += 1000;
  }

  ({ div, mod: microsecond } = TruncatingDivModByPowerOf10(microsecond, 3));
  millisecond += div;
  if (microsecond < 0) {
    millisecond -= 1;
    microsecond += 1000;
  }

  second += Math.trunc(millisecond / 1000);
  millisecond %= 1000;
  if (millisecond < 0) {
    second -= 1;
    millisecond += 1000;
  }

  minute += Math.trunc(second / 60);
  second %= 60;
  if (second < 0) {
    minute -= 1;
    second += 60;
  }

  hour += Math.trunc(minute / 60);
  minute %= 60;
  if (minute < 0) {
    hour -= 1;
    minute += 60;
  }

  let deltaDays = Math.trunc(hour / 24);
  hour %= 24;
  if (hour < 0) {
    deltaDays -= 1;
    hour += 24;
  }

  // Results are possibly -0 at this point, but these are mathematical values in
  // the spec. Force -0 to +0.
  deltaDays += 0;
  hour += 0;
  minute += 0;
  second += 0;
  millisecond += 0;
  microsecond += 0;
  nanosecond += 0;

  return { deltaDays, hour, minute, second, millisecond, microsecond, nanosecond };
}

export function DateDurationDays(dateDuration: DateDuration, plainRelativeTo: Temporal.PlainDate) {
  const yearsMonthsWeeksDuration = AdjustDateDurationRecord(dateDuration, 0);
  if (DateDurationSign(yearsMonthsWeeksDuration) === 0) return dateDuration.days;

  // balance years, months, and weeks down to days
  const isoDate = GetSlot(plainRelativeTo, ISO_DATE);
  const later = CalendarDateAdd(GetSlot(plainRelativeTo, CALENDAR), isoDate, yearsMonthsWeeksDuration, 'constrain');
  const epochDaysEarlier = ISODateToEpochDays(isoDate.year, isoDate.month - 1, isoDate.day);
  const epochDaysLater = ISODateToEpochDays(later.year, later.month - 1, later.day);
  const yearsMonthsWeeksInDays = epochDaysLater - epochDaysEarlier;
  return dateDuration.days + yearsMonthsWeeksInDays;
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
  return Math.min(max, Math.max(min, value as number));
}
export function ConstrainISODate(year: number, monthParam: number, dayParam?: number) {
  const month = ConstrainToRange(monthParam, 1, 12);
  const day = ConstrainToRange(dayParam, 1, ISODaysInMonth(year, month));
  return { year, month, day };
}

export function RejectToRange(value: number, min: number, max: number) {
  if (value < min || value > max) throw new RangeError(`value out of range: ${min} <= ${value} <= ${max}`);
}

export function RejectISODate(year: number, month: number, day: number) {
  RejectToRange(month, 1, 12);
  RejectToRange(day, 1, ISODaysInMonth(year, month));
}

function RejectDateRange(isoDate: ISODate) {
  // Noon avoids trouble at edges of DateTime range (excludes midnight)
  RejectDateTimeRange(CombineISODateAndTimeRecord(isoDate, NoonTimeRecord()));
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

export function RejectDateTime(
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

export function RejectDateTimeRange(isoDateTime: ISODateTime) {
  const ns = GetUTCEpochNanoseconds(isoDateTime);
  if (JSBI.lessThan(ns, DATETIME_NS_MIN) || JSBI.greaterThan(ns, DATETIME_NS_MAX)) {
    // Because PlainDateTime's range is wider than Instant's range, the line
    // below will always throw. Calling `ValidateEpochNanoseconds` avoids
    // repeating the same error message twice.
    ValidateEpochNanoseconds(ns);
  }
}

// Same as above, but throws a different, non-user-facing error
function AssertISODateTimeWithinLimits(isoDateTime: ISODateTime) {
  const ns = GetUTCEpochNanoseconds(isoDateTime);
  assert(
    JSBI.greaterThanOrEqual(ns, DATETIME_NS_MIN) && JSBI.lessThanOrEqual(ns, DATETIME_NS_MAX),
    `${ISODateTimeToString(isoDateTime, 'iso8601', 'auto')} is outside the representable range`
  );
}

// In the spec, IsValidEpochNanoseconds returns a boolean and call sites are
// responsible for throwing. In the polyfill, ValidateEpochNanoseconds takes its
// place so that we can DRY the throwing code.
function ValidateEpochNanoseconds(epochNanoseconds: JSBI) {
  if (JSBI.lessThan(epochNanoseconds, NS_MIN) || JSBI.greaterThan(epochNanoseconds, NS_MAX)) {
    throw new RangeError('date/time value is outside of supported range');
  }
}

function RejectYearMonthRange({ year, month }: Omit<ISODate, 'day'>) {
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
  let sign: -1 | 0 | 1 = 0;
  const fields = [y, mon, w, d, h, min, s, ms, µs, ns];
  for (let index = 0; index < fields.length; index++) {
    const prop = fields[index];
    if (prop === Infinity || prop === -Infinity) throw new RangeError('infinite values not allowed as duration fields');
    if (prop !== 0) {
      const propSign = prop < 0 ? -1 : 1;
      if (sign !== 0 && propSign !== sign) throw new RangeError('mixed-sign values not allowed as duration fields');
      sign = propSign;
    }
  }
  if (Math.abs(y) >= 2 ** 32 || Math.abs(mon) >= 2 ** 32 || Math.abs(w) >= 2 ** 32) {
    throw new RangeError('years, months, and weeks must be < 2³²');
  }
  const msResult = TruncatingDivModByPowerOf10(ms, 3);
  const µsResult = TruncatingDivModByPowerOf10(µs, 6);
  const nsResult = TruncatingDivModByPowerOf10(ns, 9);
  const remainderSec = TruncatingDivModByPowerOf10(msResult.mod * 1e6 + µsResult.mod * 1e3 + nsResult.mod, 9).div;
  const totalSec = d * 86400 + h * 3600 + min * 60 + s + msResult.div + µsResult.div + nsResult.div + remainderSec;
  if (!Number.isSafeInteger(totalSec)) {
    throw new RangeError('total of duration time units cannot exceed 9007199254740991.999999999 s');
  }
}

export function ToInternalDurationRecord(duration: Temporal.Duration) {
  const date = {
    years: GetSlot(duration, YEARS),
    months: GetSlot(duration, MONTHS),
    weeks: GetSlot(duration, WEEKS),
    days: GetSlot(duration, DAYS)
  };
  const time = TimeDuration.fromComponents(
    GetSlot(duration, HOURS),
    GetSlot(duration, MINUTES),
    GetSlot(duration, SECONDS),
    GetSlot(duration, MILLISECONDS),
    GetSlot(duration, MICROSECONDS),
    GetSlot(duration, NANOSECONDS)
  );
  return { date, time };
}

export function ToInternalDurationRecordWith24HourDays(duration: Temporal.Duration) {
  const time = TimeDuration.fromComponents(
    GetSlot(duration, HOURS),
    GetSlot(duration, MINUTES),
    GetSlot(duration, SECONDS),
    GetSlot(duration, MILLISECONDS),
    GetSlot(duration, MICROSECONDS),
    GetSlot(duration, NANOSECONDS)
  ).add24HourDays(GetSlot(duration, DAYS));
  const date = {
    years: GetSlot(duration, YEARS),
    months: GetSlot(duration, MONTHS),
    weeks: GetSlot(duration, WEEKS),
    days: 0
  };
  return { date, time };
}

function ToDateDurationRecordWithoutTime(duration: Temporal.Duration) {
  const internalDuration = ToInternalDurationRecordWith24HourDays(duration);
  const days = Math.trunc(internalDuration.time.sec / 86400);
  RejectDuration(
    internalDuration.date.years,
    internalDuration.date.months,
    internalDuration.date.weeks,
    days,
    0,
    0,
    0,
    0,
    0,
    0
  );
  return { ...internalDuration.date, days };
}

export function TemporalDurationFromInternal(internalDuration: InternalDuration, largestUnit: Temporal.DateTimeUnit) {
  const sign = internalDuration.time.sign();
  let nanoseconds = internalDuration.time.abs().subsec;
  let microseconds = 0;
  let milliseconds = 0;
  let seconds = internalDuration.time.abs().sec;
  let minutes = 0;
  let hours = 0;
  let days = 0;

  switch (largestUnit) {
    case 'year':
    case 'month':
    case 'week':
    case 'day':
      microseconds = Math.trunc(nanoseconds / 1000);
      nanoseconds %= 1000;
      milliseconds = Math.trunc(microseconds / 1000);
      microseconds %= 1000;
      seconds += Math.trunc(milliseconds / 1000);
      milliseconds %= 1000;
      minutes = Math.trunc(seconds / 60);
      seconds %= 60;
      hours = Math.trunc(minutes / 60);
      minutes %= 60;
      days = Math.trunc(hours / 24);
      hours %= 24;
      break;
    case 'hour':
      microseconds = Math.trunc(nanoseconds / 1000);
      nanoseconds %= 1000;
      milliseconds = Math.trunc(microseconds / 1000);
      microseconds %= 1000;
      seconds += Math.trunc(milliseconds / 1000);
      milliseconds %= 1000;
      minutes = Math.trunc(seconds / 60);
      seconds %= 60;
      hours = Math.trunc(minutes / 60);
      minutes %= 60;
      break;
    case 'minute':
      microseconds = Math.trunc(nanoseconds / 1000);
      nanoseconds %= 1000;
      milliseconds = Math.trunc(microseconds / 1000);
      microseconds %= 1000;
      seconds += Math.trunc(milliseconds / 1000);
      milliseconds %= 1000;
      minutes = Math.trunc(seconds / 60);
      seconds %= 60;
      break;
    case 'second':
      microseconds = Math.trunc(nanoseconds / 1000);
      nanoseconds %= 1000;
      milliseconds = Math.trunc(microseconds / 1000);
      microseconds %= 1000;
      seconds += Math.trunc(milliseconds / 1000);
      milliseconds %= 1000;
      break;
    case 'millisecond':
      microseconds = Math.trunc(nanoseconds / 1000);
      nanoseconds %= 1000;
      milliseconds = FMAPowerOf10(seconds, 3, Math.trunc(microseconds / 1000));
      microseconds %= 1000;
      seconds = 0;
      break;
    case 'microsecond':
      microseconds = FMAPowerOf10(seconds, 6, Math.trunc(nanoseconds / 1000));
      nanoseconds %= 1000;
      seconds = 0;
      break;
    case 'nanosecond':
      nanoseconds = FMAPowerOf10(seconds, 9, nanoseconds);
      seconds = 0;
      break;
    default:
      /* c8 ignore next */ assertNotReached();
  }

  const TemporalDuration = GetIntrinsic('%Temporal.Duration%');
  return new TemporalDuration(
    internalDuration.date.years,
    internalDuration.date.months,
    internalDuration.date.weeks,
    internalDuration.date.days + sign * days,
    sign * hours,
    sign * minutes,
    sign * seconds,
    sign * milliseconds,
    sign * microseconds,
    sign * nanoseconds
  );
}

export function CombineDateAndTimeDuration(dateDuration: DateDuration, timeDuration: TimeDuration) {
  const dateSign = DateDurationSign(dateDuration);
  const timeSign = timeDuration.sign();
  assert(
    dateSign === 0 || timeSign === 0 || dateSign === timeSign,
    'should not be able to create mixed sign duration fields here'
  );
  return { date: dateDuration, time: timeDuration };
}

// Caution: month is 0-based
export function ISODateToEpochDays(year: number, month: number, day: number) {
  return (
    GetUTCEpochMilliseconds({
      isoDate: { year, month: month + 1, day },
      time: { hour: 0, minute: 0, second: 0, millisecond: 0 }
    }) / DAY_MS
  );
}

// This is needed before calling GetUTCEpochNanoseconds, because it uses MakeDay
// which is ill-defined in how it handles large year numbers. If the issue
// https://github.com/tc39/ecma262/issues/1087 is fixed, this can be removed
// with no observable changes.
function CheckISODaysRange({ year, month, day }: ISODate) {
  if (Math.abs(ISODateToEpochDays(year, month - 1, day)) > 1e8) {
    throw new RangeError('date/time value is outside the supported range');
  }
}

function DifferenceTime(time1: TimeRecord, time2: TimeRecord) {
  const hours = time2.hour - time1.hour;
  const minutes = time2.minute - time1.minute;
  const seconds = time2.second - time1.second;
  const milliseconds = time2.millisecond - time1.millisecond;
  const microseconds = time2.microsecond - time1.microsecond;
  const nanoseconds = time2.nanosecond - time1.nanosecond;
  const timeDuration = TimeDuration.fromComponents(hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
  assert(timeDuration.abs().sec < 86400, '_bt_.[[Days]] should be 0');
  return timeDuration;
}

function DifferenceInstant(
  ns1: JSBI,
  ns2: JSBI,
  increment: number,
  smallestUnit: Temporal.TimeUnit,
  roundingMode: Temporal.RoundingMode
) {
  let timeDuration = TimeDuration.fromEpochNsDiff(ns2, ns1);
  timeDuration = RoundTimeDuration(timeDuration, increment, smallestUnit, roundingMode);
  return CombineDateAndTimeDuration(ZeroDateDuration(), timeDuration);
}

function DifferenceISODateTime(
  isoDateTime1: ISODateTime,
  isoDateTime2: ISODateTime,
  calendar: BuiltinCalendarId,
  largestUnit: Temporal.DateTimeUnit
) {
  AssertISODateTimeWithinLimits(isoDateTime1);
  AssertISODateTimeWithinLimits(isoDateTime2);
  let timeDuration = DifferenceTime(isoDateTime1.time, isoDateTime2.time);

  const timeSign = timeDuration.sign();
  const dateSign = CompareISODate(isoDateTime1.isoDate, isoDateTime2.isoDate);

  // back-off a day from date2 so that the signs of the date and time diff match
  let adjustedDate = isoDateTime2.isoDate;
  if (dateSign === timeSign) {
    adjustedDate = BalanceISODate(adjustedDate.year, adjustedDate.month, adjustedDate.day + timeSign);
    timeDuration = timeDuration.add24HourDays(-timeSign);
  }

  const dateLargestUnit = LargerOfTwoTemporalUnits('day', largestUnit) as Temporal.DateUnit;
  const dateDifference = CalendarDateUntil(calendar, isoDateTime1.isoDate, adjustedDate, dateLargestUnit);
  if (largestUnit !== dateLargestUnit) {
    // largestUnit < days, so add the days in to the internal duration
    timeDuration = timeDuration.add24HourDays(dateDifference.days);
    dateDifference.days = 0;
  }
  return CombineDateAndTimeDuration(dateDifference, timeDuration);
}

function DifferenceZonedDateTime(
  ns1: JSBI,
  ns2: JSBI,
  timeZone: string,
  calendar: BuiltinCalendarId,
  largestUnit: Temporal.DateTimeUnit
) {
  const nsDiff = JSBI.subtract(ns2, ns1);
  if (JSBI.equal(nsDiff, ZERO)) return { date: ZeroDateDuration(), time: TimeDuration.ZERO };
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

  // The max number of allowed day corrections depends on the direction of travel.
  // Both directions allow for 1 day correction due to an ISO wall-clock overshoot (see below).
  // Only the forward direction allows for an additional 1 day correction caused by a push-forward
  // 'compatible' DST transition causing the wall-clock to overshoot again.
  // This max value is inclusive.
  let maxDayCorrection = sign === 1 ? 2 : 1;

  // Detect ISO wall-clock overshoot.
  // If the diff of the ISO wall-clock times is opposite to the overall diff's sign,
  // we are guaranteed to need at least one day correction.
  let timeDuration = DifferenceTime(isoDtStart.time, isoDtEnd.time);
  if (timeDuration.sign() === -sign) {
    dayCorrection++;
  }

  for (; dayCorrection <= maxDayCorrection; dayCorrection++) {
    const intermediateDate = BalanceISODate(
      isoDtEnd.isoDate.year,
      isoDtEnd.isoDate.month,
      isoDtEnd.isoDate.day - dayCorrection * sign
    );

    // Incorporate time parts from dtStart
    intermediateDateTime = CombineISODateAndTimeRecord(intermediateDate, isoDtStart.time);

    // Convert intermediate datetime to epoch-nanoseconds (may disambiguate)
    const intermediateNs = GetEpochNanosecondsFor(timeZone, intermediateDateTime, 'compatible');

    // Compute the nanosecond diff between the intermediate instant and the final destination
    timeDuration = TimeDuration.fromEpochNsDiff(ns2, intermediateNs);

    // Did intermediateNs NOT surpass ns2?
    // If so, exit the loop with success (without incrementing dayCorrection past maxDayCorrection)
    if (timeDuration.sign() !== -sign) {
      break;
    }
  }

  assert(dayCorrection <= maxDayCorrection, `more than ${maxDayCorrection} day correction needed`);

  // Output of the above loop
  assertExists(intermediateDateTime);

  // Similar to what happens in DifferenceISODateTime with date parts only:
  const dateLargestUnit = LargerOfTwoTemporalUnits('day', largestUnit) as Temporal.DateUnit;
  const dateDifference = CalendarDateUntil(calendar, isoDtStart.isoDate, intermediateDateTime.isoDate, dateLargestUnit);
  return CombineDateAndTimeDuration(dateDifference, timeDuration);
}

// Epoch-nanosecond bounding technique where the start/end of the calendar-unit
// interval are converted to epoch-nanosecond times and destEpochNs is nudged to
// either one.
function NudgeToCalendarUnit(
  sign: -1 | 1,
  durationParam: InternalDuration,
  destEpochNs: JSBI,
  isoDateTime: ISODateTime,
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
      const years = RoundNumberToIncrement(duration.date.years, increment, 'trunc');
      r1 = years;
      r2 = years + increment * sign;
      startDuration = { years: r1, months: 0, weeks: 0, days: 0 };
      endDuration = { ...startDuration, years: r2 };
      break;
    }
    case 'month': {
      const months = RoundNumberToIncrement(duration.date.months, increment, 'trunc');
      r1 = months;
      r2 = months + increment * sign;
      startDuration = AdjustDateDurationRecord(duration.date, 0, 0, r1);
      endDuration = AdjustDateDurationRecord(duration.date, 0, 0, r2);
      break;
    }
    case 'week': {
      const yearsMonths = AdjustDateDurationRecord(duration.date, 0, 0);
      const weeksStart = CalendarDateAdd(calendar, isoDateTime.isoDate, yearsMonths, 'constrain');
      const weeksEnd = BalanceISODate(weeksStart.year, weeksStart.month, weeksStart.day + duration.date.days);
      const untilResult = CalendarDateUntil(calendar, weeksStart, weeksEnd, 'week');
      const weeks = RoundNumberToIncrement(duration.date.weeks + untilResult.weeks, increment, 'trunc');
      r1 = weeks;
      r2 = weeks + increment * sign;
      startDuration = AdjustDateDurationRecord(duration.date, 0, r1);
      endDuration = AdjustDateDurationRecord(duration.date, 0, r2);
      break;
    }
    case 'day': {
      const days = RoundNumberToIncrement(duration.date.days, increment, 'trunc');
      r1 = days;
      r2 = days + increment * sign;
      startDuration = AdjustDateDurationRecord(duration.date, r1);
      endDuration = AdjustDateDurationRecord(duration.date, r2);
      break;
    }
    default:
      /* c8 ignore next */ assertNotReached();
  }

  if (sign === 1) assert(r1 >= 0 && r1 < r2, `positive ordering of r1, r2: 0 ≤ ${r1} < ${r2}`);
  if (sign === -1) assert(r1 <= 0 && r1 > r2, `negative ordering of r1, r2: 0 ≥ ${r1} > ${r2}`);

  // Apply to origin, output PlainDateTimes
  const start = CalendarDateAdd(calendar, isoDateTime.isoDate, startDuration, 'constrain');
  const end = CalendarDateAdd(calendar, isoDateTime.isoDate, endDuration, 'constrain');

  // Convert to epoch-nanoseconds
  let startEpochNs, endEpochNs;
  const startDateTime = CombineISODateAndTimeRecord(start, isoDateTime.time);
  const endDateTime = CombineISODateAndTimeRecord(end, isoDateTime.time);
  if (timeZone) {
    startEpochNs = GetEpochNanosecondsFor(timeZone, startDateTime, 'compatible');
    endEpochNs = GetEpochNanosecondsFor(timeZone, endDateTime, 'compatible');
  } else {
    startEpochNs = GetUTCEpochNanoseconds(startDateTime);
    endEpochNs = GetUTCEpochNanoseconds(endDateTime);
  }

  // Round the smallestUnit within the epoch-nanosecond span
  if (sign === 1) {
    assert(
      JSBI.lessThanOrEqual(startEpochNs, destEpochNs) && JSBI.lessThanOrEqual(destEpochNs, endEpochNs),
      `${unit} was 0 days long`
    );
  }
  if (sign === -1) {
    assert(
      JSBI.lessThanOrEqual(endEpochNs, destEpochNs) && JSBI.lessThanOrEqual(destEpochNs, startEpochNs),
      `${unit} was 0 days long`
    );
  }
  assert(!JSBI.equal(endEpochNs, startEpochNs), 'startEpochNs must ≠ endEpochNs');
  const numerator = TimeDuration.fromEpochNsDiff(destEpochNs, startEpochNs);
  const denominator = TimeDuration.fromEpochNsDiff(endEpochNs, startEpochNs);
  const unsignedRoundingMode = GetUnsignedRoundingMode(roundingMode, sign < 0 ? 'negative' : 'positive');
  const cmp = numerator.add(numerator).abs().subtract(denominator.abs()).sign();
  const even = (Math.abs(r1) / increment) % 2 === 0;
  // prettier-ignore
  const roundedUnit = numerator.isZero()
    ? Math.abs(r1)
    : !numerator.cmp(denominator) // equal?
      ? Math.abs(r2)
      : ApplyUnsignedRoundingMode(Math.abs(r1), Math.abs(r2), cmp, even, unsignedRoundingMode);

  // Trick to minimize rounding error, due to the lack of fma() in JS
  const fakeNumerator = new TimeDuration(
    JSBI.add(
      JSBI.multiply(denominator.totalNs, JSBI.BigInt(r1)),
      JSBI.multiply(numerator.totalNs, JSBI.BigInt(increment * sign))
    )
  );
  const total = fakeNumerator.fdiv(denominator.totalNs);
  assert(Math.abs(r1) <= Math.abs(total) && Math.abs(total) <= Math.abs(r2), 'r1 ≤ total ≤ r2');

  // Determine whether expanded or contracted
  const didExpandCalendarUnit = roundedUnit === Math.abs(r2);
  duration = { date: didExpandCalendarUnit ? endDuration : startDuration, time: TimeDuration.ZERO };

  const nudgeResult = {
    duration,
    nudgedEpochNs: didExpandCalendarUnit ? endEpochNs : startEpochNs,
    didExpandCalendarUnit
  };
  return { nudgeResult, total };
}

// Attempts rounding of time units within a time zone's day, but if the rounding
// causes time to exceed the total time within the day, rerun rounding in next
// day.
function NudgeToZonedTime(
  sign: -1 | 1,
  durationParam: InternalDuration,
  isoDateTime: ISODateTime,
  timeZone: string,
  calendar: BuiltinCalendarId,
  increment: number,
  unit: Temporal.TimeUnit,
  roundingMode: Temporal.RoundingMode
) {
  // unit must be hour or smaller
  let duration = durationParam;

  // Apply to origin, output start/end of the day as PlainDateTimes
  const start = CalendarDateAdd(calendar, isoDateTime.isoDate, duration.date, 'constrain');
  const startDateTime = CombineISODateAndTimeRecord(start, isoDateTime.time);
  const endDate = BalanceISODate(start.year, start.month, start.day + sign);
  const endDateTime = CombineISODateAndTimeRecord(endDate, isoDateTime.time);

  // Compute the epoch-nanosecond start/end of the final whole-day interval
  // If duration has negative sign, startEpochNs will be after endEpochNs
  const startEpochNs = GetEpochNanosecondsFor(timeZone, startDateTime, 'compatible');
  const endEpochNs = GetEpochNanosecondsFor(timeZone, endDateTime, 'compatible');

  // The signed amount of time from the start of the whole-day interval to the end
  const daySpan = TimeDuration.fromEpochNsDiff(endEpochNs, startEpochNs);
  if (daySpan.sign() !== sign) throw new RangeError('time zone returned inconsistent Instants');

  // Compute time parts of the duration to nanoseconds and round
  // Result could be negative
  const unitIncrement = JSBI.BigInt(NS_PER_TIME_UNIT[unit] * increment);
  let roundedTimeDuration = duration.time.round(unitIncrement, roundingMode);

  // Does the rounded time exceed the time-in-day?
  const beyondDaySpan = roundedTimeDuration.subtract(daySpan);
  const didRoundBeyondDay = beyondDaySpan.sign() !== -sign;

  let dayDelta, nudgedEpochNs;
  if (didRoundBeyondDay) {
    // If rounded into next day, use the day-end as the local origin and rerun
    // the rounding
    dayDelta = sign;
    roundedTimeDuration = beyondDaySpan.round(unitIncrement, roundingMode);
    nudgedEpochNs = roundedTimeDuration.addToEpochNs(endEpochNs);
  } else {
    // Otherwise, if time not rounded beyond day, use the day-start as the local
    // origin
    dayDelta = 0;
    nudgedEpochNs = roundedTimeDuration.addToEpochNs(startEpochNs);
  }

  const dateDuration = AdjustDateDurationRecord(duration.date, duration.date.days + dayDelta);
  const resultDuration = CombineDateAndTimeDuration(dateDuration, roundedTimeDuration);
  return {
    duration: resultDuration,
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

  const timeDuration = duration.time.add24HourDays(duration.date.days);
  // Convert to nanoseconds and round
  const roundedTime = timeDuration.round(JSBI.BigInt(increment * NS_PER_TIME_UNIT[smallestUnit]), roundingMode);
  const diffTime = roundedTime.subtract(timeDuration);

  // Determine if whole days expanded
  const { quotient: wholeDays } = timeDuration.divmod(DAY_NANOS);
  const { quotient: roundedWholeDays } = roundedTime.divmod(DAY_NANOS);
  const didExpandDays = Math.sign(roundedWholeDays - wholeDays) === timeDuration.sign();

  const nudgedEpochNs = diffTime.addToEpochNs(destEpochNs);

  let days = 0;
  let remainder = roundedTime;
  if (TemporalUnitCategory(largestUnit) === 'date') {
    days = roundedWholeDays;
    remainder = roundedTime.add(TimeDuration.fromComponents(-roundedWholeDays * 24, 0, 0, 0, 0, 0));
  }

  const dateDuration = AdjustDateDurationRecord(duration.date, days);
  return {
    duration: { date: dateDuration, time: remainder },
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
  isoDateTime: ISODateTime,
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
        const years = duration.date.years + sign;
        endDuration = { years, months: 0, weeks: 0, days: 0 };
        break;
      }
      case 'month': {
        const months = duration.date.months + sign;
        endDuration = AdjustDateDurationRecord(duration.date, 0, 0, months);
        break;
      }
      case 'week': {
        const weeks = duration.date.weeks + sign;
        endDuration = AdjustDateDurationRecord(duration.date, 0, weeks);
        break;
      }
      default:
        /* c8 ignore next */ assertNotReached();
    }

    // Compute end-of-unit in epoch-nanoseconds
    const end = CalendarDateAdd(calendar, isoDateTime.isoDate, endDuration, 'constrain');
    const endDateTime = CombineISODateAndTimeRecord(end, isoDateTime.time);
    let endEpochNs;
    if (timeZone) {
      endEpochNs = GetEpochNanosecondsFor(timeZone, endDateTime, 'compatible');
    } else {
      endEpochNs = GetUTCEpochNanoseconds(endDateTime);
    }

    const didExpandToEnd = compare(nudgedEpochNs, endEpochNs) !== -sign;

    // Is nudgedEpochNs at the end-of-unit? This means it should bubble-up to
    // the next highest unit (and possibly further...)
    if (didExpandToEnd) {
      duration = { date: endDuration, time: TimeDuration.ZERO };
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
  isoDateTime: ISODateTime,
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
  const sign = InternalDurationSign(duration) < 0 ? -1 : 1;

  let nudgeResult;
  if (irregularLengthUnit) {
    // Rounding an irregular-length unit? Use epoch-nanosecond-bounding technique
    ({ nudgeResult } = NudgeToCalendarUnit(
      sign,
      duration,
      destEpochNs,
      isoDateTime,
      timeZone,
      calendar,
      increment,
      smallestUnit,
      roundingMode
    ));
  } else if (timeZone) {
    // Special-case for rounding time units within a zoned day
    uncheckedAssertNarrowedType<Temporal.TimeUnit>(
      smallestUnit,
      'other values handled in irregularLengthUnit clause above'
    );
    nudgeResult = NudgeToZonedTime(
      sign,
      duration,
      isoDateTime,
      timeZone,
      calendar,
      increment,
      smallestUnit,
      roundingMode
    );
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
      isoDateTime,
      timeZone,
      calendar,
      largestUnitParam, // where to STOP bubbling
      LargerOfTwoTemporalUnits(smallestUnit, 'day') as Temporal.DateUnit // where to START bubbling-up from
    );
  }

  return duration;
}

function TotalRelativeDuration(
  duration: InternalDuration,
  destEpochNs: JSBI,
  isoDateTime: ISODateTime,
  timeZone: string | null,
  calendar: BuiltinCalendarId,
  unit: Temporal.DateTimeUnit
) {
  // The duration must already be balanced. This should be achieved by calling
  // one of the non-rounding since/until internal methods prior. It's okay to
  // have a bottom-heavy weeks because weeks don't bubble-up into months. It's
  // okay to have >24 hour day assuming the final day of relativeTo+duration has
  // >24 hours in its timezone. (should automatically end up like this if using
  // non-rounding since/until internal methods prior)
  if (IsCalendarUnit(unit) || (timeZone && unit === 'day')) {
    // Rounding an irregular-length unit? Use epoch-nanosecond-bounding technique
    const sign = InternalDurationSign(duration) < 0 ? -1 : 1;
    return NudgeToCalendarUnit(sign, duration, destEpochNs, isoDateTime, timeZone, calendar, 1, unit, 'trunc').total;
  }
  // Rounding uniform-length days/hours/minutes/etc units. Simple nanosecond
  // math. years/months/weeks unchanged
  const timeDuration = duration.time.add24HourDays(duration.date.days);
  return TotalTimeDuration(timeDuration, unit);
}

export function DifferencePlainDateTimeWithRounding(
  isoDateTime1: ISODateTime,
  isoDateTime2: ISODateTime,
  calendar: BuiltinCalendarId,
  largestUnit: Temporal.DateTimeUnit,
  roundingIncrement: number,
  smallestUnit: Temporal.DateTimeUnit,
  roundingMode: Temporal.RoundingMode
) {
  if (CompareISODateTime(isoDateTime1, isoDateTime2) == 0) {
    return { date: ZeroDateDuration(), time: TimeDuration.ZERO };
  }

  RejectDateTimeRange(isoDateTime1);
  RejectDateTimeRange(isoDateTime2);
  const duration = DifferenceISODateTime(isoDateTime1, isoDateTime2, calendar, largestUnit);

  if (smallestUnit === 'nanosecond' && roundingIncrement === 1) return duration;

  const destEpochNs = GetUTCEpochNanoseconds(isoDateTime2);
  return RoundRelativeDuration(
    duration,
    destEpochNs,
    isoDateTime1,
    null,
    calendar,
    largestUnit,
    roundingIncrement,
    smallestUnit,
    roundingMode
  );
}

export function DifferencePlainDateTimeWithTotal(
  isoDateTime1: ISODateTime,
  isoDateTime2: ISODateTime,
  calendar: BuiltinCalendarId,
  unit: Temporal.DateTimeUnit
) {
  if (CompareISODateTime(isoDateTime1, isoDateTime2) == 0) return 0;

  RejectDateTimeRange(isoDateTime1);
  RejectDateTimeRange(isoDateTime2);
  const duration = DifferenceISODateTime(isoDateTime1, isoDateTime2, calendar, unit);

  if (unit === 'nanosecond') return JSBI.toNumber(duration.time.totalNs);

  const destEpochNs = GetUTCEpochNanoseconds(isoDateTime2);
  return TotalRelativeDuration(duration, destEpochNs, isoDateTime1, null, calendar, unit);
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
  if (TemporalUnitCategory(largestUnit) === 'time') {
    // The user is only asking for a time difference, so return difference of instants.
    return DifferenceInstant(ns1, ns2, roundingIncrement, smallestUnit as Temporal.TimeUnit, roundingMode);
  }

  const duration = DifferenceZonedDateTime(ns1, ns2, timeZone, calendar, largestUnit);

  if (smallestUnit === 'nanosecond' && roundingIncrement === 1) return duration;

  const dateTime = GetISODateTimeFor(timeZone, ns1);
  return RoundRelativeDuration(
    duration,
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

export function DifferenceZonedDateTimeWithTotal(
  ns1: JSBI,
  ns2: JSBI,
  timeZone: string,
  calendar: BuiltinCalendarId,
  unit: Temporal.DateTimeUnit
) {
  if (TemporalUnitCategory(unit) === 'time') {
    // The user is only asking for a time difference, so return difference of instants.
    return TotalTimeDuration(TimeDuration.fromEpochNsDiff(ns2, ns1), unit as Temporal.TimeUnit);
  }

  const duration = DifferenceZonedDateTime(ns1, ns2, timeZone, calendar, unit);
  const dateTime = GetISODateTimeFor(timeZone, ns1);
  return TotalRelativeDuration(duration, ns2, dateTime, timeZone, calendar, unit);
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
  options: InstantParams['until'][1]
) {
  const other = ToTemporalInstant(otherParam);

  const resolvedOptions = GetOptionsObject(options);
  const settings = GetDifferenceSettings(operation, resolvedOptions, 'time', [], 'nanosecond', 'second');

  const onens = GetSlot(instant, EPOCHNANOSECONDS);
  const twons = GetSlot(other, EPOCHNANOSECONDS);
  const duration = DifferenceInstant(
    onens,
    twons,
    settings.roundingIncrement,
    settings.smallestUnit,
    settings.roundingMode
  );
  let result = TemporalDurationFromInternal(duration, settings.largestUnit);
  if (operation === 'since') result = CreateNegatedTemporalDuration(result);
  return result;
}

export function DifferenceTemporalPlainDate(
  operation: DifferenceOperation,
  plainDate: Temporal.PlainDate,
  otherParam: PlainDateParams['until'][0],
  options: PlainDateParams['until'][1]
) {
  const other = ToTemporalDate(otherParam);
  const calendar = GetSlot(plainDate, CALENDAR);
  const otherCalendar = GetSlot(other, CALENDAR);
  if (!CalendarEquals(calendar, otherCalendar)) {
    throw new RangeError(`cannot compute difference between dates of ${calendar} and ${otherCalendar} calendars`);
  }

  const resolvedOptions = GetOptionsObject(options);
  const settings = GetDifferenceSettings(operation, resolvedOptions, 'date', [], 'day', 'day');

  const Duration = GetIntrinsic('%Temporal.Duration%');
  const isoDate = GetSlot(plainDate, ISO_DATE);
  const isoOther = GetSlot(other, ISO_DATE);
  if (CompareISODate(isoDate, isoOther) === 0) return new Duration();

  const dateDifference = CalendarDateUntil(calendar, isoDate, isoOther, settings.largestUnit);

  let duration = { date: dateDifference, time: TimeDuration.ZERO };
  const roundingIsNoop = settings.smallestUnit === 'day' && settings.roundingIncrement === 1;
  if (!roundingIsNoop) {
    const isoDateTime = CombineISODateAndTimeRecord(isoDate, MidnightTimeRecord());
    const isoDateTimeOther = CombineISODateAndTimeRecord(isoOther, MidnightTimeRecord());
    const destEpochNs = GetUTCEpochNanoseconds(isoDateTimeOther);
    duration = RoundRelativeDuration(
      duration,
      destEpochNs,
      isoDateTime,
      null,
      calendar,
      settings.largestUnit,
      settings.roundingIncrement,
      settings.smallestUnit,
      settings.roundingMode
    );
  }

  let result = TemporalDurationFromInternal(duration, 'day');
  if (operation === 'since') result = CreateNegatedTemporalDuration(result);
  return result;
}

export function DifferenceTemporalPlainDateTime(
  operation: DifferenceOperation,
  plainDateTime: Temporal.PlainDateTime,
  otherParam: PlainDateTimeParams['until'][0],
  options: PlainDateTimeParams['until'][1]
) {
  const other = ToTemporalDateTime(otherParam);
  const calendar = GetSlot(plainDateTime, CALENDAR);
  const otherCalendar = GetSlot(other, CALENDAR);
  if (!CalendarEquals(calendar, otherCalendar)) {
    throw new RangeError(`cannot compute difference between dates of ${calendar} and ${otherCalendar} calendars`);
  }

  const resolvedOptions = GetOptionsObject(options);
  const settings = GetDifferenceSettings(operation, resolvedOptions, 'datetime', [], 'nanosecond', 'day');

  const Duration = GetIntrinsic('%Temporal.Duration%');
  const isoDateTime1 = GetSlot(plainDateTime, ISO_DATE_TIME);
  const isoDateTime2 = GetSlot(other, ISO_DATE_TIME);
  if (CompareISODateTime(isoDateTime1, isoDateTime2) === 0) return new Duration();

  const duration = DifferencePlainDateTimeWithRounding(
    isoDateTime1,
    isoDateTime2,
    calendar,
    settings.largestUnit,
    settings.roundingIncrement,
    settings.smallestUnit,
    settings.roundingMode
  );

  let result = TemporalDurationFromInternal(duration, settings.largestUnit);
  if (operation === 'since') result = CreateNegatedTemporalDuration(result);
  return result;
}

export function DifferenceTemporalPlainTime(
  operation: DifferenceOperation,
  plainTime: Temporal.PlainTime,
  otherParam: PlainTimeParams['until'][0],
  options: PlainTimeParams['until'][1]
) {
  const other = ToTemporalTime(otherParam);

  const resolvedOptions = GetOptionsObject(options);
  const settings = GetDifferenceSettings(operation, resolvedOptions, 'time', [], 'nanosecond', 'hour');

  let timeDuration = DifferenceTime(GetSlot(plainTime, TIME), GetSlot(other, TIME));
  timeDuration = RoundTimeDuration(
    timeDuration,
    settings.roundingIncrement,
    settings.smallestUnit,
    settings.roundingMode
  );
  const duration = CombineDateAndTimeDuration(ZeroDateDuration(), timeDuration);

  let result = TemporalDurationFromInternal(duration, settings.largestUnit);
  if (operation === 'since') result = CreateNegatedTemporalDuration(result);
  return result;
}

export function DifferenceTemporalPlainYearMonth(
  operation: DifferenceOperation,
  yearMonth: Temporal.PlainYearMonth,
  otherParam: PlainYearMonthParams['until'][0],
  options: PlainYearMonthParams['until'][1]
) {
  const other = ToTemporalYearMonth(otherParam);
  const calendar = GetSlot(yearMonth, CALENDAR);
  const otherCalendar = GetSlot(other, CALENDAR);
  if (!CalendarEquals(calendar, otherCalendar)) {
    throw new RangeError(`cannot compute difference between months of ${calendar} and ${otherCalendar} calendars`);
  }

  const resolvedOptions = GetOptionsObject(options);
  const settings = GetDifferenceSettings(operation, resolvedOptions, 'date', ['week', 'day'], 'month', 'year');

  const Duration = GetIntrinsic('%Temporal.Duration%');
  if (CompareISODate(GetSlot(yearMonth, ISO_DATE), GetSlot(other, ISO_DATE)) == 0) {
    return new Duration();
  }

  const thisFields: CalendarFieldsRecord = ISODateToFields(calendar, GetSlot(yearMonth, ISO_DATE), 'year-month');
  thisFields.day = 1;
  const thisDate = CalendarDateFromFields(calendar, thisFields, 'constrain');
  const otherFields: CalendarFieldsRecord = ISODateToFields(calendar, GetSlot(other, ISO_DATE), 'year-month');
  otherFields.day = 1;
  const otherDate = CalendarDateFromFields(calendar, otherFields, 'constrain');

  const dateDifference = CalendarDateUntil(calendar, thisDate, otherDate, settings.largestUnit);
  let duration = { date: AdjustDateDurationRecord(dateDifference, 0, 0), time: TimeDuration.ZERO };
  if (settings.smallestUnit !== 'month' || settings.roundingIncrement !== 1) {
    const isoDateTime = CombineISODateAndTimeRecord(thisDate, MidnightTimeRecord());
    const isoDateTimeOther = CombineISODateAndTimeRecord(otherDate, MidnightTimeRecord());
    const destEpochNs = GetUTCEpochNanoseconds(isoDateTimeOther);
    duration = RoundRelativeDuration(
      duration,
      destEpochNs,
      isoDateTime,
      null,
      calendar,
      settings.largestUnit,
      settings.roundingIncrement,
      settings.smallestUnit,
      settings.roundingMode
    );
  }

  let result = TemporalDurationFromInternal(duration, 'day');
  if (operation === 'since') result = CreateNegatedTemporalDuration(result);
  return result;
}

export function DifferenceTemporalZonedDateTime(
  operation: DifferenceOperation,
  zonedDateTime: Temporal.ZonedDateTime,
  otherParam: ZonedDateTimeParams['until'][0],
  options: ZonedDateTimeParams['until'][1]
) {
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

  let result;
  if (TemporalUnitCategory(settings.largestUnit) !== 'date') {
    // The user is only asking for a time difference, so return difference of instants.
    const duration = DifferenceInstant(
      ns1,
      ns2,
      settings.roundingIncrement,
      settings.smallestUnit as Temporal.TimeUnit,
      settings.roundingMode
    );
    result = TemporalDurationFromInternal(duration, settings.largestUnit);
  } else {
    const timeZone = GetSlot(zonedDateTime, TIME_ZONE);
    if (!TimeZoneEquals(timeZone, GetSlot(other, TIME_ZONE))) {
      throw new RangeError(
        "When calculating difference between time zones, largestUnit must be 'hours' " +
          'or smaller because day lengths can vary between time zones due to DST or time zone offset changes.'
      );
    }

    if (JSBI.equal(ns1, ns2)) return new Duration();

    const duration = DifferenceZonedDateTimeWithRounding(
      ns1,
      ns2,
      timeZone,
      calendar,
      settings.largestUnit,
      settings.roundingIncrement,
      settings.smallestUnit,
      settings.roundingMode
    );
    result = TemporalDurationFromInternal(duration, 'hour');
  }

  if (operation === 'since') result = CreateNegatedTemporalDuration(result);
  return result;
}

export function AddTime(
  { hour, minute, second: secondParam, millisecond, microsecond, nanosecond: nanosecondParam }: TimeRecord,
  timeDuration: TimeDuration
) {
  let second = secondParam;
  let nanosecond = nanosecondParam;

  second += timeDuration.sec;
  nanosecond += timeDuration.subsec;
  return BalanceTime(hour, minute, second, millisecond, microsecond, nanosecond);
}

function AddInstant(epochNanoseconds: JSBI, timeDuration: TimeDuration) {
  const result = timeDuration.addToEpochNs(epochNanoseconds);
  ValidateEpochNanoseconds(result);
  return result;
}

export function AddZonedDateTime(
  epochNs: JSBI,
  timeZone: string,
  calendar: BuiltinCalendarId,
  duration: InternalDuration,
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
  if (DateDurationSign(duration.date) === 0) return AddInstant(epochNs, duration.time);

  // RFC 5545 requires the date portion to be added in calendar days and the
  // time portion to be added in exact time.
  const dt = GetISODateTimeFor(timeZone, epochNs);
  const addedDate = CalendarDateAdd(calendar, dt.isoDate, duration.date, overflow);
  const dtIntermediate = CombineISODateAndTimeRecord(addedDate, dt.time);

  // Note that 'compatible' is used below because this disambiguation behavior
  // is required by RFC 5545.
  const intermediateNs = GetEpochNanosecondsFor(timeZone, dtIntermediate, 'compatible');
  return AddInstant(intermediateNs, duration.time);
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
  if (IsCalendarUnit(largestUnit)) {
    throw new RangeError('For years, months, or weeks arithmetic, use date arithmetic relative to a starting point');
  }

  const d1 = ToInternalDurationRecordWith24HourDays(duration);
  const d2 = ToInternalDurationRecordWith24HourDays(other);
  const result = CombineDateAndTimeDuration(ZeroDateDuration(), d1.time.add(d2.time));
  return TemporalDurationFromInternal(result, largestUnit);
}

export function AddDurationToInstant(
  operation: AddSubtractOperation,
  instant: Temporal.Instant,
  durationLike: InstantParams['add'][0]
) {
  let duration = ToTemporalDuration(durationLike);
  if (operation === 'subtract') duration = CreateNegatedTemporalDuration(duration);
  const largestUnit = DefaultTemporalLargestUnit(duration);
  if (TemporalUnitCategory(largestUnit) === 'date') {
    throw new RangeError(
      `Duration field ${largestUnit} not supported by Temporal.Instant. Try Temporal.ZonedDateTime instead.`
    );
  }
  const internalDuration = ToInternalDurationRecordWith24HourDays(duration);
  const ns = AddInstant(GetSlot(instant, EPOCHNANOSECONDS), internalDuration.time);
  return CreateTemporalInstant(ns);
}

export function AddDurationToDate(
  operation: AddSubtractOperation,
  plainDate: Temporal.PlainDate,
  durationLike: PlainDateParams['add'][0],
  options: PlainDateParams['add'][1]
) {
  const calendar = GetSlot(plainDate, CALENDAR);

  let duration = ToTemporalDuration(durationLike);
  if (operation === 'subtract') duration = CreateNegatedTemporalDuration(duration);
  const dateDuration = ToDateDurationRecordWithoutTime(duration);

  const resolvedOptions = GetOptionsObject(options);
  const overflow = GetTemporalOverflowOption(resolvedOptions);

  const addedDate = CalendarDateAdd(calendar, GetSlot(plainDate, ISO_DATE), dateDuration, overflow);
  return CreateTemporalDate(addedDate, calendar);
}

export function AddDurationToDateTime(
  operation: AddSubtractOperation,
  dateTime: Temporal.PlainDateTime,
  durationLike: PlainDateTimeParams['add'][0],
  options: PlainDateTimeParams['add'][1]
) {
  let duration = ToTemporalDuration(durationLike);
  if (operation === 'subtract') duration = CreateNegatedTemporalDuration(duration);
  const resolvedOptions = GetOptionsObject(options);
  const overflow = GetTemporalOverflowOption(resolvedOptions);

  const calendar = GetSlot(dateTime, CALENDAR);

  const internalDuration = ToInternalDurationRecordWith24HourDays(duration);

  // Add the time part
  const isoDateTime = GetSlot(dateTime, ISO_DATE_TIME);
  const timeResult = AddTime(isoDateTime.time, internalDuration.time);
  const dateDuration = AdjustDateDurationRecord(internalDuration.date, timeResult.deltaDays);

  // Delegate the date part addition to the calendar
  RejectDuration(dateDuration.years, dateDuration.months, dateDuration.weeks, dateDuration.days, 0, 0, 0, 0, 0, 0);
  const addedDate = CalendarDateAdd(calendar, isoDateTime.isoDate, dateDuration, overflow);

  const result = CombineISODateAndTimeRecord(addedDate, timeResult);
  return CreateTemporalDateTime(result, calendar);
}

export function AddDurationToTime(
  operation: AddSubtractOperation,
  temporalTime: Temporal.PlainTime,
  durationLike: PlainTimeParams['add'][0]
) {
  let duration = ToTemporalDuration(durationLike);
  if (operation === 'subtract') duration = CreateNegatedTemporalDuration(duration);
  const internalDuration = ToInternalDurationRecordWith24HourDays(duration);
  const { hour, minute, second, millisecond, microsecond, nanosecond } = AddTime(
    GetSlot(temporalTime, TIME),
    internalDuration.time
  );
  const time = RegulateTime(hour, minute, second, millisecond, microsecond, nanosecond, 'reject');
  return CreateTemporalTime(time);
}

export function AddDurationToYearMonth(
  operation: AddSubtractOperation,
  yearMonth: Temporal.PlainYearMonth,
  durationLike: PlainYearMonthParams['add'][0],
  options: PlainYearMonthParams['add'][1]
) {
  let duration = ToTemporalDuration(durationLike);
  if (operation === 'subtract') duration = CreateNegatedTemporalDuration(duration);
  const resolvedOptions = GetOptionsObject(options);
  const overflow = GetTemporalOverflowOption(resolvedOptions);
  const sign = DurationSign(duration);

  const calendar = GetSlot(yearMonth, CALENDAR);
  const fields: CalendarFieldsRecord = ISODateToFields(calendar, GetSlot(yearMonth, ISO_DATE), 'year-month');
  fields.day = 1;
  let startDate = CalendarDateFromFields(calendar, fields, 'constrain');
  if (sign < 0) {
    const nextMonth = CalendarDateAdd(calendar, startDate, { months: 1 }, 'constrain');
    startDate = BalanceISODate(nextMonth.year, nextMonth.month, nextMonth.day - 1);
  }
  const durationToAdd = ToDateDurationRecordWithoutTime(duration);
  RejectDateRange(startDate);
  const addedDate = CalendarDateAdd(calendar, startDate, durationToAdd, overflow);
  const addedDateFields = ISODateToFields(calendar, addedDate, 'year-month');

  const isoDate = CalendarYearMonthFromFields(calendar, addedDateFields, overflow);
  return CreateTemporalYearMonth(isoDate, calendar);
}

export function AddDurationToZonedDateTime(
  operation: AddSubtractOperation,
  zonedDateTime: Temporal.ZonedDateTime,
  durationLike: ZonedDateTimeParams['add'][0],
  options: ZonedDateTimeParams['add'][1]
) {
  let duration = ToTemporalDuration(durationLike);
  if (operation === 'subtract') duration = CreateNegatedTemporalDuration(duration);

  const resolvedOptions = GetOptionsObject(options);
  const overflow = GetTemporalOverflowOption(resolvedOptions);
  const timeZone = GetSlot(zonedDateTime, TIME_ZONE);
  const calendar = GetSlot(zonedDateTime, CALENDAR);
  const internalDuration = ToInternalDurationRecord(duration);
  const epochNanoseconds = AddZonedDateTime(
    GetSlot(zonedDateTime, EPOCHNANOSECONDS),
    timeZone,
    calendar,
    internalDuration,
    overflow
  );
  return CreateTemporalZonedDateTime(epochNanoseconds, timeZone, calendar);
}

// ts-prune-ignore-next TODO: remove this after tests are converted to TS
export function RoundNumberToIncrement(quantity: number, increment: number, mode: Temporal.RoundingMode) {
  const quotient = Math.trunc(quantity / increment);
  const remainder = quantity % increment;
  const sign = quantity < 0 ? 'negative' : 'positive';
  const r1 = Math.abs(quotient);
  const r2 = r1 + 1;
  const cmp = ComparisonResult(Math.abs(remainder * 2) - increment);
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
  const cmp = (compare(abs(JSBI.multiply(remainder, TWO)), increment) * (JSBI.lessThan(quantity, ZERO) ? -1 : 1) +
    0) as -1 | 0 | 1;
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
  const incrementNs = NS_PER_TIME_UNIT[unit] * increment;
  return RoundNumberToIncrementAsIfPositive(epochNs, JSBI.BigInt(incrementNs), roundingMode);
}

export function RoundISODateTime(
  isoDateTime: ISODateTime,
  increment: number,
  unit: UnitSmallerThanOrEqualTo<'day'>,
  roundingMode: Temporal.RoundingMode
) {
  AssertISODateTimeWithinLimits(isoDateTime);
  const { year, month, day } = isoDateTime.isoDate;
  const time = RoundTime(isoDateTime.time, increment, unit, roundingMode);
  const isoDate = BalanceISODate(year, month, day + time.deltaDays);
  return CombineISODateAndTimeRecord(isoDate, time);
}

export function RoundTime(
  { hour, minute, second, millisecond, microsecond, nanosecond }: TimeRecord,
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
  const nsPerUnit = NS_PER_TIME_UNIT[unit];
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
  timeDuration: TimeDuration,
  increment: number,
  unit: Temporal.TimeUnit,
  roundingMode: Temporal.RoundingMode
) {
  // unit must be a time unit
  const divisor = NS_PER_TIME_UNIT[unit];
  return timeDuration.round(JSBI.BigInt(divisor * increment), roundingMode);
}

export function TotalTimeDuration(timeDuration: TimeDuration, unit: TimeUnitOrDay) {
  const divisor = NS_PER_TIME_UNIT[unit];
  return timeDuration.fdiv(JSBI.BigInt(divisor));
}

export function CompareISODate(isoDate1: ISODate, isoDate2: ISODate) {
  if (isoDate1.year !== isoDate2.year) return ComparisonResult(isoDate1.year - isoDate2.year);
  if (isoDate1.month !== isoDate2.month) return ComparisonResult(isoDate1.month - isoDate2.month);
  if (isoDate1.day !== isoDate2.day) return ComparisonResult(isoDate1.day - isoDate2.day);
  return 0;
}

export function CompareTimeRecord(time1: TimeRecord, time2: TimeRecord) {
  if (time1.hour !== time2.hour) return ComparisonResult(time1.hour - time2.hour);
  if (time1.minute !== time2.minute) return ComparisonResult(time1.minute - time2.minute);
  if (time1.second !== time2.second) return ComparisonResult(time1.second - time2.second);
  if (time1.millisecond !== time2.millisecond) return ComparisonResult(time1.millisecond - time2.millisecond);
  if (time1.microsecond !== time2.microsecond) return ComparisonResult(time1.microsecond - time2.microsecond);
  if (time1.nanosecond !== time2.nanosecond) return ComparisonResult(time1.nanosecond - time2.nanosecond);
  return 0;
}

export function CompareISODateTime(isoDateTime1: ISODateTime, isoDateTime2: ISODateTime) {
  const dateResult = CompareISODate(isoDateTime1.isoDate, isoDateTime2.isoDate);
  if (dateResult !== 0) return dateResult;
  return CompareTimeRecord(isoDateTime1.time, isoDateTime2.time);
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

// rounding modes supported: floor, ceil, trunc
export function epochNsToMs(epochNanosecondsParam: JSBI | bigint, mode: 'floor' | 'ceil' | 'trunc') {
  const epochNanoseconds = ensureJSBI(epochNanosecondsParam);
  const { quotient, remainder } = divmod(epochNanoseconds, MILLION);
  let epochMilliseconds = JSBI.toNumber(quotient);
  if (mode === 'floor' && JSBI.toNumber(remainder) < 0) epochMilliseconds -= 1;
  if (mode === 'ceil' && JSBI.toNumber(remainder) > 0) epochMilliseconds += 1;
  return epochMilliseconds;
}

export function epochMsToNs(epochMilliseconds: number) {
  if (!Number.isInteger(epochMilliseconds)) throw new RangeError('epoch milliseconds must be an integer');
  return JSBI.multiply(JSBI.BigInt(epochMilliseconds), MILLION);
}

export function ToBigInt(arg: unknown): JSBI {
  let prim = arg;
  if (typeof arg === 'object') {
    const toPrimFn = (arg as { [Symbol.toPrimitive]: unknown })[Symbol.toPrimitive];
    if (toPrimFn && typeof toPrimFn === 'function') {
      prim = toPrimFn.call(arg, 'number');
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
    const now = Date.now();
    const ms = JSBI.BigInt(now);
    const result = JSBI.add(epochMsToNs(now), ns);
    ns = JSBI.remainder(ms, MILLION);
    if (JSBI.greaterThan(result, NS_MAX)) return NS_MAX;
    if (JSBI.lessThan(result, NS_MIN)) return NS_MIN;
    return result;
  };
})();

export function DefaultTimeZone() {
  return new Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function ComparisonResult(value: number) {
  return value < 0 ? -1 : value > 0 ? 1 : (value as 0);
}

export function GetOptionsObject<T>(options: T) {
  if (options === undefined) return Object.create(null) as NonNullable<T>;
  if (IsObject(options) && options !== null) return options;
  throw new TypeError(`Options parameter must be an object, not ${options === null ? 'null' : `${typeof options}`}`);
}

export function CreateOnePropObject<K extends string, V>(propName: K, propValue: V): { [k in K]: V } {
  const o = Object.create(null);
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

// This is a temporary implementation. Ideally we'd rely on Intl.DateTimeFormat
// here, to provide the latest CLDR alias data, when implementations catch up to
// the ECMA-402 change. The aliases below are taken from
// https://github.com/unicode-org/cldr/blob/main/common/bcp47/calendar.xml
export function CanonicalizeCalendar(idParam: string): BuiltinCalendarId {
  const id = ASCIILowercase(idParam);

  if (!BUILTIN_CALENDAR_IDS.includes(ASCIILowercase(id))) {
    throw new RangeError(`invalid calendar identifier ${id}`);
  }
  uncheckedAssertNarrowedType<BuiltinCalendarId>(id, 'above code throws out any non-calendar IDs');

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
    const code = str.charCodeAt(ix);
    if (code >= 0x41 && code <= 0x5a) {
      lowercase += String.fromCharCode(code + 0x20);
    } else {
      lowercase += String.fromCharCode(code);
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
  getState: (epochMs: number) => number,
  leftParam: number,
  rightParam: number,
  lstateParam = getState(leftParam),
  rstateParam = getState(rightParam)
) {
  let left = leftParam;
  let right = rightParam;
  let lstate = lstateParam;
  let rstate = rstateParam;
  while (right - left > 1) {
    let middle = Math.trunc((left + right) / 2);
    const mstate = getState(middle);
    if (mstate === lstate) {
      left = middle;
      lstate = mstate;
    } else if (mstate === rstate) {
      right = middle;
      rstate = mstate;
    } else {
      /* c8 ignore next */ assertNotReached(`invalid state in bisection ${lstate} - ${mstate} - ${rstate}`);
    }
  }
  return right;
}
