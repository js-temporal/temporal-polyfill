import { DEBUG } from './debug';
import * as ES from './ecmascript';
import { DateTimeFormat } from './intl';
import { GetIntrinsic, MakeIntrinsicClass } from './intrinsicclass';
import { EPOCHNANOSECONDS, CreateSlots, GetSlot, SetSlot } from './slots';
import { Temporal } from '..';

import bigInt from 'big-integer';

const DISALLOWED_UNITS = ['year', 'month', 'week', 'day'];
const MAX_DIFFERENCE_INCREMENTS = {
  hour: 24,
  minute: 60,
  second: 60,
  millisecond: 1000,
  microsecond: 1000,
  nanosecond: 1000
};

export class Instant implements Temporal.Instant {
  constructor(epochNanoseconds) {
    // Note: if the argument is not passed, ToBigInt(undefined) will throw. This check exists only
    //       to improve the error message.
    if (arguments.length < 1) {
      throw new TypeError('missing argument: epochNanoseconds is required');
    }

    const ns = ES.ToBigInt(epochNanoseconds);
    ES.ValidateEpochNanoseconds(ns);
    CreateSlots(this);
    SetSlot(this, EPOCHNANOSECONDS, ns);

    if (DEBUG) {
      const repr = ES.TemporalInstantToString(this, undefined, 'auto');
      Object.defineProperty(this, '_repr_', {
        value: `${this[Symbol.toStringTag]} <${repr}>`,
        writable: false,
        enumerable: false,
        configurable: false
      });
    }
  }

  get epochSeconds() {
    if (!ES.IsTemporalInstant(this)) throw new TypeError('invalid receiver');
    const value = GetSlot(this, EPOCHNANOSECONDS);
    return +value.divide(1e9);
  }
  get epochMilliseconds() {
    if (!ES.IsTemporalInstant(this)) throw new TypeError('invalid receiver');
    const value = bigInt(GetSlot(this, EPOCHNANOSECONDS));
    return +value.divide(1e6);
  }
  get epochMicroseconds() {
    if (!ES.IsTemporalInstant(this)) throw new TypeError('invalid receiver');
    const value = GetSlot(this, EPOCHNANOSECONDS);
    return bigIntIfAvailable(value.divide(1e3));
  }
  get epochNanoseconds() {
    if (!ES.IsTemporalInstant(this)) throw new TypeError('invalid receiver');
    return bigIntIfAvailable(GetSlot(this, EPOCHNANOSECONDS));
  }

  add(temporalDurationLike) {
    if (!ES.IsTemporalInstant(this)) throw new TypeError('invalid receiver');
    const { hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.ToLimitedTemporalDuration(
      temporalDurationLike,
      ['years', 'months', 'weeks', 'days']
    );
    const ns = ES.AddInstant(
      GetSlot(this, EPOCHNANOSECONDS),
      hours,
      minutes,
      seconds,
      milliseconds,
      microseconds,
      nanoseconds
    );
    return new Instant(ns);
  }
  subtract(temporalDurationLike) {
    if (!ES.IsTemporalInstant(this)) throw new TypeError('invalid receiver');
    const { hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.ToLimitedTemporalDuration(
      temporalDurationLike,
      ['years', 'months', 'weeks', 'days']
    );
    const ns = ES.AddInstant(
      GetSlot(this, EPOCHNANOSECONDS),
      -hours,
      -minutes,
      -seconds,
      -milliseconds,
      -microseconds,
      -nanoseconds
    );
    return new Instant(ns);
  }
  until(otherParam, optionsParam = undefined) {
    if (!ES.IsTemporalInstant(this)) throw new TypeError('invalid receiver');
    const other = ES.ToTemporalInstant(otherParam);
    const options = ES.GetOptionsObject(optionsParam);
    const smallestUnit = ES.ToSmallestTemporalUnit(options, 'nanosecond', DISALLOWED_UNITS);
    const defaultLargestUnit = ES.LargerOfTwoTemporalUnits('second', smallestUnit);
    const largestUnit = ES.ToLargestTemporalUnit(options, 'auto', DISALLOWED_UNITS, defaultLargestUnit);
    ES.ValidateTemporalUnitRange(largestUnit, smallestUnit);
    const roundingMode = ES.ToTemporalRoundingMode(options, 'trunc');
    const roundingIncrement = ES.ToTemporalRoundingIncrement(options, MAX_DIFFERENCE_INCREMENTS[smallestUnit], false);
    const onens = GetSlot(this, EPOCHNANOSECONDS);
    const twons = GetSlot(other, EPOCHNANOSECONDS);
    let { seconds, milliseconds, microseconds, nanoseconds } = ES.DifferenceInstant(
      onens,
      twons,
      roundingIncrement,
      smallestUnit,
      roundingMode
    );
    let hours, minutes;
    ({ hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.BalanceDuration(
      0,
      0,
      0,
      seconds,
      milliseconds,
      microseconds,
      nanoseconds,
      largestUnit
    ));
    const Duration = GetIntrinsic('%Temporal.Duration%');
    return new Duration(0, 0, 0, 0, hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
  }
  since(otherParam, optionsParam = undefined) {
    if (!ES.IsTemporalInstant(this)) throw new TypeError('invalid receiver');
    const other = ES.ToTemporalInstant(otherParam);
    const options = ES.GetOptionsObject(optionsParam);
    const smallestUnit = ES.ToSmallestTemporalUnit(options, 'nanosecond', DISALLOWED_UNITS);
    const defaultLargestUnit = ES.LargerOfTwoTemporalUnits('second', smallestUnit);
    const largestUnit = ES.ToLargestTemporalUnit(options, 'auto', DISALLOWED_UNITS, defaultLargestUnit);
    ES.ValidateTemporalUnitRange(largestUnit, smallestUnit);
    const roundingMode = ES.ToTemporalRoundingMode(options, 'trunc');
    const roundingIncrement = ES.ToTemporalRoundingIncrement(options, MAX_DIFFERENCE_INCREMENTS[smallestUnit], false);
    const onens = GetSlot(other, EPOCHNANOSECONDS);
    const twons = GetSlot(this, EPOCHNANOSECONDS);
    let { seconds, milliseconds, microseconds, nanoseconds } = ES.DifferenceInstant(
      onens,
      twons,
      roundingIncrement,
      smallestUnit,
      roundingMode
    );
    let hours, minutes;
    ({ hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.BalanceDuration(
      0,
      0,
      0,
      seconds,
      milliseconds,
      microseconds,
      nanoseconds,
      largestUnit
    ));
    const Duration = GetIntrinsic('%Temporal.Duration%');
    return new Duration(0, 0, 0, 0, hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
  }
  round(optionsParam) {
    if (!ES.IsTemporalInstant(this)) throw new TypeError('invalid receiver');
    if (optionsParam === undefined) throw new TypeError('options parameter is required');
    const options = ES.GetOptionsObject(optionsParam);
    const smallestUnit = ES.ToSmallestTemporalUnit(options, undefined, DISALLOWED_UNITS);
    if (smallestUnit === undefined) throw new RangeError('smallestUnit is required');
    const roundingMode = ES.ToTemporalRoundingMode(options, 'halfExpand');
    const maximumIncrements = {
      hour: 24,
      minute: 1440,
      second: 86400,
      millisecond: 86400e3,
      microsecond: 86400e6,
      nanosecond: 86400e9
    };
    const roundingIncrement = ES.ToTemporalRoundingIncrement(options, maximumIncrements[smallestUnit], true);
    const ns = GetSlot(this, EPOCHNANOSECONDS);
    const roundedNs = ES.RoundInstant(ns, roundingIncrement, smallestUnit, roundingMode);
    return new Instant(roundedNs);
  }
  equals(otherParam) {
    if (!ES.IsTemporalInstant(this)) throw new TypeError('invalid receiver');
    const other = ES.ToTemporalInstant(otherParam);
    const one = GetSlot(this, EPOCHNANOSECONDS);
    const two = GetSlot(other, EPOCHNANOSECONDS);
    return bigInt(one).equals(two);
  }
  toString(optionsParam = undefined) {
    if (!ES.IsTemporalInstant(this)) throw new TypeError('invalid receiver');
    const options = ES.GetOptionsObject(optionsParam);
    let timeZone = options.timeZone;
    if (timeZone !== undefined) timeZone = ES.ToTemporalTimeZone(timeZone);
    const { precision, unit, increment } = ES.ToSecondsStringPrecision(options);
    const roundingMode = ES.ToTemporalRoundingMode(options, 'trunc');
    const ns = GetSlot(this, EPOCHNANOSECONDS);
    const roundedNs = ES.RoundInstant(ns, increment, unit, roundingMode);
    const roundedInstant = new Instant(roundedNs);
    return ES.TemporalInstantToString(roundedInstant, timeZone, precision);
  }
  toJSON() {
    if (!ES.IsTemporalInstant(this)) throw new TypeError('invalid receiver');
    return ES.TemporalInstantToString(this, undefined, 'auto');
  }
  toLocaleString(locales = undefined, options = undefined) {
    if (!ES.IsTemporalInstant(this)) throw new TypeError('invalid receiver');
    return new DateTimeFormat(locales, options).format(this);
  }
  valueOf(): never {
    throw new TypeError('use compare() or equals() to compare Temporal.Instant');
  }
  toZonedDateTime(item) {
    if (!ES.IsTemporalInstant(this)) throw new TypeError('invalid receiver');
    if (!ES.IsObject(item)) {
      throw new TypeError('invalid argument in toZonedDateTime');
    }
    const calendarLike = item.calendar;
    if (calendarLike === undefined) {
      throw new TypeError('missing calendar property in toZonedDateTime');
    }
    const calendar = ES.ToTemporalCalendar(calendarLike);
    const temporalTimeZoneLike = item.timeZone;
    if (temporalTimeZoneLike === undefined) {
      throw new TypeError('missing timeZone property in toZonedDateTime');
    }
    const timeZone = ES.ToTemporalTimeZone(temporalTimeZoneLike);
    return ES.CreateTemporalZonedDateTime(GetSlot(this, EPOCHNANOSECONDS), timeZone, calendar);
  }
  toZonedDateTimeISO(itemParam) {
    let item = itemParam;
    if (!ES.IsTemporalInstant(this)) throw new TypeError('invalid receiver');
    if (ES.IsObject(item)) {
      const timeZoneProperty = item.timeZone;
      if (timeZoneProperty !== undefined) {
        item = timeZoneProperty;
      }
    }
    const timeZone = ES.ToTemporalTimeZone(item);
    const calendar = ES.GetISO8601Calendar();
    return ES.CreateTemporalZonedDateTime(GetSlot(this, EPOCHNANOSECONDS), timeZone, calendar);
  }

  static fromEpochSeconds(epochSecondsParam) {
    const epochSeconds = ES.ToNumber(epochSecondsParam);
    const epochNanoseconds = bigInt(epochSeconds).multiply(1e9);
    ES.ValidateEpochNanoseconds(epochNanoseconds);
    return new Instant(epochNanoseconds);
  }
  static fromEpochMilliseconds(epochMillisecondsParam) {
    const epochMilliseconds = ES.ToNumber(epochMillisecondsParam);
    const epochNanoseconds = bigInt(epochMilliseconds).multiply(1e6);
    ES.ValidateEpochNanoseconds(epochNanoseconds);
    return new Instant(epochNanoseconds);
  }
  static fromEpochMicroseconds(epochMicrosecondsParam) {
    const epochMicroseconds = ES.ToBigInt(epochMicrosecondsParam);
    const epochNanoseconds = epochMicroseconds.multiply(1e3);
    ES.ValidateEpochNanoseconds(epochNanoseconds);
    return new Instant(epochNanoseconds);
  }
  static fromEpochNanoseconds(epochNanosecondsParam) {
    const epochNanoseconds = ES.ToBigInt(epochNanosecondsParam);
    ES.ValidateEpochNanoseconds(epochNanoseconds);
    return new Instant(epochNanoseconds);
  }
  static from(item) {
    if (ES.IsTemporalInstant(item)) {
      return new Instant(GetSlot(item, EPOCHNANOSECONDS));
    }
    return ES.ToTemporalInstant(item);
  }
  static compare(oneParam, twoParam) {
    const one = ES.ToTemporalInstant(oneParam);
    const two = ES.ToTemporalInstant(twoParam);
    const oneNs = GetSlot(one, EPOCHNANOSECONDS);
    const twoNs = GetSlot(two, EPOCHNANOSECONDS);
    if (bigInt(oneNs).lesser(twoNs)) return -1;
    if (bigInt(oneNs).greater(twoNs)) return 1;
    return 0;
  }
  [Symbol.toStringTag]!: 'Temporal.Instant';
}

MakeIntrinsicClass(Instant, 'Temporal.Instant');

function bigIntIfAvailable(wrapper) {
  return typeof globalThis.BigInt === 'undefined' ? wrapper : wrapper.value;
}
