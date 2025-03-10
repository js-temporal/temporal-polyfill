import * as ES from './ecmascript';
import { MakeIntrinsicClass } from './intrinsicclass';
import { CalendarMethodRecord } from './methodrecord';
import { ISO_MONTH, ISO_DAY, ISO_YEAR, CALENDAR, GetSlot } from './slots';
import type { Temporal } from '..';
import { DateTimeFormat } from './intl';
import type { FieldKey, PlainMonthDayParams as Params, PlainMonthDayReturn as Return } from './internaltypes';

const ArrayPrototypeConcat = Array.prototype.concat;

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
    const calendarRec = new CalendarMethodRecord(GetSlot(this, CALENDAR), ['day']);
    return ES.CalendarDay(calendarRec, this);
  }
  get calendarId(): Return['calendarId'] {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
    return ES.ToTemporalCalendarIdentifier(GetSlot(this, CALENDAR));
  }

  with(temporalMonthDayLike: Params['with'][0], options: Params['with'][1] = undefined): Return['with'] {
    if (!ES.IsTemporalMonthDay(this)) throw new TypeError('invalid receiver');
    if (!ES.IsObject(temporalMonthDayLike)) {
      throw new TypeError('invalid argument');
    }
    ES.RejectTemporalLikeObject(temporalMonthDayLike);
    const resolvedOptions = ES.SnapshotOwnProperties(ES.GetOptionsObject(options), null);

    const calendarRec = new CalendarMethodRecord(GetSlot(this, CALENDAR), [
      'fields',
      'mergeFields',
      'monthDayFromFields'
    ]);
    let { fields, fieldNames } = ES.PrepareCalendarFieldsAndFieldNames(calendarRec, this, [
      'day',
      'month',
      'monthCode',
      'year'
    ]);
    const partialMonthDay = ES.PrepareTemporalFields(temporalMonthDayLike, fieldNames, 'partial');
    fields = ES.CalendarMergeFields(calendarRec, fields, partialMonthDay);
    fields = ES.PrepareTemporalFields(fields, fieldNames, []);

    return ES.CalendarMonthDayFromFields(calendarRec, fields, resolvedOptions);
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
    const calendarRec = new CalendarMethodRecord(GetSlot(this, CALENDAR), ['dateFromFields', 'fields', 'mergeFields']);

    const { fields, fieldNames: receiverFieldNames } = ES.PrepareCalendarFieldsAndFieldNames(calendarRec, this, [
      'day',
      'monthCode'
    ]);
    const { fields: inputFields, fieldNames: inputFieldNames } = ES.PrepareCalendarFieldsAndFieldNames(
      calendarRec,
      item,
      ['year']
    );
    let mergedFields = ES.CalendarMergeFields(calendarRec, fields, inputFields);
    const concatenatedFieldNames: FieldKey[] = ES.Call(ArrayPrototypeConcat, receiverFieldNames, inputFieldNames);
    mergedFields = ES.PrepareTemporalFields(mergedFields, concatenatedFieldNames, [], [], 'ignore');
    return ES.CalendarDateFromFields(calendarRec, mergedFields);
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
      ES.GetTemporalOverflowOption(options); // validate and ignore
      return ES.CreateTemporalMonthDay(
        GetSlot(item, ISO_MONTH),
        GetSlot(item, ISO_DAY),
        GetSlot(item, CALENDAR),
        GetSlot(item, ISO_YEAR)
      );
    }
    return ES.ToTemporalMonthDay(item, options);
  }
  [Symbol.toStringTag]: 'Temporal.PlainMonthDay';
}

MakeIntrinsicClass(PlainMonthDay, 'Temporal.PlainMonthDay');
