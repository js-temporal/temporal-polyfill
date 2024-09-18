import { RangeError as RangeError, TypeError as TypeError } from './primordials';

import * as ES from './ecmascript';
import { MakeIntrinsicClass } from './intrinsicclass';
import { ISO_MONTH, ISO_DAY, ISO_YEAR, CALENDAR, GetSlot } from './slots';
import type { Temporal } from '..';
import { DateTimeFormat } from './intl';
import type { BuiltinCalendarId, PlainMonthDayParams as Params, PlainMonthDayReturn as Return } from './internaltypes';

export class PlainMonthDay implements Temporal.PlainMonthDay {
  constructor(
    isoMonthParam: Params['constructor'][0],
    isoDayParam: Params['constructor'][0],
    calendarParam = 'iso8601',
    referenceISOYearParam = 1972
  ) {
    const isoMonth = ES.ToIntegerWithTruncation(isoMonthParam);
    const isoDay = ES.ToIntegerWithTruncation(isoDayParam);
    let calendar = calendarParam === undefined ? 'iso8601' : ES.RequireString(calendarParam);
    if (!ES.IsBuiltinCalendar(calendar)) throw new RangeError(`unknown calendar ${calendar}`);
    calendar = ES.CanonicalizeCalendar(calendar);
    ES.uncheckedAssertNarrowedType<BuiltinCalendarId>(calendar, 'lowercased and canonicalized');
    const referenceISOYear = ES.ToIntegerWithTruncation(referenceISOYearParam);

    ES.CreateTemporalMonthDaySlots(this, isoMonth, isoDay, calendar, referenceISOYear);
  }

  get monthCode(): Return['monthCode'] {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.CalendarMonthCode(GetSlot(this, CALENDAR), isoDate);
  }
  get day(): Return['day'] {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
    const isoDate = ES.TemporalObjectToISODateRecord(this);
    return ES.CalendarDay(GetSlot(this, CALENDAR), isoDate);
  }
  get calendarId(): Return['calendarId'] {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
    return GetSlot(this, CALENDAR);
  }

  with(temporalMonthDayLike: Params['with'][0], options: Params['with'][1] = undefined): Return['with'] {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
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
    const { year, month, day } = ES.CalendarMonthDayFromFields(calendar, fields, overflow);
    return ES.CreateTemporalMonthDay(month, day, calendar, year);
  }
  equals(otherParam: Params['equals'][0]): Return['equals'] {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
    const other = ES.ToTemporalMonthDay(otherParam);
    if (GetSlot(this, ISO_YEAR) !== GetSlot(other, ISO_YEAR)) return false;
    if (GetSlot(this, ISO_MONTH) !== GetSlot(other, ISO_MONTH)) return false;
    if (GetSlot(this, ISO_DAY) !== GetSlot(other, ISO_DAY)) return false;
    return ES.CalendarEquals(GetSlot(this, CALENDAR), GetSlot(other, CALENDAR));
  }
  toString(optionsParam: Params['toString'][0] = undefined): string {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
    const options = ES.GetOptionsObject(optionsParam);
    const showCalendar = ES.GetTemporalShowCalendarNameOption(options);
    return ES.TemporalMonthDayToString(this, showCalendar);
  }
  toJSON(): Return['toJSON'] {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
    return ES.TemporalMonthDayToString(this);
  }
  toLocaleString(
    locales: Params['toLocaleString'][0] = undefined,
    options: Params['toLocaleString'][1] = undefined
  ): string {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
    return new DateTimeFormat(locales, options).format(this);
  }
  valueOf(): never {
    ES.ValueOfThrows('PlainMonthDay');
  }
  toPlainDate(item: Params['toPlainDate'][0]): Return['toPlainDate'] {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
    if (!ES.IsObject(item)) throw new TypeError('argument should be an object');
    const calendar = GetSlot(this, CALENDAR);

    const fields = ES.TemporalObjectToFields(this);
    const inputFields = ES.PrepareCalendarFields(calendar, item, ['year'], [], []);
    let mergedFields = ES.CalendarMergeFields(calendar, fields, inputFields);
    const { year, month, day } = ES.CalendarDateFromFields(calendar, mergedFields, 'constrain');
    return ES.CreateTemporalDate(year, month, day, calendar);
  }

  static from(item: Params['from'][0], options: Params['from'][1] = undefined): Return['from'] {
    if (ES.IsTemporalMonthDay(item)) {
      ES.GetTemporalOverflowOption(ES.GetOptionsObject(options));
      return ES.CreateTemporalMonthDay(
        GetSlot(item, ISO_MONTH),
        GetSlot(item, ISO_DAY),
        GetSlot(item, CALENDAR),
        GetSlot(item, ISO_YEAR)
      );
    }
    return ES.ToTemporalMonthDay(item, options);
  }
  [Symbol.toStringTag]!: 'Temporal.PlainMonthDay';
}

MakeIntrinsicClass(PlainMonthDay, 'Temporal.PlainMonthDay');
