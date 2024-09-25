import {
  // error constructors
  RangeError as RangeErrorCtor,
  TypeError as TypeErrorCtor,

  // class static functions and methods
  ObjectDefineProperty,
  SymbolToStringTag
} from './primordials';

import { DEBUG } from './debug';
import * as ES from './ecmascript';
import { MakeIntrinsicClass } from './intrinsicclass';
import { EPOCHNANOSECONDS, CreateSlots, GetSlot, SetSlot } from './slots';
import type { Temporal } from '..';
import { DateTimeFormat } from './intl';
import type { InstantParams as Params, InstantReturn as Return } from './internaltypes';

import JSBI from 'jsbi';
import { MILLION } from './bigintmath';

export class Instant implements Temporal.Instant {
  constructor(epochNanoseconds: bigint | JSBI) {
    // Note: if the argument is not passed, ToBigInt(undefined) will throw. This check exists only
    //       to improve the error message.
    if (arguments.length < 1) {
      throw new TypeErrorCtor('missing argument: epochNanoseconds is required');
    }

    const ns = ES.ToBigInt(epochNanoseconds);
    ES.ValidateEpochNanoseconds(ns);
    CreateSlots(this);
    SetSlot(this, EPOCHNANOSECONDS, ns);

    if (DEBUG) {
      const iso = ES.GetISOPartsFromEpoch(ns);
      const repr = ES.TemporalDateTimeToString(iso, 'iso8601', 'auto', 'never') + 'Z';
      ObjectDefineProperty(this, '_repr_', {
        value: `${this[SymbolToStringTag]} <${repr}>`,
        writable: false,
        enumerable: false,
        configurable: false
      });
    }
  }

  get epochMilliseconds(): Return['epochMilliseconds'] {
    if (!ES.IsTemporalInstant(this)) throw new TypeErrorCtor('invalid receiver');
    const value = GetSlot(this, EPOCHNANOSECONDS);
    return ES.epochNsToMs(value, 'floor');
  }
  get epochNanoseconds(): Return['epochNanoseconds'] {
    if (!ES.IsTemporalInstant(this)) throw new TypeErrorCtor('invalid receiver');
    return ES.ToBigIntExternal(JSBI.BigInt(GetSlot(this, EPOCHNANOSECONDS)));
  }

  add(temporalDurationLike: Params['add'][0]): Return['add'] {
    if (!ES.IsTemporalInstant(this)) throw new TypeErrorCtor('invalid receiver');
    return ES.AddDurationToInstant('add', this, temporalDurationLike);
  }
  subtract(temporalDurationLike: Params['subtract'][0]): Return['subtract'] {
    if (!ES.IsTemporalInstant(this)) throw new TypeErrorCtor('invalid receiver');
    return ES.AddDurationToInstant('subtract', this, temporalDurationLike);
  }
  until(other: Params['until'][0], options: Params['until'][1] = undefined): Return['until'] {
    if (!ES.IsTemporalInstant(this)) throw new TypeErrorCtor('invalid receiver');
    return ES.DifferenceTemporalInstant('until', this, other, options);
  }
  since(other: Params['since'][0], options: Params['since'][1] = undefined): Return['since'] {
    if (!ES.IsTemporalInstant(this)) throw new TypeErrorCtor('invalid receiver');
    return ES.DifferenceTemporalInstant('since', this, other, options);
  }
  round(roundToParam: Params['round'][0]): Return['round'] {
    if (!ES.IsTemporalInstant(this)) throw new TypeErrorCtor('invalid receiver');
    if (roundToParam === undefined) throw new TypeErrorCtor('options parameter is required');
    const roundTo =
      typeof roundToParam === 'string'
        ? (ES.CreateOnePropObject('smallestUnit', roundToParam) as Exclude<typeof roundToParam, string>)
        : ES.GetOptionsObject(roundToParam);
    const roundingIncrement = ES.GetTemporalRoundingIncrementOption(roundTo);
    const roundingMode = ES.GetRoundingModeOption(roundTo, 'halfExpand');
    const smallestUnit = ES.GetTemporalUnitValuedOption(roundTo, 'smallestUnit', 'time', ES.REQUIRED);
    const maximumIncrements = {
      hour: 24,
      minute: 1440,
      second: 86400,
      millisecond: 86400e3,
      microsecond: 86400e6,
      nanosecond: 86400e9
    };
    ES.ValidateTemporalRoundingIncrement(roundingIncrement, maximumIncrements[smallestUnit], true);
    const ns = GetSlot(this, EPOCHNANOSECONDS);
    const roundedNs = ES.RoundTemporalInstant(ns, roundingIncrement, smallestUnit, roundingMode);
    return new Instant(roundedNs);
  }
  equals(otherParam: Params['equals'][0]): Return['equals'] {
    if (!ES.IsTemporalInstant(this)) throw new TypeErrorCtor('invalid receiver');
    const other = ES.ToTemporalInstant(otherParam);
    const one = GetSlot(this, EPOCHNANOSECONDS);
    const two = GetSlot(other, EPOCHNANOSECONDS);
    return JSBI.equal(JSBI.BigInt(one), JSBI.BigInt(two));
  }
  toString(options: Params['toString'][0] = undefined): string {
    if (!ES.IsTemporalInstant(this)) throw new TypeErrorCtor('invalid receiver');
    const resolvedOptions = ES.GetOptionsObject(options);
    const digits = ES.GetTemporalFractionalSecondDigitsOption(resolvedOptions);
    const roundingMode = ES.GetRoundingModeOption(resolvedOptions, 'trunc');
    const smallestUnit = ES.GetTemporalUnitValuedOption(resolvedOptions, 'smallestUnit', 'time', undefined);
    if (smallestUnit === 'hour') throw new RangeErrorCtor('smallestUnit must be a time unit other than "hour"');
    let timeZone = resolvedOptions.timeZone;
    if (timeZone !== undefined) timeZone = ES.ToTemporalTimeZoneIdentifier(timeZone);
    const { precision, unit, increment } = ES.ToSecondsStringPrecisionRecord(smallestUnit, digits);
    const ns = GetSlot(this, EPOCHNANOSECONDS);
    const roundedNs = ES.RoundTemporalInstant(ns, increment, unit, roundingMode);
    const roundedInstant = new Instant(roundedNs);
    return ES.TemporalInstantToString(roundedInstant, timeZone, precision);
  }
  toJSON(): string {
    if (!ES.IsTemporalInstant(this)) throw new TypeErrorCtor('invalid receiver');
    return ES.TemporalInstantToString(this, undefined, 'auto');
  }
  toLocaleString(
    locales: Params['toLocaleString'][0] = undefined,
    options: Params['toLocaleString'][1] = undefined
  ): string {
    if (!ES.IsTemporalInstant(this)) throw new TypeErrorCtor('invalid receiver');
    return new DateTimeFormat(locales, options).format(this);
  }
  valueOf(): never {
    ES.ValueOfThrows('Instant');
  }
  toZonedDateTimeISO(timeZoneParam: Params['toZonedDateTimeISO'][0]): Return['toZonedDateTimeISO'] {
    if (!ES.IsTemporalInstant(this)) throw new TypeErrorCtor('invalid receiver');
    const timeZone = ES.ToTemporalTimeZoneIdentifier(timeZoneParam);
    return ES.CreateTemporalZonedDateTime(GetSlot(this, EPOCHNANOSECONDS), timeZone, 'iso8601');
  }

  static fromEpochMilliseconds(
    epochMillisecondsParam: Params['fromEpochMilliseconds'][0]
  ): Return['fromEpochMilliseconds'] {
    const epochMilliseconds = ES.ToNumber(epochMillisecondsParam);
    const epochNanoseconds = JSBI.multiply(JSBI.BigInt(epochMilliseconds), MILLION);
    ES.ValidateEpochNanoseconds(epochNanoseconds);
    return new Instant(epochNanoseconds);
  }
  static fromEpochNanoseconds(
    epochNanosecondsParam: Params['fromEpochNanoseconds'][0]
  ): Return['fromEpochNanoseconds'] {
    const epochNanoseconds = ES.ToBigInt(epochNanosecondsParam);
    ES.ValidateEpochNanoseconds(epochNanoseconds);
    return new Instant(epochNanoseconds);
  }
  static from(item: Params['from'][0]): Return['from'] {
    return ES.ToTemporalInstant(item);
  }
  static compare(oneParam: Params['compare'][0], twoParam: Params['compare'][1]): Return['compare'] {
    const one = ES.ToTemporalInstant(oneParam);
    const two = ES.ToTemporalInstant(twoParam);
    const oneNs = GetSlot(one, EPOCHNANOSECONDS);
    const twoNs = GetSlot(two, EPOCHNANOSECONDS);
    if (JSBI.lessThan(oneNs, twoNs)) return -1;
    if (JSBI.greaterThan(oneNs, twoNs)) return 1;
    return 0;
  }
  [Symbol.toStringTag]!: 'Temporal.Instant';
}

MakeIntrinsicClass(Instant, 'Temporal.Instant');
