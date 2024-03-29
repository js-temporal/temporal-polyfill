import * as ES from './ecmascript';
import { MakeIntrinsicClass } from './intrinsicclass';
import { CalendarMethodRecord } from './methodrecord';
import { ISO_YEAR, ISO_MONTH, ISO_DAY, CALENDAR, GetSlot } from './slots';
import type { Temporal } from '..';
import { DateTimeFormat } from './intl';
import type { FieldKey, PlainYearMonthParams as Params, PlainYearMonthReturn as Return } from './internaltypes';

const ArrayPrototypeConcat = Array.prototype.concat;

export class PlainYearMonth implements Temporal.PlainYearMonth {
  constructor(
    isoYearParam: Params['constructor'][0],
    isoMonthParam: Params['constructor'][1],
    calendarParam: Params['constructor'][2] = 'iso8601',
    referenceISODayParam: Params['constructor'][3] = 1
  ) {
    const isoYear = ES.ToIntegerWithTruncation(isoYearParam);
    const isoMonth = ES.ToIntegerWithTruncation(isoMonthParam);
    const calendar = ES.ToTemporalCalendarSlotValue(calendarParam);
    const referenceISODay = ES.ToIntegerWithTruncation(referenceISODayParam);

    ES.CreateTemporalYearMonthSlots(this, isoYear, isoMonth, calendar, referenceISODay);
  }
  get year(): Return['year'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
    return ES.CalendarYear(GetSlot(this, CALENDAR), this);
  }
  get month(): Return['month'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
    return ES.CalendarMonth(GetSlot(this, CALENDAR), this);
  }
  get monthCode(): Return['monthCode'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
    return ES.CalendarMonthCode(GetSlot(this, CALENDAR), this);
  }
  get calendarId(): Return['calendarId'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
    return ES.ToTemporalCalendarIdentifier(GetSlot(this, CALENDAR));
  }
  get era(): Return['era'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
    return ES.CalendarEra(GetSlot(this, CALENDAR), this);
  }
  get eraYear(): Return['eraYear'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
    return ES.CalendarEraYear(GetSlot(this, CALENDAR), this);
  }
  get daysInMonth(): Return['daysInMonth'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
    return ES.CalendarDaysInMonth(GetSlot(this, CALENDAR), this);
  }
  get daysInYear(): Return['daysInYear'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
    return ES.CalendarDaysInYear(GetSlot(this, CALENDAR), this);
  }
  get monthsInYear(): Return['monthsInYear'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
    return ES.CalendarMonthsInYear(GetSlot(this, CALENDAR), this);
  }
  get inLeapYear(): Return['inLeapYear'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
    return ES.CalendarInLeapYear(GetSlot(this, CALENDAR), this);
  }
  with(temporalYearMonthLike: Params['with'][0], options: Params['with'][1] = undefined): Return['with'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
    if (!ES.IsObject(temporalYearMonthLike)) {
      throw new TypeError('invalid argument');
    }
    ES.RejectTemporalLikeObject(temporalYearMonthLike);
    const resolvedOptions = ES.SnapshotOwnProperties(ES.GetOptionsObject(options), null);

    const calendarRec = new CalendarMethodRecord(GetSlot(this, CALENDAR), [
      'fields',
      'mergeFields',
      'yearMonthFromFields'
    ]);
    let { fields, fieldNames } = ES.PrepareCalendarFieldsAndFieldNames(calendarRec, this, [
      'month',
      'monthCode',
      'year'
    ]);
    const partialYearMonth = ES.PrepareTemporalFields(temporalYearMonthLike, fieldNames, 'partial');
    fields = ES.CalendarMergeFields(calendarRec, fields, partialYearMonth);
    fields = ES.PrepareTemporalFields(fields, fieldNames, []);

    return ES.CalendarYearMonthFromFields(calendarRec, fields, resolvedOptions);
  }
  add(temporalDurationLike: Params['add'][0], options: Params['add'][1] = undefined): Return['add'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
    return ES.AddDurationToOrSubtractDurationFromPlainYearMonth('add', this, temporalDurationLike, options);
  }
  subtract(
    temporalDurationLike: Params['subtract'][0],
    options: Params['subtract'][1] = undefined
  ): Return['subtract'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
    return ES.AddDurationToOrSubtractDurationFromPlainYearMonth('subtract', this, temporalDurationLike, options);
  }
  until(other: Params['until'][0], options: Params['until'][1] = undefined): Return['until'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
    return ES.DifferenceTemporalPlainYearMonth('until', this, other, options);
  }
  since(other: Params['since'][0], options: Params['since'][1] = undefined): Return['since'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
    return ES.DifferenceTemporalPlainYearMonth('since', this, other, options);
  }
  equals(otherParam: Params['equals'][0]): Return['equals'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
    const other = ES.ToTemporalYearMonth(otherParam);
    if (GetSlot(this, ISO_YEAR) !== GetSlot(other, ISO_YEAR)) return false;
    if (GetSlot(this, ISO_MONTH) !== GetSlot(other, ISO_MONTH)) return false;
    if (GetSlot(this, ISO_DAY) !== GetSlot(other, ISO_DAY)) return false;
    return ES.CalendarEquals(GetSlot(this, CALENDAR), GetSlot(other, CALENDAR));
  }
  toString(optionsParam: Params['toString'][0] = undefined): string {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
    const options = ES.GetOptionsObject(optionsParam);
    const showCalendar = ES.GetTemporalShowCalendarNameOption(options);
    return ES.TemporalYearMonthToString(this, showCalendar);
  }
  toJSON(): Return['toJSON'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
    return ES.TemporalYearMonthToString(this);
  }
  toLocaleString(
    locales: Params['toLocaleString'][0] = undefined,
    options: Params['toLocaleString'][1] = undefined
  ): string {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
    return new DateTimeFormat(locales, options).format(this);
  }
  valueOf(): never {
    ES.ValueOfThrows('PlainYearMonth');
  }
  toPlainDate(item: Params['toPlainDate'][0]): Return['toPlainDate'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
    if (!ES.IsObject(item)) throw new TypeError('argument should be an object');
    const calendarRec = new CalendarMethodRecord(GetSlot(this, CALENDAR), ['dateFromFields', 'fields', 'mergeFields']);

    const { fields, fieldNames: receiverFieldNames } = ES.PrepareCalendarFieldsAndFieldNames(calendarRec, this, [
      'monthCode',
      'year'
    ]);
    const { fields: inputFields, fieldNames: inputFieldNames } = ES.PrepareCalendarFieldsAndFieldNames(
      calendarRec,
      item,
      ['day']
    );
    let mergedFields = ES.CalendarMergeFields(calendarRec, fields, inputFields);
    const concatenatedFieldNames: FieldKey[] = ES.Call(ArrayPrototypeConcat, receiverFieldNames, inputFieldNames);
    mergedFields = ES.PrepareTemporalFields(mergedFields, concatenatedFieldNames, [], [], 'ignore');
    return ES.CalendarDateFromFields(calendarRec, mergedFields);
  }
  getISOFields(): Return['getISOFields'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
    return {
      calendar: GetSlot(this, CALENDAR),
      isoDay: GetSlot(this, ISO_DAY),
      isoMonth: GetSlot(this, ISO_MONTH),
      isoYear: GetSlot(this, ISO_YEAR)
    };
  }
  getCalendar(): Return['getCalendar'] {
    if (!ES.IsTemporalYearMonth(this)) throw new TypeError('invalid receiver');
    return ES.ToTemporalCalendarObject(GetSlot(this, CALENDAR));
  }

  static from(item: Params['from'][0], optionsParam: Params['from'][1] = undefined): Return['from'] {
    const options = ES.GetOptionsObject(optionsParam);
    if (ES.IsTemporalYearMonth(item)) {
      ES.GetTemporalOverflowOption(options); // validate and ignore
      return ES.CreateTemporalYearMonth(
        GetSlot(item, ISO_YEAR),
        GetSlot(item, ISO_MONTH),
        GetSlot(item, CALENDAR),
        GetSlot(item, ISO_DAY)
      );
    }
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
