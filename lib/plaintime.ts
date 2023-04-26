import { DEBUG } from './debug';
import * as ES from './ecmascript';
import { GetIntrinsic, MakeIntrinsicClass } from './intrinsicclass';

import {
  ISO_YEAR,
  ISO_MONTH,
  ISO_DAY,
  ISO_HOUR,
  ISO_MINUTE,
  ISO_SECOND,
  ISO_MILLISECOND,
  ISO_MICROSECOND,
  ISO_NANOSECOND,
  CALENDAR,
  EPOCHNANOSECONDS,
  CreateSlots,
  GetSlot,
  SetSlot
} from './slots';
import type { Temporal } from '..';
import { DateTimeFormat } from './intl';
import type { PlainTimeParams as Params, PlainTimeReturn as Return } from './internaltypes';

const ObjectAssign = Object.assign;

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

  const hourString = ES.ISODateTimePartString(hour);
  const minuteString = ES.ISODateTimePartString(minute);
  const seconds = ES.FormatSecondsStringPart(second, millisecond, microsecond, nanosecond, precision);
  return `${hourString}:${minuteString}${seconds}`;
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
      Object.defineProperty(this, '_repr_', {
        value: `${this[Symbol.toStringTag]} <${TemporalTimeToString(this, 'auto')}>`,
        writable: false,
        enumerable: false,
        configurable: false
      });
    }
  }

  get hour(): Return['hour'] {
    if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');
    return GetSlot(this, ISO_HOUR);
  }
  get minute(): Return['minute'] {
    if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');
    return GetSlot(this, ISO_MINUTE);
  }
  get second(): Return['second'] {
    if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');
    return GetSlot(this, ISO_SECOND);
  }
  get millisecond(): Return['millisecond'] {
    if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');
    return GetSlot(this, ISO_MILLISECOND);
  }
  get microsecond(): Return['microsecond'] {
    if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');
    return GetSlot(this, ISO_MICROSECOND);
  }
  get nanosecond(): Return['nanosecond'] {
    if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');
    return GetSlot(this, ISO_NANOSECOND);
  }

  with(temporalTimeLike: Params['with'][0], optionsParam: Params['with'][1] = undefined): Return['with'] {
    if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');
    if (!ES.IsObject(temporalTimeLike)) {
      throw new TypeError('invalid argument');
    }
    ES.RejectTemporalLikeObject(temporalTimeLike);
    const options = ES.GetOptionsObject(optionsParam);
    const overflow = ES.ToTemporalOverflow(options);

    const partialTime = ES.ToTemporalTimeRecord(temporalTimeLike, 'partial');

    const fields = ES.ToTemporalTimeRecord(this);
    let { hour, minute, second, millisecond, microsecond, nanosecond } = ObjectAssign(fields, partialTime);
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
    if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');
    return ES.AddDurationToOrSubtractDurationFromPlainTime('add', this, temporalDurationLike);
  }
  subtract(temporalDurationLike: Params['subtract'][0]): Return['subtract'] {
    if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');
    return ES.AddDurationToOrSubtractDurationFromPlainTime('subtract', this, temporalDurationLike);
  }
  until(other: Params['until'][0], options: Params['until'][1] = undefined): Return['until'] {
    if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');
    return ES.DifferenceTemporalPlainTime('until', this, other, options);
  }
  since(other: Params['since'][0], options: Params['since'][1] = undefined): Return['since'] {
    if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');
    return ES.DifferenceTemporalPlainTime('since', this, other, options);
  }
  round(roundToParam: Params['round'][0]): Return['round'] {
    if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');
    if (roundToParam === undefined) throw new TypeError('options parameter is required');
    const roundTo =
      typeof roundToParam === 'string'
        ? (ES.CreateOnePropObject('smallestUnit', roundToParam) as Exclude<typeof roundToParam, string>)
        : ES.GetOptionsObject(roundToParam);
    const roundingIncrement = ES.ToTemporalRoundingIncrement(roundTo);
    const roundingMode = ES.ToTemporalRoundingMode(roundTo, 'halfExpand');
    const smallestUnit = ES.GetTemporalUnit(roundTo, 'smallestUnit', 'time', ES.REQUIRED);
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
    if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');
    const other = ES.ToTemporalTime(otherParam);
    for (const slot of [ISO_HOUR, ISO_MINUTE, ISO_SECOND, ISO_MILLISECOND, ISO_MICROSECOND, ISO_NANOSECOND]) {
      const val1 = GetSlot(this, slot);
      const val2 = GetSlot(other, slot);
      if (val1 !== val2) return false;
    }
    return true;
  }

  toString(optionsParam: Params['toString'][0] = undefined): string {
    if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');
    const options = ES.GetOptionsObject(optionsParam);
    const digits = ES.ToFractionalSecondDigits(options);
    const roundingMode = ES.ToTemporalRoundingMode(options, 'trunc');
    const smallestUnit = ES.GetTemporalUnit(options, 'smallestUnit', 'time', undefined);
    if (smallestUnit === 'hour') throw new RangeError('smallestUnit must be a time unit other than "hour"');
    const { precision, unit, increment } = ES.ToSecondsStringPrecisionRecord(smallestUnit, digits);
    return TemporalTimeToString(this, precision, { unit, increment, roundingMode });
  }
  toJSON(): Return['toJSON'] {
    if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');
    return TemporalTimeToString(this, 'auto');
  }
  toLocaleString(
    locales: Params['toLocaleString'][0] = undefined,
    options: Params['toLocaleString'][1] = undefined
  ): string {
    if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');
    return new DateTimeFormat(locales, options).format(this);
  }
  valueOf(): never {
    throw new TypeError('use compare() or equals() to compare Temporal.PlainTime');
  }

  toPlainDateTime(temporalDateParam: Params['toPlainDateTime'][0]): Return['toPlainDateTime'] {
    if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');

    const temporalDate = ES.ToTemporalDate(temporalDateParam);
    const year = GetSlot(temporalDate, ISO_YEAR);
    const month = GetSlot(temporalDate, ISO_MONTH);
    const day = GetSlot(temporalDate, ISO_DAY);
    const calendar = GetSlot(temporalDate, CALENDAR);

    const hour = GetSlot(this, ISO_HOUR);
    const minute = GetSlot(this, ISO_MINUTE);
    const second = GetSlot(this, ISO_SECOND);
    const millisecond = GetSlot(this, ISO_MILLISECOND);
    const microsecond = GetSlot(this, ISO_MICROSECOND);
    const nanosecond = GetSlot(this, ISO_NANOSECOND);

    return ES.CreateTemporalDateTime(
      year,
      month,
      day,
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond,
      calendar
    );
  }
  toZonedDateTime(item: Params['toZonedDateTime'][0]): Return['toZonedDateTime'] {
    if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');

    if (!ES.IsObject(item)) {
      throw new TypeError('invalid argument');
    }

    const dateLike = item.plainDate;
    if (dateLike === undefined) {
      throw new TypeError('missing date property');
    }
    const temporalDate = ES.ToTemporalDate(dateLike);

    const timeZoneLike = item.timeZone;
    if (timeZoneLike === undefined) {
      throw new TypeError('missing timeZone property');
    }
    const timeZone = ES.ToTemporalTimeZoneSlotValue(timeZoneLike);

    const year = GetSlot(temporalDate, ISO_YEAR);
    const month = GetSlot(temporalDate, ISO_MONTH);
    const day = GetSlot(temporalDate, ISO_DAY);
    const calendar = GetSlot(temporalDate, CALENDAR);
    const hour = GetSlot(this, ISO_HOUR);
    const minute = GetSlot(this, ISO_MINUTE);
    const second = GetSlot(this, ISO_SECOND);
    const millisecond = GetSlot(this, ISO_MILLISECOND);
    const microsecond = GetSlot(this, ISO_MICROSECOND);
    const nanosecond = GetSlot(this, ISO_NANOSECOND);

    const PlainDateTime = GetIntrinsic('%Temporal.PlainDateTime%');
    const dt = new PlainDateTime(
      year,
      month,
      day,
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond,
      calendar
    );
    const instant = ES.GetInstantFor(timeZone, dt, 'compatible');
    return ES.CreateTemporalZonedDateTime(GetSlot(instant, EPOCHNANOSECONDS), timeZone, calendar);
  }
  getISOFields(): Return['getISOFields'] {
    if (!ES.IsTemporalTime(this)) throw new TypeError('invalid receiver');
    return {
      isoHour: GetSlot(this, ISO_HOUR),
      isoMicrosecond: GetSlot(this, ISO_MICROSECOND),
      isoMillisecond: GetSlot(this, ISO_MILLISECOND),
      isoMinute: GetSlot(this, ISO_MINUTE),
      isoNanosecond: GetSlot(this, ISO_NANOSECOND),
      isoSecond: GetSlot(this, ISO_SECOND)
    };
  }

  static from(item: Params['from'][0], optionsParam: Params['from'][1] = undefined): Return['from'] {
    const options = ES.GetOptionsObject(optionsParam);
    const overflow = ES.ToTemporalOverflow(options);
    if (ES.IsTemporalTime(item)) {
      return new PlainTime(
        GetSlot(item, ISO_HOUR),
        GetSlot(item, ISO_MINUTE),
        GetSlot(item, ISO_SECOND),
        GetSlot(item, ISO_MILLISECOND),
        GetSlot(item, ISO_MICROSECOND),
        GetSlot(item, ISO_NANOSECOND)
      );
    }
    return ES.ToTemporalTime(item, overflow);
  }
  static compare(oneParam: Params['compare'][0], twoParam: Params['compare'][1]): Return['compare'] {
    const one = ES.ToTemporalTime(oneParam);
    const two = ES.ToTemporalTime(twoParam);
    for (const slot of [ISO_HOUR, ISO_MINUTE, ISO_SECOND, ISO_MILLISECOND, ISO_MICROSECOND, ISO_NANOSECOND] as const) {
      const val1 = GetSlot(one, slot);
      const val2 = GetSlot(two, slot);
      if (val1 !== val2) return ES.ComparisonResult(val1 - val2);
    }
    return 0;
  }
  [Symbol.toStringTag]!: 'Temporal.PlainTime';
}

MakeIntrinsicClass(PlainTime, 'Temporal.PlainTime');
