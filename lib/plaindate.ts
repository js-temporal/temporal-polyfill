import * as ES from './ecmascript';
import { MakeIntrinsicClass } from './intrinsicclass';
import { CalendarMethodRecord, TimeZoneMethodRecord } from './methodrecord';
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
  EPOCHNANOSECONDS,
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
    const calendar = ES.ToTemporalCalendarSlotValue(calendarParam);

    ES.CreateTemporalDateSlots(this, isoYear, isoMonth, isoDay, calendar);
  }
  get calendarId(): Return['calendarId'] {
    if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
    return ES.ToTemporalCalendarIdentifier(GetSlot(this, CALENDAR));
  }
  get era(): Return['era'] {
    if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
    return ES.CalendarEra(GetSlot(this, CALENDAR), this);
  }
  get eraYear(): Return['eraYear'] {
    if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
    return ES.CalendarEraYear(GetSlot(this, CALENDAR), this);
  }
  get year(): Return['year'] {
    if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
    return ES.CalendarYear(GetSlot(this, CALENDAR), this);
  }
  get month(): Return['month'] {
    if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
    return ES.CalendarMonth(GetSlot(this, CALENDAR), this);
  }
  get monthCode(): Return['monthCode'] {
    if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
    return ES.CalendarMonthCode(GetSlot(this, CALENDAR), this);
  }
  get day(): Return['day'] {
    if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
    const calendarRec = new CalendarMethodRecord(GetSlot(this, CALENDAR), ['day']);
    return ES.CalendarDay(calendarRec, this);
  }
  get dayOfWeek(): Return['dayOfWeek'] {
    if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
    return ES.CalendarDayOfWeek(GetSlot(this, CALENDAR), this);
  }
  get dayOfYear(): Return['dayOfYear'] {
    if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
    return ES.CalendarDayOfYear(GetSlot(this, CALENDAR), this);
  }
  get weekOfYear(): Return['weekOfYear'] {
    if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
    return ES.CalendarWeekOfYear(GetSlot(this, CALENDAR), this);
  }
  get yearOfWeek(): Return['weekOfYear'] {
    if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
    return ES.CalendarYearOfWeek(GetSlot(this, CALENDAR), this);
  }
  get daysInWeek(): Return['daysInWeek'] {
    if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
    return ES.CalendarDaysInWeek(GetSlot(this, CALENDAR), this);
  }
  get daysInMonth(): Return['daysInMonth'] {
    if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
    return ES.CalendarDaysInMonth(GetSlot(this, CALENDAR), this);
  }
  get daysInYear(): Return['daysInYear'] {
    if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
    return ES.CalendarDaysInYear(GetSlot(this, CALENDAR), this);
  }
  get monthsInYear(): Return['monthsInYear'] {
    if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
    return ES.CalendarMonthsInYear(GetSlot(this, CALENDAR), this);
  }
  get inLeapYear(): Return['inLeapYear'] {
    if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
    return ES.CalendarInLeapYear(GetSlot(this, CALENDAR), this);
  }
  with(temporalDateLike: Params['with'][0], options: Params['with'][1] = undefined): Return['with'] {
    if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
    if (!ES.IsObject(temporalDateLike)) {
      throw new TypeError('invalid argument');
    }
    ES.RejectTemporalLikeObject(temporalDateLike);
    const resolvedOptions = ES.SnapshotOwnProperties(ES.GetOptionsObject(options), null);

    const calendarRec = new CalendarMethodRecord(GetSlot(this, CALENDAR), ['dateFromFields', 'fields', 'mergeFields']);
    let { fields, fieldNames } = ES.PrepareCalendarFieldsAndFieldNames(calendarRec, this, [
      'day',
      'month',
      'monthCode',
      'year'
    ]);
    const partialDate = ES.PrepareTemporalFields(temporalDateLike, fieldNames, 'partial');
    fields = ES.CalendarMergeFields(calendarRec, fields, partialDate);
    fields = ES.PrepareTemporalFields(fields, fieldNames, []);

    return ES.CalendarDateFromFields(calendarRec, fields, resolvedOptions);
  }
  withCalendar(calendarParam: Params['withCalendar'][0]): Return['withCalendar'] {
    if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
    const calendar = ES.ToTemporalCalendarSlotValue(calendarParam);
    return ES.CreateTemporalDate(GetSlot(this, ISO_YEAR), GetSlot(this, ISO_MONTH), GetSlot(this, ISO_DAY), calendar);
  }
  add(temporalDurationLike: Params['add'][0], optionsParam: Params['add'][1] = undefined): Return['add'] {
    if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');

    const duration = ES.ToTemporalDuration(temporalDurationLike);
    const options = ES.GetOptionsObject(optionsParam);

    const calendarRec = new CalendarMethodRecord(GetSlot(this, CALENDAR), ['dateAdd']);
    return ES.AddDate(calendarRec, this, duration, options);
  }
  subtract(
    temporalDurationLike: Params['subtract'][0],
    optionsParam: Params['subtract'][1] = undefined
  ): Return['subtract'] {
    if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');

    const duration = ES.CreateNegatedTemporalDuration(ES.ToTemporalDuration(temporalDurationLike));
    const options = ES.GetOptionsObject(optionsParam);

    const calendarRec = new CalendarMethodRecord(GetSlot(this, CALENDAR), ['dateAdd']);
    return ES.AddDate(calendarRec, this, duration, options);
  }
  until(other: Params['until'][0], options: Params['until'][1] = undefined): Return['until'] {
    if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
    return ES.DifferenceTemporalPlainDate('until', this, other, options);
  }
  since(other: Params['since'][0], options: Params['since'][1] = undefined): Return['since'] {
    if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
    return ES.DifferenceTemporalPlainDate('since', this, other, options);
  }
  equals(otherParam: Params['equals'][0]): Return['equals'] {
    if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
    const other = ES.ToTemporalDate(otherParam);
    if (GetSlot(this, ISO_YEAR) !== GetSlot(other, ISO_YEAR)) return false;
    if (GetSlot(this, ISO_MONTH) !== GetSlot(other, ISO_MONTH)) return false;
    if (GetSlot(this, ISO_DAY) !== GetSlot(other, ISO_DAY)) return false;
    return ES.CalendarEquals(GetSlot(this, CALENDAR), GetSlot(other, CALENDAR));
  }
  toString(optionsParam: Params['toString'][0] = undefined): string {
    if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
    const options = ES.GetOptionsObject(optionsParam);
    const showCalendar = ES.GetTemporalShowCalendarNameOption(options);
    return ES.TemporalDateToString(this, showCalendar);
  }
  toJSON(): Return['toJSON'] {
    if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
    return ES.TemporalDateToString(this);
  }
  toLocaleString(
    locales: Params['toLocaleString'][0] = undefined,
    options: Params['toLocaleString'][1] = undefined
  ): string {
    if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
    return new DateTimeFormat(locales, options).format(this);
  }
  valueOf(): never {
    ES.ValueOfThrows('PlainDate');
  }
  toPlainDateTime(temporalTimeParam: Params['toPlainDateTime'][0] = undefined): Return['toPlainDateTime'] {
    if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
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
    if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');

    type TimeZoneAndPlainTimeProps = Exclude<typeof item, string | Temporal.TimeZoneProtocol>;
    let timeZone: Temporal.TimeZoneLike, temporalTime: TimeZoneAndPlainTimeProps['plainTime'];
    if (ES.IsObject(item)) {
      if (ES.IsTemporalTimeZone(item)) {
        timeZone = item;
      } else {
        const timeZoneLike = (item as TimeZoneAndPlainTimeProps).timeZone;
        if (timeZoneLike === undefined) {
          ES.uncheckedAssertNarrowedType<Temporal.TimeZoneProtocol>(
            item,
            "if no timeZone property, then assume it's a custom time zone object"
          );
          timeZone = ES.ToTemporalTimeZoneSlotValue(item);
        } else {
          timeZone = ES.ToTemporalTimeZoneSlotValue(timeZoneLike);
          ES.uncheckedAssertNarrowedType<TimeZoneAndPlainTimeProps>(
            item,
            "it's a property bag with a timeZone and optional plainTime"
          );
          temporalTime = item.plainTime;
        }
      }
    } else {
      timeZone = ES.ToTemporalTimeZoneSlotValue(item);
    }

    const calendar = GetSlot(this, CALENDAR);
    temporalTime = ES.ToTemporalTimeOrMidnight(temporalTime);
    ES.uncheckedAssertNarrowedType<Temporal.PlainTime>(
      temporalTime,
      'ToTemporalTimeOrMidnight above always returns a PlainTime'
    );
    const dt = ES.CreateTemporalDateTime(
      GetSlot(this, ISO_YEAR),
      GetSlot(this, ISO_MONTH),
      GetSlot(this, ISO_DAY),
      GetSlot(temporalTime, ISO_HOUR),
      GetSlot(temporalTime, ISO_MINUTE),
      GetSlot(temporalTime, ISO_SECOND),
      GetSlot(temporalTime, ISO_MILLISECOND),
      GetSlot(temporalTime, ISO_MICROSECOND),
      GetSlot(temporalTime, ISO_NANOSECOND),
      calendar
    );
    const timeZoneRec = new TimeZoneMethodRecord(timeZone, ['getOffsetNanosecondsFor', 'getPossibleInstantsFor']);
    const instant = ES.GetInstantFor(timeZoneRec, dt, 'compatible');
    return ES.CreateTemporalZonedDateTime(GetSlot(instant, EPOCHNANOSECONDS), timeZone, calendar);
  }
  toPlainYearMonth(): Return['toPlainYearMonth'] {
    if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
    const calendarRec = new CalendarMethodRecord(GetSlot(this, CALENDAR), ['fields', 'yearMonthFromFields']);
    const fields = ES.PrepareCalendarFields(calendarRec, this, ['monthCode', 'year'], [], []);
    return ES.CalendarYearMonthFromFields(calendarRec, fields);
  }
  toPlainMonthDay(): Return['toPlainMonthDay'] {
    if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
    const calendarRec = new CalendarMethodRecord(GetSlot(this, CALENDAR), ['fields', 'monthDayFromFields']);
    const fields = ES.PrepareCalendarFields(calendarRec, this, ['day', 'monthCode'], [], []);
    return ES.CalendarMonthDayFromFields(calendarRec, fields);
  }
  getISOFields(): Return['getISOFields'] {
    if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
    return {
      calendar: GetSlot(this, CALENDAR),
      isoDay: GetSlot(this, ISO_DAY),
      isoMonth: GetSlot(this, ISO_MONTH),
      isoYear: GetSlot(this, ISO_YEAR)
    };
  }
  getCalendar(): Return['getCalendar'] {
    if (!ES.IsTemporalDate(this)) throw new TypeError('invalid receiver');
    return ES.ToTemporalCalendarObject(GetSlot(this, CALENDAR));
  }

  static from(item: Params['from'][0], optionsParam: Params['from'][1] = undefined): Return['from'] {
    const options = ES.GetOptionsObject(optionsParam);
    if (ES.IsTemporalDate(item)) {
      ES.GetTemporalOverflowOption(options); // validate and ignore
      return ES.CreateTemporalDate(
        GetSlot(item, ISO_YEAR),
        GetSlot(item, ISO_MONTH),
        GetSlot(item, ISO_DAY),
        GetSlot(item, CALENDAR)
      );
    }
    return ES.ToTemporalDate(item, options);
  }
  static compare(oneParam: Params['compare'][0], twoParam: Params['compare'][1]): Return['compare'] {
    const one = ES.ToTemporalDate(oneParam);
    const two = ES.ToTemporalDate(twoParam);
    return ES.CompareISODate(
      GetSlot(one, ISO_YEAR),
      GetSlot(one, ISO_MONTH),
      GetSlot(one, ISO_DAY),
      GetSlot(two, ISO_YEAR),
      GetSlot(two, ISO_MONTH),
      GetSlot(two, ISO_DAY)
    );
  }
  [Symbol.toStringTag]!: 'Temporal.PlainDate';
}

MakeIntrinsicClass(PlainDate, 'Temporal.PlainDate');
