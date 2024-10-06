import { TypeError as TypeErrorCtor } from './primordials';

import * as ES from './ecmascript';
import { MakeIntrinsicClass } from './intrinsicclass';
import { CALENDAR, GetSlot, ISO_DATE } from './slots';
import type { Temporal } from '..';
import { DateTimeFormat } from './intl';
import type { PlainMonthDayParams as Params, PlainMonthDayReturn as Return } from './internaltypes';

export class PlainMonthDay implements Temporal.PlainMonthDay {
  constructor(
    isoMonth: Params['constructor'][0],
    isoDay: Params['constructor'][0],
    calendarParam = 'iso8601',
    referenceISOYear = 1972
  ) {
    const month = ES.ToIntegerWithTruncation(isoMonth);
    const day = ES.ToIntegerWithTruncation(isoDay);
    const calendar = ES.CanonicalizeCalendar(calendarParam === undefined ? 'iso8601' : ES.RequireString(calendarParam));
    const year = ES.ToIntegerWithTruncation(referenceISOYear);

    ES.RejectISODate(year, month, day);
    ES.CreateTemporalMonthDaySlots(this, { year, month, day }, calendar);
  }

  get monthCode(): Return['monthCode'] {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = GetSlot(this, ISO_DATE);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { monthCode: true }).monthCode;
  }
  get day(): Return['day'] {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeErrorCtor('invalid receiver');
    const isoDate = GetSlot(this, ISO_DATE);
    return ES.calendarImplForObj(this).isoToDate(isoDate, { day: true }).day;
  }
  get calendarId(): Return['calendarId'] {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeErrorCtor('invalid receiver');
    return GetSlot(this, CALENDAR);
  }

  with(temporalMonthDayLike: Params['with'][0], options: Params['with'][1] = undefined): Return['with'] {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeErrorCtor('invalid receiver');
    if (!ES.IsObject(temporalMonthDayLike)) {
      throw new TypeError('invalid argument');
    }
    ES.RejectTemporalLikeObject(temporalMonthDayLike);

    const calendar = GetSlot(this, CALENDAR);
    let fields = ES.TemporalObjectToFields(this);
    const partialMonthDay = ES.PrepareCalendarFields(
      calendar,
      temporalMonthDayLike,
      ['day', 'month', 'monthCode', 'year'],
      [],
      'partial'
    );
    fields = ES.CalendarMergeFields(calendar, fields, partialMonthDay);

    const overflow = ES.GetTemporalOverflowOption(ES.GetOptionsObject(options));
    const isoDate = ES.CalendarMonthDayFromFields(calendar, fields, overflow);
    return ES.CreateTemporalMonthDay(isoDate, calendar);
  }
  equals(otherParam: Params['equals'][0]): Return['equals'] {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeErrorCtor('invalid receiver');
    const other = ES.ToTemporalMonthDay(otherParam);
    if (ES.CompareISODate(GetSlot(this, ISO_DATE), GetSlot(other, ISO_DATE)) !== 0) return false;
    return ES.CalendarEquals(GetSlot(this, CALENDAR), GetSlot(other, CALENDAR));
  }
  toString(options: Params['toString'][0] = undefined): string {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeErrorCtor('invalid receiver');
    const resolvedOptions = ES.GetOptionsObject(options);
    const showCalendar = ES.GetTemporalShowCalendarNameOption(resolvedOptions);
    return ES.TemporalMonthDayToString(this, showCalendar);
  }
  toJSON(): Return['toJSON'] {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeErrorCtor('invalid receiver');
    return ES.TemporalMonthDayToString(this);
  }
  toLocaleString(
    locales: Params['toLocaleString'][0] = undefined,
    options: Params['toLocaleString'][1] = undefined
  ): string {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeErrorCtor('invalid receiver');
    return new DateTimeFormat(locales, options).format(this);
  }
  valueOf(): never {
    ES.ValueOfThrows('PlainMonthDay');
  }
  toPlainDate(item: Params['toPlainDate'][0]): Return['toPlainDate'] {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeErrorCtor('invalid receiver');
    if (!ES.IsObject(item)) throw new TypeError('argument should be an object');
    const calendar = GetSlot(this, CALENDAR);

    const fields = ES.TemporalObjectToFields(this);
    const inputFields = ES.PrepareCalendarFields(calendar, item, ['year'], [], []);
    let mergedFields = ES.CalendarMergeFields(calendar, fields, inputFields);
    const isoDate = ES.CalendarDateFromFields(calendar, mergedFields, 'constrain');
    return ES.CreateTemporalDate(isoDate, calendar);
  }

  static from(item: Params['from'][0], options: Params['from'][1] = undefined): Return['from'] {
    return ES.ToTemporalMonthDay(item, options);
  }
  [Symbol.toStringTag]!: 'Temporal.PlainMonthDay';
}

MakeIntrinsicClass(PlainMonthDay, 'Temporal.PlainMonthDay');
