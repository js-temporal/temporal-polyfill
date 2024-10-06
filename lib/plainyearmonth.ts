import { TypeError as TypeErrorCtor } from './primordials';

import * as ES from './ecmascript';
import { MakeIntrinsicClass } from './intrinsicclass';
import { CALENDAR, GetSlot, ISO_DATE } from './slots';
import type { Temporal } from '..';
import { DateTimeFormat } from './intl';
import type { PlainYearMonthParams as Params, PlainYearMonthReturn as Return } from './internaltypes';

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
    if (!ES.IsTemporalYearMonth(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = GetSlot(this, ISO_DATE);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { year: true }).year;
  }
  get month(): Return['month'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = GetSlot(this, ISO_DATE);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { month: true }).month;
  }
  get monthCode(): Return['monthCode'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = GetSlot(this, ISO_DATE);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { monthCode: true }).monthCode;
  }
  get calendarId(): Return['calendarId'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeErrorCtor('invalid receiver');
    return GetSlot(this, CALENDAR);
  }
  get era(): Return['era'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = GetSlot(this, ISO_DATE);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { era: true }).era;
  }
  get eraYear(): Return['eraYear'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = GetSlot(this, ISO_DATE);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { eraYear: true }).eraYear;
  }
  get daysInMonth(): Return['daysInMonth'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = GetSlot(this, ISO_DATE);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { daysInMonth: true }).daysInMonth;
  }
  get daysInYear(): Return['daysInYear'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = GetSlot(this, ISO_DATE);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { daysInYear: true }).daysInYear;
  }
  get monthsInYear(): Return['monthsInYear'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = GetSlot(this, ISO_DATE);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { monthsInYear: true }).monthsInYear;
  }
  get inLeapYear(): Return['inLeapYear'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = GetSlot(this, ISO_DATE);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { inLeapYear: true }).inLeapYear;
  }
  with(temporalYearMonthLike: Params['with'][0], options: Params['with'][1] = undefined): Return['with'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeErrorCtor('invalid receiver');
    if (!ES.IsObject(temporalYearMonthLike)) {
      throw new TypeError('invalid argument');
    }
    ES.RejectTemporalLikeObject(temporalYearMonthLike);

    const calendar = GetSlot(this, CALENDAR);
    let fields = ES.TemporalObjectToFields(this);
    const partialYearMonth = ES.PrepareCalendarFields(
      calendar,
      temporalYearMonthLike,
      ['month', 'monthCode', 'year'],
      [],
      'partial'
    );
    fields = ES.CalendarMergeFields(calendar, fields, partialYearMonth);

    const overflow = ES.GetTemporalOverflowOption(ES.GetOptionsObject(options));
    const isoDate = ES.CalendarYearMonthFromFields(calendar, fields, overflow);
    return ES.CreateTemporalYearMonth(isoDate, calendar);
  }
  add(temporalDurationLike: Params['add'][0], options: Params['add'][1] = undefined): Return['add'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeErrorCtor('invalid receiver');
    return ES.AddDurationToYearMonth('add', this, temporalDurationLike, options);
  }
  subtract(
    temporalDurationLike: Params['subtract'][0],
    options: Params['subtract'][1] = undefined
  ): Return['subtract'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeErrorCtor('invalid receiver');
    return ES.AddDurationToYearMonth('subtract', this, temporalDurationLike, options);
  }
  until(other: Params['until'][0], options: Params['until'][1] = undefined): Return['until'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeErrorCtor('invalid receiver');
    return ES.DifferenceTemporalPlainYearMonth('until', this, other, options);
  }
  since(other: Params['since'][0], options: Params['since'][1] = undefined): Return['since'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeErrorCtor('invalid receiver');
    return ES.DifferenceTemporalPlainYearMonth('since', this, other, options);
  }
  equals(otherParam: Params['equals'][0]): Return['equals'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeErrorCtor('invalid receiver');
    const other = ES.ToTemporalYearMonth(otherParam);
    if (ES.CompareISODate(GetSlot(this, ISO_DATE), GetSlot(other, ISO_DATE)) !== 0) return false;
    return ES.CalendarEquals(GetSlot(this, CALENDAR), GetSlot(other, CALENDAR));
  }
  toString(options: Params['toString'][0] = undefined): string {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeErrorCtor('invalid receiver');
    const resolvedOptions = ES.GetOptionsObject(options);
    const showCalendar = ES.GetTemporalShowCalendarNameOption(resolvedOptions);
    return ES.TemporalYearMonthToString(this, showCalendar);
  }
  toJSON(): Return['toJSON'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeErrorCtor('invalid receiver');
    return ES.TemporalYearMonthToString(this);
  }
  toLocaleString(
    locales: Params['toLocaleString'][0] = undefined,
    options: Params['toLocaleString'][1] = undefined
  ): string {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeErrorCtor('invalid receiver');
    return new DateTimeFormat(locales, options).format(this);
  }
  valueOf(): never {
    ES.ValueOfThrows('PlainYearMonth');
  }
  toPlainDate(item: Params['toPlainDate'][0]): Return['toPlainDate'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeErrorCtor('invalid receiver');
    if (!ES.IsObject(item)) throw new TypeErrorCtor('argument should be an object');
    const calendar = GetSlot(this, CALENDAR);

    const fields = ES.TemporalObjectToFields(this);
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
