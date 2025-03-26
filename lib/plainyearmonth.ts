import * as ES from './ecmascript';
import { MakeIntrinsicClass } from './intrinsicclass';
import { CALENDAR, GetSlot, ISO_DATE } from './slots';
import type { Temporal } from '..';
import { DateTimeFormat } from './intl';
import type {
  CalendarDateRecord,
  PlainYearMonthParams as Params,
  PlainYearMonthReturn as Return
} from './internaltypes';

export class PlainYearMonth implements Temporal.PlainYearMonth {
  constructor(
    isoYear: Params['constructor'][0],
    isoMonth: Params['constructor'][1],
    calendarParam: Params['constructor'][2] = 'iso8601',
    referenceISODay: Params['constructor'][3] = 1
  ) {
    const year = ES.ToIntegerWithTruncation(isoYear);
    const month = ES.ToIntegerWithTruncation(isoMonth);
    const calendar = ES.CanonicalizeCalendar(calendarParam === undefined ? 'iso8601' : ES.RequireString(calendarParam));
    const day = ES.ToIntegerWithTruncation(referenceISODay);

    ES.RejectISODate(year, month, day);
    ES.CreateTemporalYearMonthSlots(this, { year, month, day }, calendar);
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
  get calendarId(): Return['calendarId'] {
    ES.CheckReceiver(this, ES.IsTemporalYearMonth);
    return GetSlot(this, CALENDAR);
  }
  get era(): Return['era'] {
    return getCalendarProperty(this, 'era');
  }
  get eraYear(): Return['eraYear'] {
    return getCalendarProperty(this, 'eraYear');
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
  with(temporalYearMonthLike: Params['with'][0], options: Params['with'][1] = undefined): Return['with'] {
    ES.CheckReceiver(this, ES.IsTemporalYearMonth);
    if (!ES.IsObject(temporalYearMonthLike)) {
      throw new TypeError('invalid argument');
    }
    ES.RejectTemporalLikeObject(temporalYearMonthLike);

    const calendar = GetSlot(this, CALENDAR);
    let fields = ES.ISODateToFields(calendar, GetSlot(this, ISO_DATE), 'year-month');
    const partialYearMonth = ES.PrepareCalendarFields(
      calendar,
      temporalYearMonthLike,
      ['year', 'month', 'monthCode'],
      [],
      'partial'
    );
    fields = ES.CalendarMergeFields(calendar, fields, partialYearMonth);

    const overflow = ES.GetTemporalOverflowOption(ES.GetOptionsObject(options));
    const isoDate = ES.CalendarYearMonthFromFields(calendar, fields, overflow);
    return ES.CreateTemporalYearMonth(isoDate, calendar);
  }
  add(temporalDurationLike: Params['add'][0], options: Params['add'][1] = undefined): Return['add'] {
    ES.CheckReceiver(this, ES.IsTemporalYearMonth);
    return ES.AddDurationToYearMonth('add', this, temporalDurationLike, options);
  }
  subtract(
    temporalDurationLike: Params['subtract'][0],
    options: Params['subtract'][1] = undefined
  ): Return['subtract'] {
    ES.CheckReceiver(this, ES.IsTemporalYearMonth);
    return ES.AddDurationToYearMonth('subtract', this, temporalDurationLike, options);
  }
  until(other: Params['until'][0], options: Params['until'][1] = undefined): Return['until'] {
    ES.CheckReceiver(this, ES.IsTemporalYearMonth);
    return ES.DifferenceTemporalPlainYearMonth('until', this, other, options);
  }
  since(other: Params['since'][0], options: Params['since'][1] = undefined): Return['since'] {
    ES.CheckReceiver(this, ES.IsTemporalYearMonth);
    return ES.DifferenceTemporalPlainYearMonth('since', this, other, options);
  }
  equals(otherParam: Params['equals'][0]): Return['equals'] {
    ES.CheckReceiver(this, ES.IsTemporalYearMonth);
    const other = ES.ToTemporalYearMonth(otherParam);
    if (ES.CompareISODate(GetSlot(this, ISO_DATE), GetSlot(other, ISO_DATE)) !== 0) return false;
    return ES.CalendarEquals(GetSlot(this, CALENDAR), GetSlot(other, CALENDAR));
  }
  toString(options: Params['toString'][0] = undefined): string {
    ES.CheckReceiver(this, ES.IsTemporalYearMonth);
    const resolvedOptions = ES.GetOptionsObject(options);
    const showCalendar = ES.GetTemporalShowCalendarNameOption(resolvedOptions);
    return ES.TemporalYearMonthToString(this, showCalendar);
  }
  toJSON(): Return['toJSON'] {
    ES.CheckReceiver(this, ES.IsTemporalYearMonth);
    return ES.TemporalYearMonthToString(this);
  }
  toLocaleString(
    locales: Params['toLocaleString'][0] = undefined,
    options: Params['toLocaleString'][1] = undefined
  ): string {
    ES.CheckReceiver(this, ES.IsTemporalYearMonth);
    return new DateTimeFormat(locales, options).format(this);
  }
  valueOf(): never {
    ES.ValueOfThrows('PlainYearMonth');
  }
  toPlainDate(item: Params['toPlainDate'][0]): Return['toPlainDate'] {
    ES.CheckReceiver(this, ES.IsTemporalYearMonth);
    if (!ES.IsObject(item)) throw new TypeError('argument should be an object');
    const calendar = GetSlot(this, CALENDAR);

    const fields = ES.ISODateToFields(calendar, GetSlot(this, ISO_DATE), 'year-month');
    const inputFields = ES.PrepareCalendarFields(calendar, item, ['day'], [], []);
    const mergedFields = ES.CalendarMergeFields(calendar, fields, inputFields);
    const isoDate = ES.CalendarDateFromFields(calendar, mergedFields, 'constrain');
    return ES.CreateTemporalDate(isoDate, calendar);
  }

  static from(item: Params['from'][0], options: Params['from'][1] = undefined): Return['from'] {
    return ES.ToTemporalYearMonth(item, options);
  }
  static compare(oneParam: Params['compare'][0], twoParam: Params['compare'][1]): Return['compare'] {
    const one = ES.ToTemporalYearMonth(oneParam);
    const two = ES.ToTemporalYearMonth(twoParam);
    return ES.CompareISODate(GetSlot(one, ISO_DATE), GetSlot(two, ISO_DATE));
  }
  [Symbol.toStringTag]!: 'Temporal.PlainYearMonth';
}

MakeIntrinsicClass(PlainYearMonth, 'Temporal.PlainYearMonth');

function getCalendarProperty<P extends keyof CalendarDateRecord>(
  ym: Temporal.PlainYearMonth,
  prop: P
): CalendarDateRecord[P] {
  ES.CheckReceiver(ym, ES.IsTemporalYearMonth);
  const isoDate = GetSlot(ym, ISO_DATE);
  return ES.calendarImplForObj(ym).isoToDate(isoDate, { [prop]: true })[prop];
}
