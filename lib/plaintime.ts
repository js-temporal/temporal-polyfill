import {
  // error constructors
  RangeError as RangeErrorCtor,
  TypeError as TypeErrorCtor,

  // class static functions and methods
  ArrayPrototypeEvery,
  ObjectAssign,
  ObjectDefineProperty,
  SymbolToStringTag
} from './primordials';

import { DEBUG } from './debug';
import * as ES from './ecmascript';
import { MakeIntrinsicClass } from './intrinsicclass';

import {
  ISO_HOUR,
  ISO_MINUTE,
  ISO_SECOND,
  ISO_MILLISECOND,
  ISO_MICROSECOND,
  ISO_NANOSECOND,
  CreateSlots,
  GetSlot,
  SetSlot
} from './slots';
import type { Temporal } from '..';
import { DateTimeFormat } from './intl';
import type { PlainTimeParams as Params, PlainTimeReturn as Return } from './internaltypes';

export class PlainTime implements Temporal.PlainTime {
  constructor(
    isoHourParam = 0,
    isoMinuteParam = 0,
    isoSecondParam = 0,
    isoMillisecondParam = 0,
    isoMicrosecondParam = 0,
    isoNanosecondParam = 0
  ) {
    const isoHour = isoHourParam === undefined ? 0 : ES.ToIntegerWithTruncation(isoHourParam);
    const isoMinute = isoMinuteParam === undefined ? 0 : ES.ToIntegerWithTruncation(isoMinuteParam);
    const isoSecond = isoSecondParam === undefined ? 0 : ES.ToIntegerWithTruncation(isoSecondParam);
    const isoMillisecond = isoMillisecondParam === undefined ? 0 : ES.ToIntegerWithTruncation(isoMillisecondParam);
    const isoMicrosecond = isoMicrosecondParam === undefined ? 0 : ES.ToIntegerWithTruncation(isoMicrosecondParam);
    const isoNanosecond = isoNanosecondParam === undefined ? 0 : ES.ToIntegerWithTruncation(isoNanosecondParam);

    ES.RejectTime(isoHour, isoMinute, isoSecond, isoMillisecond, isoMicrosecond, isoNanosecond);
    CreateSlots(this);
    SetSlot(this, ISO_HOUR, isoHour);
    SetSlot(this, ISO_MINUTE, isoMinute);
    SetSlot(this, ISO_SECOND, isoSecond);
    SetSlot(this, ISO_MILLISECOND, isoMillisecond);
    SetSlot(this, ISO_MICROSECOND, isoMicrosecond);
    SetSlot(this, ISO_NANOSECOND, isoNanosecond);

    if (DEBUG) {
      const time = {
        hour: isoHour,
        minute: isoMinute,
        second: isoSecond,
        millisecond: isoMillisecond,
        microsecond: isoMicrosecond,
        nanosecond: isoNanosecond
      };
      ObjectDefineProperty(this, '_repr_', {
        value: `${this[SymbolToStringTag]} <${ES.TimeRecordToString(time, 'auto')}>`,
        writable: false,
        enumerable: false,
        configurable: false
      });
    }
  }

  get hour(): Return['hour'] {
    if (!ES.IsTemporalTime(this)) throw new TypeErrorCtor('invalid receiver');
    return GetSlot(this, ISO_HOUR);
  }
  get minute(): Return['minute'] {
    if (!ES.IsTemporalTime(this)) throw new TypeErrorCtor('invalid receiver');
    return GetSlot(this, ISO_MINUTE);
  }
  get second(): Return['second'] {
    if (!ES.IsTemporalTime(this)) throw new TypeErrorCtor('invalid receiver');
    return GetSlot(this, ISO_SECOND);
  }
  get millisecond(): Return['millisecond'] {
    if (!ES.IsTemporalTime(this)) throw new TypeErrorCtor('invalid receiver');
    return GetSlot(this, ISO_MILLISECOND);
  }
  get microsecond(): Return['microsecond'] {
    if (!ES.IsTemporalTime(this)) throw new TypeErrorCtor('invalid receiver');
    return GetSlot(this, ISO_MICROSECOND);
  }
  get nanosecond(): Return['nanosecond'] {
    if (!ES.IsTemporalTime(this)) throw new TypeErrorCtor('invalid receiver');
    return GetSlot(this, ISO_NANOSECOND);
  }

  with(temporalTimeLike: Params['with'][0], options: Params['with'][1] = undefined): Return['with'] {
    if (!ES.IsTemporalTime(this)) throw new TypeErrorCtor('invalid receiver');
    if (!ES.IsObject(temporalTimeLike)) {
      throw new TypeError('invalid argument');
    }
    ES.RejectTemporalLikeObject(temporalTimeLike);

    const partialTime = ES.ToTemporalTimeRecord(temporalTimeLike, 'partial');

    const fields = ES.ToTemporalTimeRecord(this);
    let { hour, minute, second, millisecond, microsecond, nanosecond } = ObjectAssign(fields, partialTime);
    const overflow = ES.GetTemporalOverflowOption(ES.GetOptionsObject(options));
    ({ hour, minute, second, millisecond, microsecond, nanosecond } = ES.RegulateTime(
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond,
      overflow
    ));
    return new PlainTime(hour, minute, second, millisecond, microsecond, nanosecond);
  }
  add(temporalDurationLike: Params['add'][0]): Return['add'] {
    if (!ES.IsTemporalTime(this)) throw new TypeErrorCtor('invalid receiver');
    return ES.AddDurationToTime('add', this, temporalDurationLike);
  }
  subtract(temporalDurationLike: Params['subtract'][0]): Return['subtract'] {
    if (!ES.IsTemporalTime(this)) throw new TypeErrorCtor('invalid receiver');
    return ES.AddDurationToTime('subtract', this, temporalDurationLike);
  }
  until(other: Params['until'][0], options: Params['until'][1] = undefined): Return['until'] {
    if (!ES.IsTemporalTime(this)) throw new TypeErrorCtor('invalid receiver');
    return ES.DifferenceTemporalPlainTime('until', this, other, options);
  }
  since(other: Params['since'][0], options: Params['since'][1] = undefined): Return['since'] {
    if (!ES.IsTemporalTime(this)) throw new TypeErrorCtor('invalid receiver');
    return ES.DifferenceTemporalPlainTime('since', this, other, options);
  }
  round(roundToParam: Params['round'][0]): Return['round'] {
    if (!ES.IsTemporalTime(this)) throw new TypeErrorCtor('invalid receiver');
    if (roundToParam === undefined) throw new TypeErrorCtor('options parameter is required');
    const roundTo =
      typeof roundToParam === 'string'
        ? (ES.CreateOnePropObject('smallestUnit', roundToParam) as Exclude<typeof roundToParam, string>)
        : ES.GetOptionsObject(roundToParam);
    const roundingIncrement = ES.GetTemporalRoundingIncrementOption(roundTo);
    const roundingMode = ES.GetRoundingModeOption(roundTo, 'halfExpand');
    const smallestUnit = ES.GetTemporalUnitValuedOption(roundTo, 'smallestUnit', 'time', ES.REQUIRED);
    const MAX_INCREMENTS = {
      hour: 24,
      minute: 60,
      second: 60,
      millisecond: 1000,
      microsecond: 1000,
      nanosecond: 1000
    };
    ES.ValidateTemporalRoundingIncrement(roundingIncrement, MAX_INCREMENTS[smallestUnit], false);

    let hour = GetSlot(this, ISO_HOUR);
    let minute = GetSlot(this, ISO_MINUTE);
    let second = GetSlot(this, ISO_SECOND);
    let millisecond = GetSlot(this, ISO_MILLISECOND);
    let microsecond = GetSlot(this, ISO_MICROSECOND);
    let nanosecond = GetSlot(this, ISO_NANOSECOND);
    ({ hour, minute, second, millisecond, microsecond, nanosecond } = ES.RoundTime(
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond,
      roundingIncrement,
      smallestUnit,
      roundingMode
    ));

    return new PlainTime(hour, minute, second, millisecond, microsecond, nanosecond);
  }
  equals(otherParam: Params['equals'][0]): Return['equals'] {
    if (!ES.IsTemporalTime(this)) throw new TypeErrorCtor('invalid receiver');
    const other = ES.ToTemporalTime(otherParam);
    return ES.Call(
      ArrayPrototypeEvery,
      [ISO_HOUR, ISO_MINUTE, ISO_SECOND, ISO_MILLISECOND, ISO_MICROSECOND, ISO_NANOSECOND],
      [(slot) => GetSlot(this, slot) === GetSlot(other, slot)]
    );
  }

  toString(options: Params['toString'][0] = undefined): string {
    if (!ES.IsTemporalTime(this)) throw new TypeErrorCtor('invalid receiver');
    const resolvedOptions = ES.GetOptionsObject(options);
    const digits = ES.GetTemporalFractionalSecondDigitsOption(resolvedOptions);
    const roundingMode = ES.GetRoundingModeOption(resolvedOptions, 'trunc');
    const smallestUnit = ES.GetTemporalUnitValuedOption(resolvedOptions, 'smallestUnit', 'time', undefined);
    if (smallestUnit === 'hour') throw new RangeErrorCtor('smallestUnit must be a time unit other than "hour"');
    const { precision, unit, increment } = ES.ToSecondsStringPrecisionRecord(smallestUnit, digits);
    const time = ES.RoundTime(
      GetSlot(this, ISO_HOUR),
      GetSlot(this, ISO_MINUTE),
      GetSlot(this, ISO_SECOND),
      GetSlot(this, ISO_MILLISECOND),
      GetSlot(this, ISO_MICROSECOND),
      GetSlot(this, ISO_NANOSECOND),
      increment,
      unit,
      roundingMode
    );
    return ES.TimeRecordToString(time, precision);
  }
  toJSON(): Return['toJSON'] {
    if (!ES.IsTemporalTime(this)) throw new TypeErrorCtor('invalid receiver');
    const time = {
      hour: GetSlot(this, ISO_HOUR),
      minute: GetSlot(this, ISO_MINUTE),
      second: GetSlot(this, ISO_SECOND),
      millisecond: GetSlot(this, ISO_MILLISECOND),
      microsecond: GetSlot(this, ISO_MICROSECOND),
      nanosecond: GetSlot(this, ISO_NANOSECOND)
    };
    return ES.TimeRecordToString(time, 'auto');
  }
  toLocaleString(
    locales: Params['toLocaleString'][0] = undefined,
    options: Params['toLocaleString'][1] = undefined
  ): string {
    if (!ES.IsTemporalTime(this)) throw new TypeErrorCtor('invalid receiver');
    return new DateTimeFormat(locales, options).format(this);
  }
  valueOf(): never {
    ES.ValueOfThrows('PlainTime');
  }

  static from(item: Params['from'][0], options: Params['from'][1] = undefined): Return['from'] {
    return ES.ToTemporalTime(item, options);
  }
  static compare(oneParam: Params['compare'][0], twoParam: Params['compare'][1]): Return['compare'] {
    const one = ES.ToTemporalTime(oneParam);
    const two = ES.ToTemporalTime(twoParam);
    return ES.CompareTimeRecord(
      {
        hour: GetSlot(one, ISO_HOUR),
        minute: GetSlot(one, ISO_MINUTE),
        second: GetSlot(one, ISO_SECOND),
        millisecond: GetSlot(one, ISO_MILLISECOND),
        microsecond: GetSlot(one, ISO_MICROSECOND),
        nanosecond: GetSlot(one, ISO_NANOSECOND)
      },
      {
        hour: GetSlot(two, ISO_HOUR),
        minute: GetSlot(two, ISO_MINUTE),
        second: GetSlot(two, ISO_SECOND),
        millisecond: GetSlot(two, ISO_MILLISECOND),
        microsecond: GetSlot(two, ISO_MICROSECOND),
        nanosecond: GetSlot(two, ISO_NANOSECOND)
      }
    );
  }
  [Symbol.toStringTag]!: 'Temporal.PlainTime';
}

MakeIntrinsicClass(PlainTime, 'Temporal.PlainTime');
