import * as ES from './ecmascript';
import { MakeIntrinsicClass } from './intrinsicclass';
import { CalendarMethodRecord, TimeZoneMethodRecord } from './methodrecord';

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
  GetSlot
} from './slots';
import type { Temporal } from '..';
import { DateTimeFormat } from './intl';
import type { PlainDateTimeParams as Params, PlainDateTimeReturn as Return } from './internaltypes';

const ArrayPrototypePush = Array.prototype.push;

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
    const calendar = ES.ToTemporalCalendarSlotValue(calendarParam);

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
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
    return ES.ToTemporalCalendarIdentifier(GetSlot(this, CALENDAR));
  }
  get year(): Return['year'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
    return ES.CalendarYear(GetSlot(this, CALENDAR), this);
  }
  get month(): Return['month'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
    return ES.CalendarMonth(GetSlot(this, CALENDAR), this);
  }
  get monthCode(): Return['monthCode'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
    return ES.CalendarMonthCode(GetSlot(this, CALENDAR), this);
  }
  get day(): Return['day'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
    const calendarRec = new CalendarMethodRecord(GetSlot(this, CALENDAR), ['day']);
    return ES.CalendarDay(calendarRec, this);
  }
  get hour(): Return['hour'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
    return GetSlot(this, ISO_HOUR);
  }
  get minute(): Return['minute'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
    return GetSlot(this, ISO_MINUTE);
  }
  get second(): Return['second'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
    return GetSlot(this, ISO_SECOND);
  }
  get millisecond(): Return['millisecond'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
    return GetSlot(this, ISO_MILLISECOND);
  }
  get microsecond(): Return['microsecond'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
    return GetSlot(this, ISO_MICROSECOND);
  }
  get nanosecond(): Return['nanosecond'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
    return GetSlot(this, ISO_NANOSECOND);
  }
  get era(): Return['era'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
    return ES.CalendarEra(GetSlot(this, CALENDAR), this);
  }
  get eraYear(): Return['eraYear'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
    return ES.CalendarEraYear(GetSlot(this, CALENDAR), this);
  }
  get dayOfWeek(): Return['dayOfWeek'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
    return ES.CalendarDayOfWeek(GetSlot(this, CALENDAR), this);
  }
  get dayOfYear(): Return['dayOfYear'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
    return ES.CalendarDayOfYear(GetSlot(this, CALENDAR), this);
  }
  get weekOfYear(): Return['weekOfYear'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
    return ES.CalendarWeekOfYear(GetSlot(this, CALENDAR), this);
  }
  get yearOfWeek(): Return['yearOfWeek'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
    return ES.CalendarYearOfWeek(GetSlot(this, CALENDAR), this);
  }
  get daysInWeek(): Return['daysInWeek'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
    return ES.CalendarDaysInWeek(GetSlot(this, CALENDAR), this);
  }
  get daysInYear(): Return['daysInYear'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
    return ES.CalendarDaysInYear(GetSlot(this, CALENDAR), this);
  }
  get daysInMonth(): Return['daysInMonth'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
    return ES.CalendarDaysInMonth(GetSlot(this, CALENDAR), this);
  }
  get monthsInYear(): Return['monthsInYear'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
    return ES.CalendarMonthsInYear(GetSlot(this, CALENDAR), this);
  }
  get inLeapYear(): Return['inLeapYear'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
    return ES.CalendarInLeapYear(GetSlot(this, CALENDAR), this);
  }
  with(temporalDateTimeLike: Params['with'][0], options: Params['with'][1] = undefined): Return['with'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
    if (!ES.IsObject(temporalDateTimeLike)) {
      throw new TypeError('invalid argument');
    }
    ES.RejectTemporalLikeObject(temporalDateTimeLike);

    const resolvedOptions = ES.SnapshotOwnProperties(ES.GetOptionsObject(options), null);
    const calendarRec = new CalendarMethodRecord(GetSlot(this, CALENDAR), ['dateFromFields', 'fields', 'mergeFields']);
    let { fields, fieldNames } = ES.PrepareCalendarFieldsAndFieldNames(calendarRec, this, [
      'day',
      'month',
      'monthCode',
      'year'
    ]);
    fields.hour = GetSlot(this, ISO_HOUR);
    fields.minute = GetSlot(this, ISO_MINUTE);
    fields.second = GetSlot(this, ISO_SECOND);
    fields.millisecond = GetSlot(this, ISO_MILLISECOND);
    fields.microsecond = GetSlot(this, ISO_MICROSECOND);
    fields.nanosecond = GetSlot(this, ISO_NANOSECOND);
    ES.Call(ArrayPrototypePush, fieldNames, ['hour', 'microsecond', 'millisecond', 'minute', 'nanosecond', 'second']);
    const partialDateTime = ES.PrepareTemporalFields(temporalDateTimeLike, fieldNames, 'partial');
    fields = ES.CalendarMergeFields(calendarRec, fields, partialDateTime);
    fields = ES.PrepareTemporalFields(fields, fieldNames, []);
    const { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } =
      ES.InterpretTemporalDateTimeFields(calendarRec, fields, resolvedOptions);

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
      calendarRec.receiver
    );
  }
  withPlainTime(temporalTimeParam: Params['withPlainTime'][0] = undefined): Return['withPlainTime'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
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
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
    const calendar = ES.ToTemporalCalendarSlotValue(calendarParam);
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
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
    return ES.AddDurationToOrSubtractDurationFromPlainDateTime('add', this, temporalDurationLike, options);
  }
  subtract(
    temporalDurationLike: Params['subtract'][0],
    options: Params['subtract'][1] = undefined
  ): Return['subtract'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
    return ES.AddDurationToOrSubtractDurationFromPlainDateTime('subtract', this, temporalDurationLike, options);
  }
  until(other: Params['until'][0], options: Params['until'][1] = undefined): Return['until'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
    return ES.DifferenceTemporalPlainDateTime('until', this, other, options);
  }
  since(other: Params['since'][0], options: Params['since'][1] = undefined): Return['since'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
    return ES.DifferenceTemporalPlainDateTime('since', this, other, options);
  }
  round(roundToParam: Params['round'][0]): Return['round'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
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

    let year = GetSlot(this, ISO_YEAR);
    let month = GetSlot(this, ISO_MONTH);
    let day = GetSlot(this, ISO_DAY);
    let hour = GetSlot(this, ISO_HOUR);
    let minute = GetSlot(this, ISO_MINUTE);
    let second = GetSlot(this, ISO_SECOND);
    let millisecond = GetSlot(this, ISO_MILLISECOND);
    let microsecond = GetSlot(this, ISO_MICROSECOND);
    let nanosecond = GetSlot(this, ISO_NANOSECOND);
    if (roundingIncrement === 1 && smallestUnit === 'nanosecond') {
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
        GetSlot(this, CALENDAR)
      );
    }
    ({ year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } = ES.RoundISODateTime(
      year,
      month,
      day,
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
      GetSlot(this, CALENDAR)
    );
  }
  equals(otherParam: Params['equals'][0]): Return['equals'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
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
  toString(optionsParam: Params['toString'][0] = undefined): string {
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
    const options = ES.GetOptionsObject(optionsParam);
    const showCalendar = ES.GetTemporalShowCalendarNameOption(options);
    const digits = ES.GetTemporalFractionalSecondDigitsOption(options);
    const roundingMode = ES.GetRoundingModeOption(options, 'trunc');
    const smallestUnit = ES.GetTemporalUnitValuedOption(options, 'smallestUnit', 'time', undefined);
    if (smallestUnit === 'hour') throw new RangeError('smallestUnit must be a time unit other than "hour"');
    const { precision, unit, increment } = ES.ToSecondsStringPrecisionRecord(smallestUnit, digits);
    return ES.TemporalDateTimeToString(this, precision, showCalendar, { unit, increment, roundingMode });
  }
  toJSON(): Return['toJSON'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
    return ES.TemporalDateTimeToString(this, 'auto');
  }
  toLocaleString(
    locales: Params['toLocaleString'][0] = undefined,
    options: Params['toLocaleString'][1] = undefined
  ): string {
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
    return new DateTimeFormat(locales, options).format(this);
  }
  valueOf(): never {
    ES.ValueOfThrows('PlainDateTime');
  }

  toZonedDateTime(
    temporalTimeZoneLike: Params['toZonedDateTime'][0],
    optionsParam: Params['toZonedDateTime'][1] = undefined
  ): Return['toZonedDateTime'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
    const timeZone = ES.ToTemporalTimeZoneSlotValue(temporalTimeZoneLike);
    const options = ES.GetOptionsObject(optionsParam);
    const disambiguation = ES.GetTemporalDisambiguationOption(options);
    const timeZoneRec = new TimeZoneMethodRecord(timeZone, ['getOffsetNanosecondsFor', 'getPossibleInstantsFor']);
    const instant = ES.GetInstantFor(timeZoneRec, this, disambiguation);
    return ES.CreateTemporalZonedDateTime(GetSlot(instant, EPOCHNANOSECONDS), timeZone, GetSlot(this, CALENDAR));
  }
  toPlainDate(): Return['toPlainDate'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
    return ES.TemporalDateTimeToDate(this);
  }
  toPlainTime(): Return['toPlainTime'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
    return ES.TemporalDateTimeToTime(this);
  }
  getISOFields(): Return['getISOFields'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
    return {
      calendar: GetSlot(this, CALENDAR),
      isoDay: GetSlot(this, ISO_DAY),
      isoHour: GetSlot(this, ISO_HOUR),
      isoMicrosecond: GetSlot(this, ISO_MICROSECOND),
      isoMillisecond: GetSlot(this, ISO_MILLISECOND),
      isoMinute: GetSlot(this, ISO_MINUTE),
      isoMonth: GetSlot(this, ISO_MONTH),
      isoNanosecond: GetSlot(this, ISO_NANOSECOND),
      isoSecond: GetSlot(this, ISO_SECOND),
      isoYear: GetSlot(this, ISO_YEAR)
    };
  }
  getCalendar(): Return['getCalendar'] {
    if (!ES.IsTemporalDateTime(this)) throw new TypeError('invalid receiver');
    return ES.ToTemporalCalendarObject(GetSlot(this, CALENDAR));
  }

  static from(item: Params['from'][0], optionsParam: Params['from'][1] = undefined): Return['from'] {
    const options = ES.GetOptionsObject(optionsParam);
    if (ES.IsTemporalDateTime(item)) {
      ES.GetTemporalOverflowOption(options); // validate and ignore
      return ES.CreateTemporalDateTime(
        GetSlot(item, ISO_YEAR),
        GetSlot(item, ISO_MONTH),
        GetSlot(item, ISO_DAY),
        GetSlot(item, ISO_HOUR),
        GetSlot(item, ISO_MINUTE),
        GetSlot(item, ISO_SECOND),
        GetSlot(item, ISO_MILLISECOND),
        GetSlot(item, ISO_MICROSECOND),
        GetSlot(item, ISO_NANOSECOND),
        GetSlot(item, CALENDAR)
      );
    }
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
