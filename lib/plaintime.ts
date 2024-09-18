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

type TemporalTimeToStringOptions = {
  unit: ReturnType<typeof ES.ToSecondsStringPrecisionRecord>['unit'];
  increment: ReturnType<typeof ES.ToSecondsStringPrecisionRecord>['increment'];
  roundingMode: Temporal.RoundingMode;
};

function TemporalTimeToString(
  time: Temporal.PlainTime,
  precision: ReturnType<typeof ES.ToSecondsStringPrecisionRecord>['precision'],
  options: TemporalTimeToStringOptions | undefined = undefined
) {
  let hour = GetSlot(time, ISO_HOUR);
  let minute = GetSlot(time, ISO_MINUTE);
  let second = GetSlot(time, ISO_SECOND);
  let millisecond = GetSlot(time, ISO_MILLISECOND);
  let microsecond = GetSlot(time, ISO_MICROSECOND);
  let nanosecond = GetSlot(time, ISO_NANOSECOND);

  if (options) {
    const { unit, increment, roundingMode } = options;
    ({ hour, minute, second, millisecond, microsecond, nanosecond } = ES.RoundTime(
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

  const subSecondNanoseconds = millisecond * 1e6 + microsecond * 1e3 + nanosecond;
  return ES.FormatTimeString(hour, minute, second, subSecondNanoseconds, precision);
}

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
      ObjectDefineProperty(this, '_repr_', {
        value: `${this[SymbolToStringTag]} <${TemporalTimeToString(this, 'auto')}>`,
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
    return ES.AddDurationToOrSubtractDurationFromPlainTime('add', this, temporalDurationLike);
  }
  subtract(temporalDurationLike: Params['subtract'][0]): Return['subtract'] {
    if (!ES.IsTemporalTime(this)) throw new TypeErrorCtor('invalid receiver');
    return ES.AddDurationToOrSubtractDurationFromPlainTime('subtract', this, temporalDurationLike);
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

  toString(optionsParam: Params['toString'][0] = undefined): string {
    if (!ES.IsTemporalTime(this)) throw new TypeErrorCtor('invalid receiver');
    const options = ES.GetOptionsObject(optionsParam);
    const digits = ES.GetTemporalFractionalSecondDigitsOption(options);
    const roundingMode = ES.GetRoundingModeOption(options, 'trunc');
    const smallestUnit = ES.GetTemporalUnitValuedOption(options, 'smallestUnit', 'time', undefined);
    if (smallestUnit === 'hour') throw new RangeErrorCtor('smallestUnit must be a time unit other than "hour"');
    const { precision, unit, increment } = ES.ToSecondsStringPrecisionRecord(smallestUnit, digits);
    return TemporalTimeToString(this, precision, { unit, increment, roundingMode });
  }
  toJSON(): Return['toJSON'] {
    if (!ES.IsTemporalTime(this)) throw new TypeErrorCtor('invalid receiver');
    return TemporalTimeToString(this, 'auto');
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
    if (ES.IsTemporalTime(item)) {
      ES.GetTemporalOverflowOption(ES.GetOptionsObject(options));
      return new PlainTime(
        GetSlot(item, ISO_HOUR),
        GetSlot(item, ISO_MINUTE),
        GetSlot(item, ISO_SECOND),
        GetSlot(item, ISO_MILLISECOND),
        GetSlot(item, ISO_MICROSECOND),
        GetSlot(item, ISO_NANOSECOND)
      );
    }
    return ES.ToTemporalTime(item, options);
  }
  static compare(oneParam: Params['compare'][0], twoParam: Params['compare'][1]): Return['compare'] {
    const one = ES.ToTemporalTime(oneParam);
    const two = ES.ToTemporalTime(twoParam);
    return ES.CompareTemporalTime(
      GetSlot(one, ISO_HOUR),
      GetSlot(one, ISO_MINUTE),
      GetSlot(one, ISO_SECOND),
      GetSlot(one, ISO_MILLISECOND),
      GetSlot(one, ISO_MICROSECOND),
      GetSlot(one, ISO_NANOSECOND),
      GetSlot(two, ISO_HOUR),
      GetSlot(two, ISO_MINUTE),
      GetSlot(two, ISO_SECOND),
      GetSlot(two, ISO_MILLISECOND),
      GetSlot(two, ISO_MICROSECOND),
      GetSlot(two, ISO_NANOSECOND)
    );
  }
  [Symbol.toStringTag]!: 'Temporal.PlainTime';
}

MakeIntrinsicClass(PlainTime, 'Temporal.PlainTime');
