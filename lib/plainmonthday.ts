import * as ES from './ecmascript';
import { MakeIntrinsicClass } from './intrinsicclass';
import { ISO_MONTH, ISO_DAY, ISO_YEAR, CALENDAR, GetSlot } from './slots';
import type { Temporal } from '..';
import { DateTimeFormat } from './intl';
import type { PlainMonthDayParams as Params, PlainMonthDayReturn as Return } from './internaltypes';

const ObjectCreate = Object.create;

export class PlainMonthDay implements Temporal.PlainMonthDay {
  constructor(
    isoMonthParam: Params['constructor'][0],
    isoDayParam: Params['constructor'][0],
    calendarParam: string | Temporal.CalendarProtocol = 'iso8601',
    referenceISOYearParam = 1972
  ) {
    const isoMonth = ES.ToIntegerWithTruncation(isoMonthParam);
    const isoDay = ES.ToIntegerWithTruncation(isoDayParam);
    const calendar = ES.ToTemporalCalendarSlotValue(calendarParam);
    const referenceISOYear = ES.ToIntegerWithTruncation(referenceISOYearParam);

    ES.CreateTemporalMonthDaySlots(this, isoMonth, isoDay, calendar, referenceISOYear);
  }

  get monthCode(): Return['monthCode'] {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
    return ES.CalendarMonthCode(GetSlot(this, CALENDAR), this);
  }
  get day(): Return['day'] {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
    return ES.CalendarDay(GetSlot(this, CALENDAR), this);
  }
  get calendarId(): Return['calendarId'] {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
    return ES.ToTemporalCalendarIdentifier(GetSlot(this, CALENDAR));
  }

  with(temporalMonthDayLike: Params['with'][0], optionsParam: Params['with'][1] = undefined): Return['with'] {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
    if (!ES.IsObject(temporalMonthDayLike)) {
      throw new TypeError('invalid argument');
    }
    ES.RejectTemporalLikeObject(temporalMonthDayLike);
    const options = ES.GetOptionsObject(optionsParam);

    const calendar = GetSlot(this, CALENDAR);
    const fieldNames = ES.CalendarFields(calendar, ['day', 'month', 'monthCode', 'year'] as const);
    let fields = ES.PrepareTemporalFields(this, fieldNames, []);
    const partialMonthDay = ES.PrepareTemporalFields(temporalMonthDayLike, fieldNames, 'partial');
    fields = ES.CalendarMergeFields(calendar, fields, partialMonthDay);
    fields = ES.PrepareTemporalFields(fields, fieldNames, []);

    return ES.CalendarMonthDayFromFields(calendar, fields, options);
  }
  equals(otherParam: Params['equals'][0]): Return['equals'] {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
    const other = ES.ToTemporalMonthDay(otherParam);
    for (const slot of [ISO_MONTH, ISO_DAY, ISO_YEAR]) {
      const val1 = GetSlot(this, slot);
      const val2 = GetSlot(other, slot);
      if (val1 !== val2) return false;
    }
    return ES.CalendarEquals(GetSlot(this, CALENDAR), GetSlot(other, CALENDAR));
  }
  toString(optionsParam: Params['toString'][0] = undefined): string {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
    const options = ES.GetOptionsObject(optionsParam);
    const showCalendar = ES.ToCalendarNameOption(options);
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
    throw new TypeError('use equals() to compare Temporal.PlainMonthDay');
  }
  toPlainDate(item: Params['toPlainDate'][0]): Return['toPlainDate'] {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
    if (!ES.IsObject(item)) throw new TypeError('argument should be an object');
    const calendar = GetSlot(this, CALENDAR);

    const receiverFieldNames = ES.CalendarFields(calendar, ['day', 'monthCode'] as const);
    const fields = ES.PrepareTemporalFields(this, receiverFieldNames, []);

    const inputFieldNames = ES.CalendarFields(calendar, ['year'] as const);
    const inputFields = ES.PrepareTemporalFields(item, inputFieldNames, []);
    let mergedFields = ES.CalendarMergeFields(calendar, fields, inputFields);

    // TODO: Use MergeLists abstract operation.
    const mergedFieldNames = [...new Set([...receiverFieldNames, ...inputFieldNames])];
    mergedFields = ES.PrepareTemporalFields(mergedFields, mergedFieldNames, []);
    const options = ObjectCreate(null);
    options.overflow = 'reject';
    return ES.CalendarDateFromFields(calendar, mergedFields, options);
  }
  getISOFields(): Return['getISOFields'] {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
    return {
      calendar: GetSlot(this, CALENDAR),
      isoDay: GetSlot(this, ISO_DAY),
      isoMonth: GetSlot(this, ISO_MONTH),
      isoYear: GetSlot(this, ISO_YEAR)
    };
  }
  getCalendar(): Return['getCalendar'] {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
    return ES.ToTemporalCalendarObject(GetSlot(this, CALENDAR));
  }

  static from(item: Params['from'][0], optionsParam: Params['from'][1] = undefined): Return['from'] {
    const options = ES.GetOptionsObject(optionsParam);
    if (ES.IsTemporalMonthDay(item)) {
      ES.ToTemporalOverflow(options); // validate and ignore
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
