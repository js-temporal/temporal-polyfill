import { TypeError as TypeErrorCtor } from './primordials';

import * as ES from './ecmascript';
import { MakeIntrinsicClass } from './intrinsicclass';
import { ISO_YEAR, ISO_MONTH, ISO_DAY, CALENDAR, GetSlot } from './slots';
import type { Temporal } from '..';
import { DateTimeFormat } from './intl';
import type { PlainYearMonthParams as Params, PlainYearMonthReturn as Return } from './internaltypes';

export class PlainYearMonth implements Temporal.PlainYearMonth {
  constructor(
    isoYearParam: Params['constructor'][0],
    isoMonthParam: Params['constructor'][1],
    calendarParam: Params['constructor'][2] = 'iso8601',
    referenceISODayParam: Params['constructor'][3] = 1
  ) {
    const isoYear = ES.ToIntegerWithTruncation(isoYearParam);
    const isoMonth = ES.ToIntegerWithTruncation(isoMonthParam);
    const calendar = ES.CanonicalizeCalendar(calendarParam === undefined ? 'iso8601' : ES.RequireString(calendarParam));
    const referenceISODay = ES.ToIntegerWithTruncation(referenceISODayParam);

    ES.CreateTemporalYearMonthSlots(this, isoYear, isoMonth, calendar, referenceISODay);
  }
  get year(): Return['year'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.CalendarYear(GetSlot(this, CALENDAR), isoDate);
  }
  get month(): Return['month'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.CalendarMonth(GetSlot(this, CALENDAR), isoDate);
  }
  get monthCode(): Return['monthCode'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.CalendarMonthCode(GetSlot(this, CALENDAR), isoDate);
  }
  get calendarId(): Return['calendarId'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeErrorCtor('invalid receiver');
    return GetSlot(this, CALENDAR);
  }
  get era(): Return['era'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.CalendarEra(GetSlot(this, CALENDAR), isoDate);
  }
  get eraYear(): Return['eraYear'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.CalendarEraYear(GetSlot(this, CALENDAR), isoDate);
  }
  get daysInMonth(): Return['daysInMonth'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.CalendarDaysInMonth(GetSlot(this, CALENDAR), isoDate);
  }
  get daysInYear(): Return['daysInYear'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.CalendarDaysInYear(GetSlot(this, CALENDAR), isoDate);
  }
  get monthsInYear(): Return['monthsInYear'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.CalendarMonthsInYear(GetSlot(this, CALENDAR), isoDate);
  }
  get inLeapYear(): Return['inLeapYear'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.CalendarInLeapYear(GetSlot(this, CALENDAR), isoDate);
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
    const { year, month, day } = ES.CalendarYearMonthFromFields(calendar, fields, overflow);
    return ES.CreateTemporalYearMonth(year, month, calendar, day);
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
    if (GetSlot(this, ISO_YEAR) !== GetSlot(other, ISO_YEAR)) return false;
    if (GetSlot(this, ISO_MONTH) !== GetSlot(other, ISO_MONTH)) return false;
    if (GetSlot(this, ISO_DAY) !== GetSlot(other, ISO_DAY)) return false;
    return ES.CalendarEquals(GetSlot(this, CALENDAR), GetSlot(other, CALENDAR));
  }
  toString(optionsParam: Params['toString'][0] = undefined): string {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeErrorCtor('invalid receiver');
    const options = ES.GetOptionsObject(optionsParam);
    const showCalendar = ES.GetTemporalShowCalendarNameOption(options);
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
    const { year, month, day } = ES.CalendarDateFromFields(calendar, mergedFields, 'constrain');
    return ES.CreateTemporalDate(year, month, day, calendar);
  }

  static from(item: Params['from'][0], options: Params['from'][1] = undefined): Return['from'] {
    return ES.ToTemporalYearMonth(item, options);
  }
  static compare(oneParam: Params['compare'][0], twoParam: Params['compare'][1]): Return['compare'] {
    const one = ES.ToTemporalYearMonth(oneParam);
    const two = ES.ToTemporalYearMonth(twoParam);
    return ES.CompareISODate(
      GetSlot(one, ISO_YEAR),
      GetSlot(one, ISO_MONTH),
      GetSlot(one, ISO_DAY),
      GetSlot(two, ISO_YEAR),
      GetSlot(two, ISO_MONTH),
      GetSlot(two, ISO_DAY)
    );
  }
  [Symbol.toStringTag]!: 'Temporal.PlainYearMonth';
}

MakeIntrinsicClass(PlainYearMonth, 'Temporal.PlainYearMonth');
