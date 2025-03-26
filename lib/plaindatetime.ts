import * as ES from './ecmascript';
import { MakeIntrinsicClass } from './intrinsicclass';

import { CALENDAR, GetSlot, ISO_DATE_TIME } from './slots';
import type { Temporal } from '..';
import { DateTimeFormat } from './intl';
import type { CalendarDateRecord, PlainDateTimeParams as Params, PlainDateTimeReturn as Return } from './internaltypes';

export class PlainDateTime implements Temporal.PlainDateTime {
  constructor(
    isoYear: Params['constructor'][0],
    isoMonth: Params['constructor'][1],
    isoDay: Params['constructor'][2],
    hourParam: Params['constructor'][3] = 0,
    minuteParam: Params['constructor'][4] = 0,
    secondParam: Params['constructor'][5] = 0,
    millisecondParam: Params['constructor'][6] = 0,
    microsecondParam: Params['constructor'][7] = 0,
    nanosecondParam: Params['constructor'][8] = 0,
    calendarParam: Params['constructor'][9] = 'iso8601'
  ) {
    const year = ES.ToIntegerWithTruncation(isoYear);
    const month = ES.ToIntegerWithTruncation(isoMonth);
    const day = ES.ToIntegerWithTruncation(isoDay);
    const hour = hourParam === undefined ? 0 : ES.ToIntegerWithTruncation(hourParam);
    const minute = minuteParam === undefined ? 0 : ES.ToIntegerWithTruncation(minuteParam);
    const second = secondParam === undefined ? 0 : ES.ToIntegerWithTruncation(secondParam);
    const millisecond = millisecondParam === undefined ? 0 : ES.ToIntegerWithTruncation(millisecondParam);
    const microsecond = microsecondParam === undefined ? 0 : ES.ToIntegerWithTruncation(microsecondParam);
    const nanosecond = nanosecondParam === undefined ? 0 : ES.ToIntegerWithTruncation(nanosecondParam);
    const calendar = ES.CanonicalizeCalendar(calendarParam === undefined ? 'iso8601' : ES.RequireString(calendarParam));

    ES.RejectDateTime(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond);

    ES.CreateTemporalDateTimeSlots(
      this,
      { isoDate: { year, month, day }, time: { hour, minute, second, millisecond, microsecond, nanosecond } },
      calendar
    );
  }
  get calendarId(): Return['calendarId'] {
    ES.CheckReceiver(this, ES.IsTemporalDateTime);
    return GetSlot(this, CALENDAR);
  }
  get year(): Return['year'] {
    return getCalendarProperty(this, 'year');
  }
  get month(): Return['month'] {
    return getCalendarProperty(this, 'month');
  }
  get monthCode(): Return['monthCode'] {
    return getCalendarProperty(this, 'monthCode');
  }
  get day(): Return['day'] {
    return getCalendarProperty(this, 'day');
  }
  get hour(): Return['hour'] {
    return getTimeProperty(this, 'hour');
  }
  get minute(): Return['minute'] {
    return getTimeProperty(this, 'minute');
  }
  get second(): Return['second'] {
    return getTimeProperty(this, 'second');
  }
  get millisecond(): Return['millisecond'] {
    return getTimeProperty(this, 'millisecond');
  }
  get microsecond(): Return['microsecond'] {
    return getTimeProperty(this, 'microsecond');
  }
  get nanosecond(): Return['nanosecond'] {
    return getTimeProperty(this, 'nanosecond');
  }
  get era(): Return['era'] {
    return getCalendarProperty(this, 'era');
  }
  get eraYear(): Return['eraYear'] {
    return getCalendarProperty(this, 'eraYear');
  }
  get dayOfWeek(): Return['dayOfWeek'] {
    return getCalendarProperty(this, 'dayOfWeek');
  }
  get dayOfYear(): Return['dayOfYear'] {
    return getCalendarProperty(this, 'dayOfYear');
  }
  get weekOfYear(): Return['weekOfYear'] {
    return getCalendarProperty(this, 'weekOfYear')?.week;
  }
  get yearOfWeek(): Return['yearOfWeek'] {
    return getCalendarProperty(this, 'weekOfYear')?.year;
  }
  get daysInWeek(): Return['daysInWeek'] {
    return getCalendarProperty(this, 'daysInWeek');
  }
  get daysInYear(): Return['daysInYear'] {
    return getCalendarProperty(this, 'daysInYear');
  }
  get daysInMonth(): Return['daysInMonth'] {
    return getCalendarProperty(this, 'daysInMonth');
  }
  get monthsInYear(): Return['monthsInYear'] {
    return getCalendarProperty(this, 'monthsInYear');
  }
  get inLeapYear(): Return['inLeapYear'] {
    return getCalendarProperty(this, 'inLeapYear');
  }
  with(temporalDateTimeLike: Params['with'][0], options: Params['with'][1] = undefined): Return['with'] {
    ES.CheckReceiver(this, ES.IsTemporalDateTime);
    if (!ES.IsObject(temporalDateTimeLike)) {
      throw new TypeError('invalid argument');
    }
    ES.RejectTemporalLikeObject(temporalDateTimeLike);

    const calendar = GetSlot(this, CALENDAR);
    const isoDateTime = GetSlot(this, ISO_DATE_TIME);
    let fields = {
      ...ES.ISODateToFields(calendar, isoDateTime.isoDate),
      ...isoDateTime.time
    };
    const partialDateTime = ES.PrepareCalendarFields(
      calendar,
      temporalDateTimeLike,
      ['year', 'month', 'monthCode', 'day'],
      ['hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond'],
      'partial'
    );
    fields = ES.CalendarMergeFields(calendar, fields, partialDateTime);

    const overflow = ES.GetTemporalOverflowOption(ES.GetOptionsObject(options));
    const newDateTime = ES.InterpretTemporalDateTimeFields(calendar, fields, overflow);
    return ES.CreateTemporalDateTime(newDateTime, calendar);
  }
  withPlainTime(temporalTime: Params['withPlainTime'][0] = undefined): Return['withPlainTime'] {
    ES.CheckReceiver(this, ES.IsTemporalDateTime);
    const time = ES.ToTimeRecordOrMidnight(temporalTime);
    const isoDateTime = ES.CombineISODateAndTimeRecord(GetSlot(this, ISO_DATE_TIME).isoDate, time);
    return ES.CreateTemporalDateTime(isoDateTime, GetSlot(this, CALENDAR));
  }
  withCalendar(calendarParam: Params['withCalendar'][0]): Return['withCalendar'] {
    ES.CheckReceiver(this, ES.IsTemporalDateTime);
    const calendar = ES.ToTemporalCalendarIdentifier(calendarParam);
    return ES.CreateTemporalDateTime(GetSlot(this, ISO_DATE_TIME), calendar);
  }
  add(temporalDurationLike: Params['add'][0], options: Params['add'][1] = undefined): Return['add'] {
    ES.CheckReceiver(this, ES.IsTemporalDateTime);
    return ES.AddDurationToDateTime('add', this, temporalDurationLike, options);
  }
  subtract(
    temporalDurationLike: Params['subtract'][0],
    options: Params['subtract'][1] = undefined
  ): Return['subtract'] {
    ES.CheckReceiver(this, ES.IsTemporalDateTime);
    return ES.AddDurationToDateTime('subtract', this, temporalDurationLike, options);
  }
  until(other: Params['until'][0], options: Params['until'][1] = undefined): Return['until'] {
    ES.CheckReceiver(this, ES.IsTemporalDateTime);
    return ES.DifferenceTemporalPlainDateTime('until', this, other, options);
  }
  since(other: Params['since'][0], options: Params['since'][1] = undefined): Return['since'] {
    ES.CheckReceiver(this, ES.IsTemporalDateTime);
    return ES.DifferenceTemporalPlainDateTime('since', this, other, options);
  }
  round(roundToParam: Params['round'][0]): Return['round'] {
    ES.CheckReceiver(this, ES.IsTemporalDateTime);
    if (roundToParam === undefined) throw new TypeError('options parameter is required');
    const roundTo =
      typeof roundToParam === 'string'
        ? (ES.CreateOnePropObject('smallestUnit', roundToParam) as Exclude<typeof roundToParam, string>)
        : ES.GetOptionsObject(roundToParam);
    const roundingIncrement = ES.GetTemporalRoundingIncrementOption(roundTo);
    const roundingMode = ES.GetRoundingModeOption(roundTo, 'halfExpand');
    const smallestUnit = ES.GetTemporalUnitValuedOption(roundTo, 'smallestUnit', 'time', ES.REQUIRED, ['day']);
    const maximumIncrements = {
      day: 1,
      hour: 24,
      minute: 60,
      second: 60,
      millisecond: 1000,
      microsecond: 1000,
      nanosecond: 1000
    };
    const maximum = maximumIncrements[smallestUnit];
    const inclusive = maximum === 1;
    ES.ValidateTemporalRoundingIncrement(roundingIncrement, maximum, inclusive);

    const isoDateTime = GetSlot(this, ISO_DATE_TIME);
    if (roundingIncrement === 1 && smallestUnit === 'nanosecond') {
      return ES.CreateTemporalDateTime(isoDateTime, GetSlot(this, CALENDAR));
    }
    const result = ES.RoundISODateTime(isoDateTime, roundingIncrement, smallestUnit, roundingMode);

    return ES.CreateTemporalDateTime(result, GetSlot(this, CALENDAR));
  }
  equals(otherParam: Params['equals'][0]): Return['equals'] {
    ES.CheckReceiver(this, ES.IsTemporalDateTime);
    const other = ES.ToTemporalDateTime(otherParam);
    if (ES.CompareISODateTime(GetSlot(this, ISO_DATE_TIME), GetSlot(other, ISO_DATE_TIME)) !== 0) return false;
    return ES.CalendarEquals(GetSlot(this, CALENDAR), GetSlot(other, CALENDAR));
  }
  toString(options: Params['toString'][0] = undefined): string {
    ES.CheckReceiver(this, ES.IsTemporalDateTime);
    const resolvedOptions = ES.GetOptionsObject(options);
    const showCalendar = ES.GetTemporalShowCalendarNameOption(resolvedOptions);
    const digits = ES.GetTemporalFractionalSecondDigitsOption(resolvedOptions);
    const roundingMode = ES.GetRoundingModeOption(resolvedOptions, 'trunc');
    const smallestUnit = ES.GetTemporalUnitValuedOption(resolvedOptions, 'smallestUnit', 'time', undefined);
    if (smallestUnit === 'hour') throw new RangeError('smallestUnit must be a time unit other than "hour"');
    const { precision, unit, increment } = ES.ToSecondsStringPrecisionRecord(smallestUnit, digits);
    const result = ES.RoundISODateTime(GetSlot(this, ISO_DATE_TIME), increment, unit, roundingMode);
    ES.RejectDateTimeRange(result);
    return ES.ISODateTimeToString(result, GetSlot(this, CALENDAR), precision, showCalendar);
  }
  toJSON(): Return['toJSON'] {
    ES.CheckReceiver(this, ES.IsTemporalDateTime);
    return ES.ISODateTimeToString(GetSlot(this, ISO_DATE_TIME), GetSlot(this, CALENDAR), 'auto');
  }
  toLocaleString(
    locales: Params['toLocaleString'][0] = undefined,
    options: Params['toLocaleString'][1] = undefined
  ): string {
    ES.CheckReceiver(this, ES.IsTemporalDateTime);
    return new DateTimeFormat(locales, options).format(this);
  }
  valueOf(): never {
    ES.ValueOfThrows('PlainDateTime');
  }

  toZonedDateTime(
    temporalTimeZoneLike: Params['toZonedDateTime'][0],
    options: Params['toZonedDateTime'][1] = undefined
  ): Return['toZonedDateTime'] {
    ES.CheckReceiver(this, ES.IsTemporalDateTime);
    const timeZone = ES.ToTemporalTimeZoneIdentifier(temporalTimeZoneLike);
    const resolvedOptions = ES.GetOptionsObject(options);
    const disambiguation = ES.GetTemporalDisambiguationOption(resolvedOptions);
    const epochNs = ES.GetEpochNanosecondsFor(timeZone, GetSlot(this, ISO_DATE_TIME), disambiguation);
    return ES.CreateTemporalZonedDateTime(epochNs, timeZone, GetSlot(this, CALENDAR));
  }
  toPlainDate(): Return['toPlainDate'] {
    ES.CheckReceiver(this, ES.IsTemporalDateTime);
    return ES.CreateTemporalDate(GetSlot(this, ISO_DATE_TIME).isoDate, GetSlot(this, CALENDAR));
  }
  toPlainTime(): Return['toPlainTime'] {
    ES.CheckReceiver(this, ES.IsTemporalDateTime);
    return ES.CreateTemporalTime(GetSlot(this, ISO_DATE_TIME).time);
  }

  static from(item: Params['from'][0], options: Params['from'][1] = undefined): Return['from'] {
    return ES.ToTemporalDateTime(item, options);
  }
  static compare(oneParam: Params['compare'][0], twoParam: Params['compare'][1]): Return['compare'] {
    const one = ES.ToTemporalDateTime(oneParam);
    const two = ES.ToTemporalDateTime(twoParam);
    return ES.CompareISODateTime(GetSlot(one, ISO_DATE_TIME), GetSlot(two, ISO_DATE_TIME));
  }
  [Symbol.toStringTag]!: 'Temporal.PlainDateTime';
}

MakeIntrinsicClass(PlainDateTime, 'Temporal.PlainDateTime');

function getCalendarProperty<P extends keyof CalendarDateRecord>(
  dt: Temporal.PlainDateTime,
  prop: P
): CalendarDateRecord[P] {
  ES.CheckReceiver(dt, ES.IsTemporalDateTime);
  const isoDate = GetSlot(dt, ISO_DATE_TIME).isoDate;
  return ES.calendarImplForObj(dt).isoToDate(isoDate, { [prop]: true })[prop];
}

function getTimeProperty(dt: Temporal.PlainDateTime, prop: Temporal.TimeUnit) {
  ES.CheckReceiver(dt, ES.IsTemporalDateTime);
  return GetSlot(dt, ISO_DATE_TIME).time[prop];
}
