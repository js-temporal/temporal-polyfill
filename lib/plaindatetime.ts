import { RangeError as RangeErrorCtor, TypeError as TypeErrorCtor } from './primordials';

import * as ES from './ecmascript';
import { MakeIntrinsicClass } from './intrinsicclass';

import { CALENDAR, GetSlot, ISO_DATE_TIME } from './slots';
import type { Temporal } from '..';
import { DateTimeFormat } from './intl';
import type { PlainDateTimeParams as Params, PlainDateTimeReturn as Return } from './internaltypes';

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
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    return GetSlot(this, CALENDAR);
  }
  get year(): Return['year'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = GetSlot(this, ISO_DATE_TIME).isoDate;
    return ES.calendarImplForObj(this).isoToDate(isoDate, { year: true }).year;
  }
  get month(): Return['month'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = GetSlot(this, ISO_DATE_TIME).isoDate;
    return ES.calendarImplForObj(this).isoToDate(isoDate, { month: true }).month;
  }
  get monthCode(): Return['monthCode'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = GetSlot(this, ISO_DATE_TIME).isoDate;
    return ES.calendarImplForObj(this).isoToDate(isoDate, { monthCode: true }).monthCode;
  }
  get day(): Return['day'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = GetSlot(this, ISO_DATE_TIME).isoDate;
    return ES.calendarImplForObj(this).isoToDate(isoDate, { day: true }).day;
  }
  get hour(): Return['hour'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    return GetSlot(this, ISO_DATE_TIME).time.hour;
  }
  get minute(): Return['minute'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    return GetSlot(this, ISO_DATE_TIME).time.minute;
  }
  get second(): Return['second'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    return GetSlot(this, ISO_DATE_TIME).time.second;
  }
  get millisecond(): Return['millisecond'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    return GetSlot(this, ISO_DATE_TIME).time.millisecond;
  }
  get microsecond(): Return['microsecond'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    return GetSlot(this, ISO_DATE_TIME).time.microsecond;
  }
  get nanosecond(): Return['nanosecond'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    return GetSlot(this, ISO_DATE_TIME).time.nanosecond;
  }
  get era(): Return['era'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = GetSlot(this, ISO_DATE_TIME).isoDate;
    return ES.calendarImplForObj(this).isoToDate(isoDate, { era: true }).era;
  }
  get eraYear(): Return['eraYear'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = GetSlot(this, ISO_DATE_TIME).isoDate;
    return ES.calendarImplForObj(this).isoToDate(isoDate, { eraYear: true }).eraYear;
  }
  get dayOfWeek(): Return['dayOfWeek'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = GetSlot(this, ISO_DATE_TIME).isoDate;
    return ES.calendarImplForObj(this).isoToDate(isoDate, { dayOfWeek: true }).dayOfWeek;
  }
  get dayOfYear(): Return['dayOfYear'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = GetSlot(this, ISO_DATE_TIME).isoDate;
    return ES.calendarImplForObj(this).isoToDate(isoDate, { dayOfYear: true }).dayOfYear;
  }
  get weekOfYear(): Return['weekOfYear'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = GetSlot(this, ISO_DATE_TIME).isoDate;
    return ES.calendarImplForObj(this).isoToDate(isoDate, { weekOfYear: true }).weekOfYear.week;
  }
  get yearOfWeek(): Return['yearOfWeek'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = GetSlot(this, ISO_DATE_TIME).isoDate;
    return ES.calendarImplForObj(this).isoToDate(isoDate, { weekOfYear: true }).weekOfYear.year;
  }
  get daysInWeek(): Return['daysInWeek'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = GetSlot(this, ISO_DATE_TIME).isoDate;
    return ES.calendarImplForObj(this).isoToDate(isoDate, { daysInWeek: true }).daysInWeek;
  }
  get daysInYear(): Return['daysInYear'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = GetSlot(this, ISO_DATE_TIME).isoDate;
    return ES.calendarImplForObj(this).isoToDate(isoDate, { daysInYear: true }).daysInYear;
  }
  get daysInMonth(): Return['daysInMonth'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = GetSlot(this, ISO_DATE_TIME).isoDate;
    return ES.calendarImplForObj(this).isoToDate(isoDate, { daysInMonth: true }).daysInMonth;
  }
  get monthsInYear(): Return['monthsInYear'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = GetSlot(this, ISO_DATE_TIME).isoDate;
    return ES.calendarImplForObj(this).isoToDate(isoDate, { monthsInYear: true }).monthsInYear;
  }
  get inLeapYear(): Return['inLeapYear'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = GetSlot(this, ISO_DATE_TIME).isoDate;
    return ES.calendarImplForObj(this).isoToDate(isoDate, { inLeapYear: true }).inLeapYear;
  }
  with(temporalDateTimeLike: Params['with'][0], options: Params['with'][1] = undefined): Return['with'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    if (!ES.IsObject(temporalDateTimeLike)) {
      throw new TypeError('invalid argument');
    }
    ES.RejectTemporalLikeObject(temporalDateTimeLike);

    const calendar = GetSlot(this, CALENDAR);
    const isoDateTime = GetSlot(this, ISO_DATE_TIME);
    let fields = {
      ...ES.ISODateToFields(calendar, isoDateTime.isoDate),
      hour: isoDateTime.time.hour,
      minute: isoDateTime.time.minute,
      second: isoDateTime.time.second,
      millisecond: isoDateTime.time.millisecond,
      microsecond: isoDateTime.time.microsecond,
      nanosecond: isoDateTime.time.nanosecond
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
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const time = ES.ToTimeRecordOrMidnight(temporalTime);
    const isoDateTime = ES.CombineISODateAndTimeRecord(GetSlot(this, ISO_DATE_TIME).isoDate, time);
    return ES.CreateTemporalDateTime(isoDateTime, GetSlot(this, CALENDAR));
  }
  withCalendar(calendarParam: Params['withCalendar'][0]): Return['withCalendar'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const calendar = ES.ToTemporalCalendarIdentifier(calendarParam);
    return ES.CreateTemporalDateTime(GetSlot(this, ISO_DATE_TIME), calendar);
  }
  add(temporalDurationLike: Params['add'][0], options: Params['add'][1] = undefined): Return['add'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    return ES.AddDurationToDateTime('add', this, temporalDurationLike, options);
  }
  subtract(
    temporalDurationLike: Params['subtract'][0],
    options: Params['subtract'][1] = undefined
  ): Return['subtract'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    return ES.AddDurationToDateTime('subtract', this, temporalDurationLike, options);
  }
  until(other: Params['until'][0], options: Params['until'][1] = undefined): Return['until'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    return ES.DifferenceTemporalPlainDateTime('until', this, other, options);
  }
  since(other: Params['since'][0], options: Params['since'][1] = undefined): Return['since'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    return ES.DifferenceTemporalPlainDateTime('since', this, other, options);
  }
  round(roundToParam: Params['round'][0]): Return['round'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    if (roundToParam === undefined) throw new TypeErrorCtor('options parameter is required');
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
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const other = ES.ToTemporalDateTime(otherParam);
    if (ES.CompareISODateTime(GetSlot(this, ISO_DATE_TIME), GetSlot(other, ISO_DATE_TIME)) !== 0) return false;
    return ES.CalendarEquals(GetSlot(this, CALENDAR), GetSlot(other, CALENDAR));
  }
  toString(options: Params['toString'][0] = undefined): string {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const resolvedOptions = ES.GetOptionsObject(options);
    const showCalendar = ES.GetTemporalShowCalendarNameOption(resolvedOptions);
    const digits = ES.GetTemporalFractionalSecondDigitsOption(resolvedOptions);
    const roundingMode = ES.GetRoundingModeOption(resolvedOptions, 'trunc');
    const smallestUnit = ES.GetTemporalUnitValuedOption(resolvedOptions, 'smallestUnit', 'time', undefined);
    if (smallestUnit === 'hour') throw new RangeErrorCtor('smallestUnit must be a time unit other than "hour"');
    const { precision, unit, increment } = ES.ToSecondsStringPrecisionRecord(smallestUnit, digits);
    const result = ES.RoundISODateTime(GetSlot(this, ISO_DATE_TIME), increment, unit, roundingMode);
    ES.RejectDateTimeRange(result);
    return ES.ISODateTimeToString(result, GetSlot(this, CALENDAR), precision, showCalendar);
  }
  toJSON(): Return['toJSON'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    return ES.ISODateTimeToString(GetSlot(this, ISO_DATE_TIME), GetSlot(this, CALENDAR), 'auto');
  }
  toLocaleString(
    locales: Params['toLocaleString'][0] = undefined,
    options: Params['toLocaleString'][1] = undefined
  ): string {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    return new DateTimeFormat(locales, options).format(this);
  }
  valueOf(): never {
    ES.ValueOfThrows('PlainDateTime');
  }

  toZonedDateTime(
    temporalTimeZoneLike: Params['toZonedDateTime'][0],
    options: Params['toZonedDateTime'][1] = undefined
  ): Return['toZonedDateTime'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const timeZone = ES.ToTemporalTimeZoneIdentifier(temporalTimeZoneLike);
    const resolvedOptions = ES.GetOptionsObject(options);
    const disambiguation = ES.GetTemporalDisambiguationOption(resolvedOptions);
    const epochNs = ES.GetEpochNanosecondsFor(timeZone, GetSlot(this, ISO_DATE_TIME), disambiguation);
    return ES.CreateTemporalZonedDateTime(epochNs, timeZone, GetSlot(this, CALENDAR));
  }
  toPlainDate(): Return['toPlainDate'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    return ES.CreateTemporalDate(GetSlot(this, ISO_DATE_TIME).isoDate, GetSlot(this, CALENDAR));
  }
  toPlainTime(): Return['toPlainTime'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
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
