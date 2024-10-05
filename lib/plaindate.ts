import { TypeError as TypeErrorCtor } from './primordials';

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
import type { PlainDateParams as Params, PlainDateReturn as Return } from './internaltypes';

export class PlainDate implements Temporal.PlainDate {
  constructor(
    isoYearParam: Params['constructor'][0],
    isoMonthParam: Params['constructor'][1],
    isoDayParam: Params['constructor'][2],
    calendarParam: Params['constructor'][3] = 'iso8601'
  ) {
    const isoYear = ES.ToIntegerWithTruncation(isoYearParam);
    const isoMonth = ES.ToIntegerWithTruncation(isoMonthParam);
    const isoDay = ES.ToIntegerWithTruncation(isoDayParam);
    const calendar = ES.CanonicalizeCalendar(calendarParam === undefined ? 'iso8601' : ES.RequireString(calendarParam));

    ES.CreateTemporalDateSlots(this, isoYear, isoMonth, isoDay, calendar);
  }
  get calendarId(): Return['calendarId'] {
    if (!ES.IsTemporalDate(this)) throw new TypeErrorCtor('invalid receiver');
    return GetSlot(this, CALENDAR);
  }
  get era(): Return['era'] {
    if (!ES.IsTemporalDate(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { era: true }).era;
  }
  get eraYear(): Return['eraYear'] {
    if (!ES.IsTemporalDate(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { eraYear: true }).eraYear;
  }
  get year(): Return['year'] {
    if (!ES.IsTemporalDate(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { year: true }).year;
  }
  get month(): Return['month'] {
    if (!ES.IsTemporalDate(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { month: true }).month;
  }
  get monthCode(): Return['monthCode'] {
    if (!ES.IsTemporalDate(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { monthCode: true }).monthCode;
  }
  get day(): Return['day'] {
    if (!ES.IsTemporalDate(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { day: true }).day;
  }
  get dayOfWeek(): Return['dayOfWeek'] {
    if (!ES.IsTemporalDate(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { dayOfWeek: true }).dayOfWeek;
  }
  get dayOfYear(): Return['dayOfYear'] {
    if (!ES.IsTemporalDate(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { dayOfYear: true }).dayOfYear;
  }
  get weekOfYear(): Return['weekOfYear'] {
    if (!ES.IsTemporalDate(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { weekOfYear: true }).weekOfYear.week;
  }
  get yearOfWeek(): Return['weekOfYear'] {
    if (!ES.IsTemporalDate(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { weekOfYear: true }).weekOfYear.year;
  }
  get daysInWeek(): Return['daysInWeek'] {
    if (!ES.IsTemporalDate(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { daysInWeek: true }).daysInWeek;
  }
  get daysInMonth(): Return['daysInMonth'] {
    if (!ES.IsTemporalDate(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { daysInMonth: true }).daysInMonth;
  }
  get daysInYear(): Return['daysInYear'] {
    if (!ES.IsTemporalDate(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { daysInYear: true }).daysInYear;
  }
  get monthsInYear(): Return['monthsInYear'] {
    if (!ES.IsTemporalDate(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { monthsInYear: true }).monthsInYear;
  }
  get inLeapYear(): Return['inLeapYear'] {
    if (!ES.IsTemporalDate(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { inLeapYear: true }).inLeapYear;
  }
  with(temporalDateLike: Params['with'][0], options: Params['with'][1] = undefined): Return['with'] {
    if (!ES.IsTemporalDate(this)) throw new TypeErrorCtor('invalid receiver');
    if (!ES.IsObject(temporalDateLike)) {
      throw new TypeError('invalid argument');
    }
    ES.RejectTemporalLikeObject(temporalDateLike);

    const calendar = GetSlot(this, CALENDAR);
    let fields = ES.TemporalObjectToFields(this);
    const partialDate = ES.PrepareCalendarFields(
      calendar,
      temporalDateLike,
      ['day', 'month', 'monthCode', 'year'],
      [],
      'partial'
    );
    fields = ES.CalendarMergeFields(calendar, fields, partialDate);

    const overflow = ES.GetTemporalOverflowOption(ES.GetOptionsObject(options));
    const { year, month, day } = ES.CalendarDateFromFields(calendar, fields, overflow);
    return ES.CreateTemporalDate(year, month, day, calendar);
  }
  withCalendar(calendarParam: Params['withCalendar'][0]): Return['withCalendar'] {
    if (!ES.IsTemporalDate(this)) throw new TypeErrorCtor('invalid receiver');
    const calendar = ES.ToTemporalCalendarIdentifier(calendarParam);
    return ES.CreateTemporalDate(GetSlot(this, ISO_YEAR), GetSlot(this, ISO_MONTH), GetSlot(this, ISO_DAY), calendar);
  }
  add(temporalDurationLike: Params['add'][0], options: Params['add'][1] = undefined): Return['add'] {
    if (!ES.IsTemporalDate(this)) throw new TypeErrorCtor('invalid receiver');
    return ES.AddDurationToDate('add', this, temporalDurationLike, options);
  }
  subtract(
    temporalDurationLike: Params['subtract'][0],
    options: Params['subtract'][1] = undefined
  ): Return['subtract'] {
    if (!ES.IsTemporalDate(this)) throw new TypeErrorCtor('invalid receiver');
    return ES.AddDurationToDate('subtract', this, temporalDurationLike, options);
  }
  until(other: Params['until'][0], options: Params['until'][1] = undefined): Return['until'] {
    if (!ES.IsTemporalDate(this)) throw new TypeErrorCtor('invalid receiver');
    return ES.DifferenceTemporalPlainDate('until', this, other, options);
  }
  since(other: Params['since'][0], options: Params['since'][1] = undefined): Return['since'] {
    if (!ES.IsTemporalDate(this)) throw new TypeErrorCtor('invalid receiver');
    return ES.DifferenceTemporalPlainDate('since', this, other, options);
  }
  equals(otherParam: Params['equals'][0]): Return['equals'] {
    if (!ES.IsTemporalDate(this)) throw new TypeErrorCtor('invalid receiver');
    const other = ES.ToTemporalDate(otherParam);
    if (GetSlot(this, ISO_YEAR) !== GetSlot(other, ISO_YEAR)) return false;
    if (GetSlot(this, ISO_MONTH) !== GetSlot(other, ISO_MONTH)) return false;
    if (GetSlot(this, ISO_DAY) !== GetSlot(other, ISO_DAY)) return false;
    return ES.CalendarEquals(GetSlot(this, CALENDAR), GetSlot(other, CALENDAR));
  }
  toString(options: Params['toString'][0] = undefined): string {
    if (!ES.IsTemporalDate(this)) throw new TypeErrorCtor('invalid receiver');
    const resolvedOptions = ES.GetOptionsObject(options);
    const showCalendar = ES.GetTemporalShowCalendarNameOption(resolvedOptions);
    return ES.TemporalDateToString(this, showCalendar);
  }
  toJSON(): Return['toJSON'] {
    if (!ES.IsTemporalDate(this)) throw new TypeErrorCtor('invalid receiver');
    return ES.TemporalDateToString(this);
  }
  toLocaleString(
    locales: Params['toLocaleString'][0] = undefined,
    options: Params['toLocaleString'][1] = undefined
  ): string {
    if (!ES.IsTemporalDate(this)) throw new TypeErrorCtor('invalid receiver');
    return new DateTimeFormat(locales, options).format(this);
  }
  valueOf(): never {
    ES.ValueOfThrows('PlainDate');
  }
  toPlainDateTime(temporalTimeParam: Params['toPlainDateTime'][0] = undefined): Return['toPlainDateTime'] {
    if (!ES.IsTemporalDate(this)) throw new TypeErrorCtor('invalid receiver');
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
  toZonedDateTime(item: Params['toZonedDateTime'][0]): Return['toZonedDateTime'] {
    if (!ES.IsTemporalDate(this)) throw new TypeErrorCtor('invalid receiver');

    let timeZone, temporalTime;
    if (ES.IsObject(item)) {
      const timeZoneLike = item.timeZone;
      if (timeZoneLike === undefined) {
        timeZone = ES.ToTemporalTimeZoneIdentifier(item);
      } else {
        timeZone = ES.ToTemporalTimeZoneIdentifier(timeZoneLike);
        temporalTime = item.plainTime;
      }
    } else {
      timeZone = ES.ToTemporalTimeZoneIdentifier(item);
    }

    const isoDate = ES.TemporalObjectToISODateRecord(this);
    let epochNs;
    if (temporalTime === undefined) {
      epochNs = ES.GetStartOfDay(timeZone, isoDate);
    } else {
      temporalTime = ES.ToTemporalTime(temporalTime);
      const dt = ES.CombineISODateAndTimeRecord(isoDate, {
        hour: GetSlot(temporalTime, ISO_HOUR),
        minute: GetSlot(temporalTime, ISO_MINUTE),
        second: GetSlot(temporalTime, ISO_SECOND),
        millisecond: GetSlot(temporalTime, ISO_MILLISECOND),
        microsecond: GetSlot(temporalTime, ISO_MICROSECOND),
        nanosecond: GetSlot(temporalTime, ISO_NANOSECOND)
      });
      epochNs = ES.GetEpochNanosecondsFor(timeZone, dt, 'compatible');
    }
    return ES.CreateTemporalZonedDateTime(epochNs, timeZone, GetSlot(this, CALENDAR));
  }
  toPlainYearMonth(): Return['toPlainYearMonth'] {
    if (!ES.IsTemporalDate(this)) throw new TypeErrorCtor('invalid receiver');
    const calendar = GetSlot(this, CALENDAR);
    const fields = ES.TemporalObjectToFields(this);
    const { year, month, day } = ES.CalendarYearMonthFromFields(calendar, fields, 'constrain');
    return ES.CreateTemporalYearMonth(year, month, calendar, day);
  }
  toPlainMonthDay(): Return['toPlainMonthDay'] {
    if (!ES.IsTemporalDate(this)) throw new TypeErrorCtor('invalid receiver');
    const calendar = GetSlot(this, CALENDAR);
    const fields = ES.TemporalObjectToFields(this);
    const { year, month, day } = ES.CalendarMonthDayFromFields(calendar, fields, 'constrain');
    return ES.CreateTemporalMonthDay(month, day, calendar, year);
  }

  static from(item: Params['from'][0], options: Params['from'][1] = undefined): Return['from'] {
    return ES.ToTemporalDate(item, options);
  }
  static compare(oneParam: Params['compare'][0], twoParam: Params['compare'][1]): Return['compare'] {
    const one = ES.ToTemporalDate(oneParam);
    const two = ES.ToTemporalDate(twoParam);
    return ES.CompareISODate(
      { year: GetSlot(one, ISO_YEAR), month: GetSlot(one, ISO_MONTH), day: GetSlot(one, ISO_DAY) },
      { year: GetSlot(two, ISO_YEAR), month: GetSlot(two, ISO_MONTH), day: GetSlot(two, ISO_DAY) }
    );
  }
  [Symbol.toStringTag]!: 'Temporal.PlainDate';
}

MakeIntrinsicClass(PlainDate, 'Temporal.PlainDate');
