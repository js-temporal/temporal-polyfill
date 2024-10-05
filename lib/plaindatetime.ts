import { RangeError as RangeErrorCtor, TypeError as TypeErrorCtor } from './primordials';

import * as ES from './ecmascript';
import { MakeIntrinsicClass } from './intrinsicclass';

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
  GetSlot
} from './slots';
import type { Temporal } from '..';
import { DateTimeFormat } from './intl';
import type { BuiltinCalendarId, PlainDateTimeParams as Params, PlainDateTimeReturn as Return } from './internaltypes';

export class PlainDateTime implements Temporal.PlainDateTime {
  constructor(
    isoYearParam: Params['constructor'][0],
    isoMonthParam: Params['constructor'][1],
    isoDayParam: Params['constructor'][2],
    hourParam: Params['constructor'][3] = 0,
    minuteParam: Params['constructor'][4] = 0,
    secondParam: Params['constructor'][5] = 0,
    millisecondParam: Params['constructor'][6] = 0,
    microsecondParam: Params['constructor'][7] = 0,
    nanosecondParam: Params['constructor'][8] = 0,
    calendarParam: Params['constructor'][9] = 'iso8601'
  ) {
    const isoYear = ES.ToIntegerWithTruncation(isoYearParam);
    const isoMonth = ES.ToIntegerWithTruncation(isoMonthParam);
    const isoDay = ES.ToIntegerWithTruncation(isoDayParam);
    const hour = hourParam === undefined ? 0 : ES.ToIntegerWithTruncation(hourParam);
    const minute = minuteParam === undefined ? 0 : ES.ToIntegerWithTruncation(minuteParam);
    const second = secondParam === undefined ? 0 : ES.ToIntegerWithTruncation(secondParam);
    const millisecond = millisecondParam === undefined ? 0 : ES.ToIntegerWithTruncation(millisecondParam);
    const microsecond = microsecondParam === undefined ? 0 : ES.ToIntegerWithTruncation(microsecondParam);
    const nanosecond = nanosecondParam === undefined ? 0 : ES.ToIntegerWithTruncation(nanosecondParam);
    const calendar = ES.CanonicalizeCalendar(calendarParam === undefined ? 'iso8601' : ES.RequireString(calendarParam));
    ES.uncheckedAssertNarrowedType<BuiltinCalendarId>(calendar, 'lowercased and canonicalized');

    ES.CreateTemporalDateTimeSlots(
      this,
      isoYear,
      isoMonth,
      isoDay,
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond,
      calendar
    );
  }
  get calendarId(): Return['calendarId'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    return GetSlot(this, CALENDAR);
  }
  get year(): Return['year'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { year: true }).year;
  }
  get month(): Return['month'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { month: true }).month;
  }
  get monthCode(): Return['monthCode'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { monthCode: true }).monthCode;
  }
  get day(): Return['day'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { day: true }).day;
  }
  get hour(): Return['hour'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    return GetSlot(this, ISO_HOUR);
  }
  get minute(): Return['minute'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    return GetSlot(this, ISO_MINUTE);
  }
  get second(): Return['second'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    return GetSlot(this, ISO_SECOND);
  }
  get millisecond(): Return['millisecond'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    return GetSlot(this, ISO_MILLISECOND);
  }
  get microsecond(): Return['microsecond'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    return GetSlot(this, ISO_MICROSECOND);
  }
  get nanosecond(): Return['nanosecond'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    return GetSlot(this, ISO_NANOSECOND);
  }
  get era(): Return['era'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { era: true }).era;
  }
  get eraYear(): Return['eraYear'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { eraYear: true }).eraYear;
  }
  get dayOfWeek(): Return['dayOfWeek'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { dayOfWeek: true }).dayOfWeek;
  }
  get dayOfYear(): Return['dayOfYear'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { dayOfYear: true }).dayOfYear;
  }
  get weekOfYear(): Return['weekOfYear'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { weekOfYear: true }).weekOfYear.week;
  }
  get yearOfWeek(): Return['yearOfWeek'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { weekOfYear: true }).weekOfYear.year;
  }
  get daysInWeek(): Return['daysInWeek'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { daysInWeek: true }).daysInWeek;
  }
  get daysInYear(): Return['daysInYear'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { daysInYear: true }).daysInYear;
  }
  get daysInMonth(): Return['daysInMonth'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { daysInMonth: true }).daysInMonth;
  }
  get monthsInYear(): Return['monthsInYear'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { monthsInYear: true }).monthsInYear;
  }
  get inLeapYear(): Return['inLeapYear'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { inLeapYear: true }).inLeapYear;
  }
  with(temporalDateTimeLike: Params['with'][0], options: Params['with'][1] = undefined): Return['with'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    if (!ES.IsObject(temporalDateTimeLike)) {
      throw new TypeError('invalid argument');
    }
    ES.RejectTemporalLikeObject(temporalDateTimeLike);

    const calendar = GetSlot(this, CALENDAR);
    let fields = {
      ...ES.TemporalObjectToFields(this),
      hour: GetSlot(this, ISO_HOUR),
      minute: GetSlot(this, ISO_MINUTE),
      second: GetSlot(this, ISO_SECOND),
      millisecond: GetSlot(this, ISO_MILLISECOND),
      microsecond: GetSlot(this, ISO_MICROSECOND),
      nanosecond: GetSlot(this, ISO_NANOSECOND)
    };
    const partialDateTime = ES.PrepareCalendarFields(
      calendar,
      temporalDateTimeLike,
      ['day', 'month', 'monthCode', 'year'],
      ['hour', 'microsecond', 'millisecond', 'minute', 'nanosecond', 'second'],
      'partial'
    );
    fields = ES.CalendarMergeFields(calendar, fields, partialDateTime);

    const overflow = ES.GetTemporalOverflowOption(ES.GetOptionsObject(options));
    const {
      year,
      month,
      day,
      time: { hour, minute, second, millisecond, microsecond, nanosecond }
    } = ES.InterpretTemporalDateTimeFields(calendar, fields, overflow);

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
  withPlainTime(temporalTimeParam: Params['withPlainTime'][0] = undefined): Return['withPlainTime'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const temporalTime = ES.ToTemporalTimeOrMidnight(temporalTimeParam);
    return ES.CreateTemporalDateTime(
      GetSlot(this, ISO_YEAR),
      GetSlot(this, ISO_MONTH),
      GetSlot(this, ISO_DAY),
      GetSlot(temporalTime, ISO_HOUR),
      GetSlot(temporalTime, ISO_MINUTE),
      GetSlot(temporalTime, ISO_SECOND),
      GetSlot(temporalTime, ISO_MILLISECOND),
      GetSlot(temporalTime, ISO_MICROSECOND),
      GetSlot(temporalTime, ISO_NANOSECOND),
      GetSlot(this, CALENDAR)
    );
  }
  withCalendar(calendarParam: Params['withCalendar'][0]): Return['withCalendar'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const calendar = ES.ToTemporalCalendarIdentifier(calendarParam);
    return ES.CreateTemporalDateTime(
      GetSlot(this, ISO_YEAR),
      GetSlot(this, ISO_MONTH),
      GetSlot(this, ISO_DAY),
      GetSlot(this, ISO_HOUR),
      GetSlot(this, ISO_MINUTE),
      GetSlot(this, ISO_SECOND),
      GetSlot(this, ISO_MILLISECOND),
      GetSlot(this, ISO_MICROSECOND),
      GetSlot(this, ISO_NANOSECOND),
      calendar
    );
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

    const isoDateTime = ES.PlainDateTimeToISODateTimeRecord(this);
    if (roundingIncrement === 1 && smallestUnit === 'nanosecond') {
      return ES.CreateTemporalDateTime(
        isoDateTime.year,
        isoDateTime.month,
        isoDateTime.day,
        isoDateTime.hour,
        isoDateTime.minute,
        isoDateTime.second,
        isoDateTime.millisecond,
        isoDateTime.microsecond,
        isoDateTime.nanosecond,
        GetSlot(this, CALENDAR)
      );
    }
    const result = ES.RoundISODateTime(isoDateTime, roundingIncrement, smallestUnit, roundingMode);

    return ES.CreateTemporalDateTime(
      result.year,
      result.month,
      result.day,
      result.hour,
      result.minute,
      result.second,
      result.millisecond,
      result.microsecond,
      result.nanosecond,
      GetSlot(this, CALENDAR)
    );
  }
  equals(otherParam: Params['equals'][0]): Return['equals'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const other = ES.ToTemporalDateTime(otherParam);
    if (
      ES.CompareISODateTime(
        GetSlot(this, ISO_YEAR),
        GetSlot(this, ISO_MONTH),
        GetSlot(this, ISO_DAY),
        GetSlot(this, ISO_HOUR),
        GetSlot(this, ISO_MINUTE),
        GetSlot(this, ISO_SECOND),
        GetSlot(this, ISO_MILLISECOND),
        GetSlot(this, ISO_MICROSECOND),
        GetSlot(this, ISO_NANOSECOND),
        GetSlot(other, ISO_YEAR),
        GetSlot(other, ISO_MONTH),
        GetSlot(other, ISO_DAY),
        GetSlot(other, ISO_HOUR),
        GetSlot(other, ISO_MINUTE),
        GetSlot(other, ISO_SECOND),
        GetSlot(other, ISO_MILLISECOND),
        GetSlot(other, ISO_MICROSECOND),
        GetSlot(other, ISO_NANOSECOND)
      ) !== 0
    ) {
      return false;
    }
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
    const result = ES.RoundISODateTime(ES.PlainDateTimeToISODateTimeRecord(this), increment, unit, roundingMode);
    ES.RejectDateTimeRange(result);
    return ES.TemporalDateTimeToString(result, GetSlot(this, CALENDAR), precision, showCalendar);
  }
  toJSON(): Return['toJSON'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDateTime = {
      year: GetSlot(this, ISO_YEAR),
      month: GetSlot(this, ISO_MONTH),
      day: GetSlot(this, ISO_DAY),
      hour: GetSlot(this, ISO_HOUR),
      minute: GetSlot(this, ISO_MINUTE),
      second: GetSlot(this, ISO_SECOND),
      millisecond: GetSlot(this, ISO_MILLISECOND),
      microsecond: GetSlot(this, ISO_MICROSECOND),
      nanosecond: GetSlot(this, ISO_NANOSECOND)
    };
    return ES.TemporalDateTimeToString(isoDateTime, GetSlot(this, CALENDAR), 'auto');
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
    const isoDateTime = ES.PlainDateTimeToISODateTimeRecord(this);
    const epochNs = ES.GetEpochNanosecondsFor(timeZone, isoDateTime, disambiguation);
    return ES.CreateTemporalZonedDateTime(epochNs, timeZone, GetSlot(this, CALENDAR));
  }
  toPlainDate(): Return['toPlainDate'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    return ES.TemporalDateTimeToDate(this);
  }
  toPlainTime(): Return['toPlainTime'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeErrorCtor('invalid receiver');
    return ES.TemporalDateTimeToTime(this);
  }

  static from(item: Params['from'][0], options: Params['from'][1] = undefined): Return['from'] {
    return ES.ToTemporalDateTime(item, options);
  }
  static compare(oneParam: Params['compare'][0], twoParam: Params['compare'][1]): Return['compare'] {
    const one = ES.ToTemporalDateTime(oneParam);
    const two = ES.ToTemporalDateTime(twoParam);
    return ES.CompareISODateTime(
      GetSlot(one, ISO_YEAR),
      GetSlot(one, ISO_MONTH),
      GetSlot(one, ISO_DAY),
      GetSlot(one, ISO_HOUR),
      GetSlot(one, ISO_MINUTE),
      GetSlot(one, ISO_SECOND),
      GetSlot(one, ISO_MILLISECOND),
      GetSlot(one, ISO_MICROSECOND),
      GetSlot(one, ISO_NANOSECOND),
      GetSlot(two, ISO_YEAR),
      GetSlot(two, ISO_MONTH),
      GetSlot(two, ISO_DAY),
      GetSlot(two, ISO_HOUR),
      GetSlot(two, ISO_MINUTE),
      GetSlot(two, ISO_SECOND),
      GetSlot(two, ISO_MILLISECOND),
      GetSlot(two, ISO_MICROSECOND),
      GetSlot(two, ISO_NANOSECOND)
    );
  }
  [Symbol.toStringTag]!: 'Temporal.PlainDateTime';
}

MakeIntrinsicClass(PlainDateTime, 'Temporal.PlainDateTime');
