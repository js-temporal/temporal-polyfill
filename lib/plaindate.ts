import * as ES from './ecmascript';
import { MakeIntrinsicClass } from './intrinsicclass';
import { CALENDAR, GetSlot, ISO_DATE, TIME } from './slots';
import type { Temporal } from '..';
import { DateTimeFormat } from './intl';
import type { CalendarDateRecord, PlainDateParams as Params, PlainDateReturn as Return } from './internaltypes';

export class PlainDate implements Temporal.PlainDate {
  constructor(
    isoYear: Params['constructor'][0],
    isoMonth: Params['constructor'][1],
    isoDay: Params['constructor'][2],
    calendarParam: Params['constructor'][3] = 'iso8601'
  ) {
    const year = ES.ToIntegerWithTruncation(isoYear);
    const month = ES.ToIntegerWithTruncation(isoMonth);
    const day = ES.ToIntegerWithTruncation(isoDay);
    const calendar = ES.CanonicalizeCalendar(calendarParam === undefined ? 'iso8601' : ES.RequireString(calendarParam));
    ES.RejectISODate(year, month, day);

    ES.CreateTemporalDateSlots(this, { year, month, day }, calendar);
  }
  get calendarId(): Return['calendarId'] {
    ES.CheckReceiver(this, ES.IsTemporalDate);
    return GetSlot(this, CALENDAR);
  }
  get era(): Return['era'] {
    return getCalendarProperty(this, 'era');
  }
  get eraYear(): Return['eraYear'] {
    return getCalendarProperty(this, 'eraYear');
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
  get daysInMonth(): Return['daysInMonth'] {
    return getCalendarProperty(this, 'daysInMonth');
  }
  get daysInYear(): Return['daysInYear'] {
    return getCalendarProperty(this, 'daysInYear');
  }
  get monthsInYear(): Return['monthsInYear'] {
    return getCalendarProperty(this, 'monthsInYear');
  }
  get inLeapYear(): Return['inLeapYear'] {
    return getCalendarProperty(this, 'inLeapYear');
  }
  with(temporalDateLike: Params['with'][0], options: Params['with'][1] = undefined): Return['with'] {
    ES.CheckReceiver(this, ES.IsTemporalDate);
    if (!ES.IsObject(temporalDateLike)) {
      throw new TypeError('invalid argument');
    }
    ES.RejectTemporalLikeObject(temporalDateLike);

    const calendar = GetSlot(this, CALENDAR);
    let fields = ES.ISODateToFields(calendar, GetSlot(this, ISO_DATE));
    const partialDate = ES.PrepareCalendarFields(
      calendar,
      temporalDateLike,
      ['year', 'month', 'monthCode', 'day'],
      [],
      'partial'
    );
    fields = ES.CalendarMergeFields(calendar, fields, partialDate);

    const overflow = ES.GetTemporalOverflowOption(ES.GetOptionsObject(options));
    const isoDate = ES.CalendarDateFromFields(calendar, fields, overflow);
    return ES.CreateTemporalDate(isoDate, calendar);
  }
  withCalendar(calendarParam: Params['withCalendar'][0]): Return['withCalendar'] {
    ES.CheckReceiver(this, ES.IsTemporalDate);
    const calendar = ES.ToTemporalCalendarIdentifier(calendarParam);
    return ES.CreateTemporalDate(GetSlot(this, ISO_DATE), calendar);
  }
  add(temporalDurationLike: Params['add'][0], options: Params['add'][1] = undefined): Return['add'] {
    ES.CheckReceiver(this, ES.IsTemporalDate);
    return ES.AddDurationToDate('add', this, temporalDurationLike, options);
  }
  subtract(
    temporalDurationLike: Params['subtract'][0],
    options: Params['subtract'][1] = undefined
  ): Return['subtract'] {
    ES.CheckReceiver(this, ES.IsTemporalDate);
    return ES.AddDurationToDate('subtract', this, temporalDurationLike, options);
  }
  until(other: Params['until'][0], options: Params['until'][1] = undefined): Return['until'] {
    ES.CheckReceiver(this, ES.IsTemporalDate);
    return ES.DifferenceTemporalPlainDate('until', this, other, options);
  }
  since(other: Params['since'][0], options: Params['since'][1] = undefined): Return['since'] {
    ES.CheckReceiver(this, ES.IsTemporalDate);
    return ES.DifferenceTemporalPlainDate('since', this, other, options);
  }
  equals(otherParam: Params['equals'][0]): Return['equals'] {
    ES.CheckReceiver(this, ES.IsTemporalDate);
    const other = ES.ToTemporalDate(otherParam);
    if (ES.CompareISODate(GetSlot(this, ISO_DATE), GetSlot(other, ISO_DATE)) !== 0) return false;
    return ES.CalendarEquals(GetSlot(this, CALENDAR), GetSlot(other, CALENDAR));
  }
  toString(options: Params['toString'][0] = undefined): string {
    ES.CheckReceiver(this, ES.IsTemporalDate);
    const resolvedOptions = ES.GetOptionsObject(options);
    const showCalendar = ES.GetTemporalShowCalendarNameOption(resolvedOptions);
    return ES.TemporalDateToString(this, showCalendar);
  }
  toJSON(): Return['toJSON'] {
    ES.CheckReceiver(this, ES.IsTemporalDate);
    return ES.TemporalDateToString(this);
  }
  toLocaleString(
    locales: Params['toLocaleString'][0] = undefined,
    options: Params['toLocaleString'][1] = undefined
  ): string {
    ES.CheckReceiver(this, ES.IsTemporalDate);
    return new DateTimeFormat(locales, options).format(this);
  }
  valueOf(): never {
    ES.ValueOfThrows('PlainDate');
  }
  toPlainDateTime(temporalTime: Params['toPlainDateTime'][0] = undefined): Return['toPlainDateTime'] {
    ES.CheckReceiver(this, ES.IsTemporalDate);
    const time = ES.ToTimeRecordOrMidnight(temporalTime);
    const isoDateTime = ES.CombineISODateAndTimeRecord(GetSlot(this, ISO_DATE), time);
    return ES.CreateTemporalDateTime(isoDateTime, GetSlot(this, CALENDAR));
  }
  toZonedDateTime(item: Params['toZonedDateTime'][0]): Return['toZonedDateTime'] {
    ES.CheckReceiver(this, ES.IsTemporalDate);

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

    const isoDate = GetSlot(this, ISO_DATE);
    let epochNs;
    if (temporalTime === undefined) {
      epochNs = ES.GetStartOfDay(timeZone, isoDate);
    } else {
      temporalTime = ES.ToTemporalTime(temporalTime);
      const isoDateTime = ES.CombineISODateAndTimeRecord(isoDate, GetSlot(temporalTime, TIME));
      epochNs = ES.GetEpochNanosecondsFor(timeZone, isoDateTime, 'compatible');
    }
    return ES.CreateTemporalZonedDateTime(epochNs, timeZone, GetSlot(this, CALENDAR));
  }
  toPlainYearMonth(): Return['toPlainYearMonth'] {
    ES.CheckReceiver(this, ES.IsTemporalDate);
    const calendar = GetSlot(this, CALENDAR);
    const fields = ES.ISODateToFields(calendar, GetSlot(this, ISO_DATE));
    const isoDate = ES.CalendarYearMonthFromFields(calendar, fields, 'constrain');
    return ES.CreateTemporalYearMonth(isoDate, calendar);
  }
  toPlainMonthDay(): Return['toPlainMonthDay'] {
    ES.CheckReceiver(this, ES.IsTemporalDate);
    const calendar = GetSlot(this, CALENDAR);
    const fields = ES.ISODateToFields(calendar, GetSlot(this, ISO_DATE));
    const isoDate = ES.CalendarMonthDayFromFields(calendar, fields, 'constrain');
    return ES.CreateTemporalMonthDay(isoDate, calendar);
  }

  static from(item: Params['from'][0], options: Params['from'][1] = undefined): Return['from'] {
    return ES.ToTemporalDate(item, options);
  }
  static compare(oneParam: Params['compare'][0], twoParam: Params['compare'][1]): Return['compare'] {
    const one = ES.ToTemporalDate(oneParam);
    const two = ES.ToTemporalDate(twoParam);
    return ES.CompareISODate(GetSlot(one, ISO_DATE), GetSlot(two, ISO_DATE));
  }
  [Symbol.toStringTag]!: 'Temporal.PlainDate';
}

MakeIntrinsicClass(PlainDate, 'Temporal.PlainDate');

function getCalendarProperty<P extends keyof CalendarDateRecord>(
  date: Temporal.PlainDate,
  prop: P
): CalendarDateRecord[P] {
  ES.CheckReceiver(date, ES.IsTemporalDate);
  const isoDate = GetSlot(date, ISO_DATE);
  return ES.calendarImplForObj(date).isoToDate(isoDate, { [prop]: true })[prop];
}
