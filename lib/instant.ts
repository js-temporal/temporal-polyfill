import * as ES from './ecmascript';
import { MakeIntrinsicClass } from './intrinsicclass';
import { EPOCHNANOSECONDS, GetSlot } from './slots';
import type { Temporal } from '..';
import { DateTimeFormat } from './intl';
import type { InstantParams as Params, InstantReturn as Return } from './internaltypes';

import JSBI from 'jsbi';

export class Instant implements Temporal.Instant {
  constructor(epochNanoseconds: bigint | JSBI) {
    // Note: if the argument is not passed, ToBigInt(undefined) will throw. This check exists only
    //       to improve the error message.
    if (arguments.length < 1) {
      throw new TypeError('missing argument: epochNanoseconds is required');
    }

    const ns = ES.ToBigInt(epochNanoseconds);
    ES.CreateTemporalInstantSlots(this, ns);
  }

  get epochMilliseconds(): Return['epochMilliseconds'] {
    ES.CheckReceiver(this, ES.IsTemporalInstant);
    const value = GetSlot(this, EPOCHNANOSECONDS);
    return ES.epochNsToMs(value, 'floor');
  }
  get epochNanoseconds(): Return['epochNanoseconds'] {
    ES.CheckReceiver(this, ES.IsTemporalInstant);
    return ES.ToBigIntExternal(JSBI.BigInt(GetSlot(this, EPOCHNANOSECONDS)));
  }

  add(temporalDurationLike: Params['add'][0]): Return['add'] {
    ES.CheckReceiver(this, ES.IsTemporalInstant);
    return ES.AddDurationToInstant('add', this, temporalDurationLike);
  }
  subtract(temporalDurationLike: Params['subtract'][0]): Return['subtract'] {
    ES.CheckReceiver(this, ES.IsTemporalInstant);
    return ES.AddDurationToInstant('subtract', this, temporalDurationLike);
  }
  until(other: Params['until'][0], options: Params['until'][1] = undefined): Return['until'] {
    ES.CheckReceiver(this, ES.IsTemporalInstant);
    return ES.DifferenceTemporalInstant('until', this, other, options);
  }
  since(other: Params['since'][0], options: Params['since'][1] = undefined): Return['since'] {
    ES.CheckReceiver(this, ES.IsTemporalInstant);
    return ES.DifferenceTemporalInstant('since', this, other, options);
  }
  round(roundToParam: Params['round'][0]): Return['round'] {
    ES.CheckReceiver(this, ES.IsTemporalInstant);
    if (roundToParam === undefined) throw new TypeError('options parameter is required');
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
    return ES.CreateTemporalInstant(roundedNs);
  }
  equals(otherParam: Params['equals'][0]): Return['equals'] {
    ES.CheckReceiver(this, ES.IsTemporalInstant);
    const other = ES.ToTemporalInstant(otherParam);
    const one = GetSlot(this, EPOCHNANOSECONDS);
    const two = GetSlot(other, EPOCHNANOSECONDS);
    return JSBI.equal(JSBI.BigInt(one), JSBI.BigInt(two));
  }
  toString(options: Params['toString'][0] = undefined): string {
    ES.CheckReceiver(this, ES.IsTemporalInstant);
    const resolvedOptions = ES.GetOptionsObject(options);
    const digits = ES.GetTemporalFractionalSecondDigitsOption(resolvedOptions);
    const roundingMode = ES.GetRoundingModeOption(resolvedOptions, 'trunc');
    const smallestUnit = ES.GetTemporalUnitValuedOption(resolvedOptions, 'smallestUnit', 'time', undefined);
    if (smallestUnit === 'hour') throw new RangeError('smallestUnit must be a time unit other than "hour"');
    let timeZone = resolvedOptions.timeZone;
    if (timeZone !== undefined) timeZone = ES.ToTemporalTimeZoneIdentifier(timeZone);
    const { precision, unit, increment } = ES.ToSecondsStringPrecisionRecord(smallestUnit, digits);
    const ns = GetSlot(this, EPOCHNANOSECONDS);
    const roundedNs = ES.RoundTemporalInstant(ns, increment, unit, roundingMode);
    const roundedInstant = ES.CreateTemporalInstant(roundedNs);
    return ES.TemporalInstantToString(roundedInstant, timeZone, precision);
  }
  toJSON(): string {
    ES.CheckReceiver(this, ES.IsTemporalInstant);
    return ES.TemporalInstantToString(this, undefined, 'auto');
  }
  toLocaleString(
    locales: Params['toLocaleString'][0] = undefined,
    options: Params['toLocaleString'][1] = undefined
  ): string {
    ES.CheckReceiver(this, ES.IsTemporalInstant);
    return new DateTimeFormat(locales, options).format(this);
  }
  valueOf(): never {
    ES.ValueOfThrows('Instant');
  }
  toZonedDateTimeISO(timeZoneParam: Params['toZonedDateTimeISO'][0]): Return['toZonedDateTimeISO'] {
    ES.CheckReceiver(this, ES.IsTemporalInstant);
    const timeZone = ES.ToTemporalTimeZoneIdentifier(timeZoneParam);
    return ES.CreateTemporalZonedDateTime(GetSlot(this, EPOCHNANOSECONDS), timeZone, 'iso8601');
  }

  static fromEpochMilliseconds(epochMilliseconds: Params['fromEpochMilliseconds'][0]): Return['fromEpochMilliseconds'] {
    const epochNanoseconds = ES.epochMsToNs(ES.ToNumber(epochMilliseconds));
    return ES.CreateTemporalInstant(epochNanoseconds);
  }
  static fromEpochNanoseconds(
    epochNanosecondsParam: Params['fromEpochNanoseconds'][0]
  ): Return['fromEpochNanoseconds'] {
    const epochNanoseconds = ES.ToBigInt(epochNanosecondsParam);
    return ES.CreateTemporalInstant(epochNanoseconds);
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
