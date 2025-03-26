import * as ES from './ecmascript';
import { MakeIntrinsicClass } from './intrinsicclass';

import { GetSlot, TIME } from './slots';
import type { Temporal } from '..';
import { DateTimeFormat } from './intl';
import type { PlainTimeParams as Params, PlainTimeReturn as Return } from './internaltypes';

export class PlainTime implements Temporal.PlainTime {
  constructor(isoHour = 0, isoMinute = 0, isoSecond = 0, isoMillisecond = 0, isoMicrosecond = 0, isoNanosecond = 0) {
    const hour = isoHour === undefined ? 0 : ES.ToIntegerWithTruncation(isoHour);
    const minute = isoMinute === undefined ? 0 : ES.ToIntegerWithTruncation(isoMinute);
    const second = isoSecond === undefined ? 0 : ES.ToIntegerWithTruncation(isoSecond);
    const millisecond = isoMillisecond === undefined ? 0 : ES.ToIntegerWithTruncation(isoMillisecond);
    const microsecond = isoMicrosecond === undefined ? 0 : ES.ToIntegerWithTruncation(isoMicrosecond);
    const nanosecond = isoNanosecond === undefined ? 0 : ES.ToIntegerWithTruncation(isoNanosecond);

    ES.RejectTime(hour, minute, second, millisecond, microsecond, nanosecond);
    const time = { hour, minute, second, millisecond, microsecond, nanosecond };

    ES.CreateTemporalTimeSlots(this, time);
  }

  get hour(): Return['hour'] {
    ES.CheckReceiver(this, ES.IsTemporalTime);
    return GetSlot(this, TIME).hour;
  }
  get minute(): Return['minute'] {
    ES.CheckReceiver(this, ES.IsTemporalTime);
    return GetSlot(this, TIME).minute;
  }
  get second(): Return['second'] {
    ES.CheckReceiver(this, ES.IsTemporalTime);
    return GetSlot(this, TIME).second;
  }
  get millisecond(): Return['millisecond'] {
    ES.CheckReceiver(this, ES.IsTemporalTime);
    return GetSlot(this, TIME).millisecond;
  }
  get microsecond(): Return['microsecond'] {
    ES.CheckReceiver(this, ES.IsTemporalTime);
    return GetSlot(this, TIME).microsecond;
  }
  get nanosecond(): Return['nanosecond'] {
    ES.CheckReceiver(this, ES.IsTemporalTime);
    return GetSlot(this, TIME).nanosecond;
  }

  with(temporalTimeLike: Params['with'][0], options: Params['with'][1] = undefined): Return['with'] {
    ES.CheckReceiver(this, ES.IsTemporalTime);
    if (!ES.IsObject(temporalTimeLike)) {
      throw new TypeError('invalid argument');
    }
    ES.RejectTemporalLikeObject(temporalTimeLike);

    const partialTime = ES.ToTemporalTimeRecord(temporalTimeLike, 'partial');

    const fields = ES.ToTemporalTimeRecord(this);
    let { hour, minute, second, millisecond, microsecond, nanosecond } = Object.assign(fields, partialTime);
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
    ES.CheckReceiver(this, ES.IsTemporalTime);
    return ES.AddDurationToTime('add', this, temporalDurationLike);
  }
  subtract(temporalDurationLike: Params['subtract'][0]): Return['subtract'] {
    ES.CheckReceiver(this, ES.IsTemporalTime);
    return ES.AddDurationToTime('subtract', this, temporalDurationLike);
  }
  until(other: Params['until'][0], options: Params['until'][1] = undefined): Return['until'] {
    ES.CheckReceiver(this, ES.IsTemporalTime);
    return ES.DifferenceTemporalPlainTime('until', this, other, options);
  }
  since(other: Params['since'][0], options: Params['since'][1] = undefined): Return['since'] {
    ES.CheckReceiver(this, ES.IsTemporalTime);
    return ES.DifferenceTemporalPlainTime('since', this, other, options);
  }
  round(roundToParam: Params['round'][0]): Return['round'] {
    ES.CheckReceiver(this, ES.IsTemporalTime);
    if (roundToParam === undefined) throw new TypeError('options parameter is required');
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

    const time = ES.RoundTime(GetSlot(this, TIME), roundingIncrement, smallestUnit, roundingMode);
    return ES.CreateTemporalTime(time);
  }
  equals(otherParam: Params['equals'][0]): Return['equals'] {
    ES.CheckReceiver(this, ES.IsTemporalTime);
    const other = ES.ToTemporalTime(otherParam);
    return ES.CompareTimeRecord(GetSlot(this, TIME), GetSlot(other, TIME)) === 0;
  }

  toString(options: Params['toString'][0] = undefined): string {
    ES.CheckReceiver(this, ES.IsTemporalTime);
    const resolvedOptions = ES.GetOptionsObject(options);
    const digits = ES.GetTemporalFractionalSecondDigitsOption(resolvedOptions);
    const roundingMode = ES.GetRoundingModeOption(resolvedOptions, 'trunc');
    const smallestUnit = ES.GetTemporalUnitValuedOption(resolvedOptions, 'smallestUnit', 'time', undefined);
    if (smallestUnit === 'hour') throw new RangeError('smallestUnit must be a time unit other than "hour"');
    const { precision, unit, increment } = ES.ToSecondsStringPrecisionRecord(smallestUnit, digits);
    const time = ES.RoundTime(GetSlot(this, TIME), increment, unit, roundingMode);
    return ES.TimeRecordToString(time, precision);
  }
  toJSON(): Return['toJSON'] {
    ES.CheckReceiver(this, ES.IsTemporalTime);
    return ES.TimeRecordToString(GetSlot(this, TIME), 'auto');
  }
  toLocaleString(
    locales: Params['toLocaleString'][0] = undefined,
    options: Params['toLocaleString'][1] = undefined
  ): string {
    ES.CheckReceiver(this, ES.IsTemporalTime);
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
    return ES.CompareTimeRecord(GetSlot(one, TIME), GetSlot(two, TIME));
  }
  [Symbol.toStringTag]!: 'Temporal.PlainTime';
}

MakeIntrinsicClass(PlainTime, 'Temporal.PlainTime');
