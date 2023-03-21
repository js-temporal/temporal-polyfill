import * as ES from './ecmascript';
import { GetIntrinsic, MakeIntrinsicClass } from './intrinsicclass';
import {
  CALENDAR,
  EPOCHNANOSECONDS,
  ISO_HOUR,
  INSTANT,
  ISO_DAY,
  ISO_MONTH,
  ISO_YEAR,
  ISO_MICROSECOND,
  ISO_MILLISECOND,
  ISO_MINUTE,
  ISO_NANOSECOND,
  ISO_SECOND,
  TIME_ZONE,
  GetSlot
} from './slots';
import type { Temporal } from '..';
import { DateTimeFormat } from './intl';
import type { ZonedDateTimeParams as Params, ZonedDateTimeReturn as Return } from './internaltypes';

import JSBI from 'jsbi';
import { BILLION, MILLION, THOUSAND, ZERO, HOUR_NANOS } from './ecmascript';

const customResolvedOptions = DateTimeFormat.prototype.resolvedOptions as Intl.DateTimeFormat['resolvedOptions'];
const ObjectCreate = Object.create;

export class ZonedDateTime implements Temporal.ZonedDateTime {
  constructor(
    epochNanosecondsParam: bigint | JSBI,
    timeZoneParam: string | Temporal.TimeZoneProtocol,
    calendarParam: string | Temporal.CalendarProtocol = 'iso8601'
  ) {
    // Note: if the argument is not passed, ToBigInt(undefined) will throw. This check exists only
    //       to improve the error message.
    //       ToTemporalTimeZoneSlotValue(undefined) has a clear enough message.
    if (arguments.length < 1) {
      throw new TypeError('missing argument: epochNanoseconds is required');
    }
    const epochNanoseconds = ES.ToBigInt(epochNanosecondsParam);
    const timeZone = ES.ToTemporalTimeZoneSlotValue(timeZoneParam);
    const calendar = ES.ToTemporalCalendarSlotValue(calendarParam);

    ES.CreateTemporalZonedDateTimeSlots(this, epochNanoseconds, timeZone, calendar);
  }
  get calendarId(): Return['calendarId'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return ES.ToTemporalCalendarIdentifier(GetSlot(this, CALENDAR));
  }
  get timeZoneId(): Return['timeZoneId'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return ES.ToTemporalTimeZoneIdentifier(GetSlot(this, TIME_ZONE));
  }
  get year(): Return['year'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return ES.CalendarYear(GetSlot(this, CALENDAR), dateTime(this));
  }
  get month(): Return['month'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return ES.CalendarMonth(GetSlot(this, CALENDAR), dateTime(this));
  }
  get monthCode(): Return['monthCode'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return ES.CalendarMonthCode(GetSlot(this, CALENDAR), dateTime(this));
  }
  get day(): Return['day'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return ES.CalendarDay(GetSlot(this, CALENDAR), dateTime(this));
  }
  get hour(): Return['hour'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return GetSlot(dateTime(this), ISO_HOUR);
  }
  get minute(): Return['minute'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return GetSlot(dateTime(this), ISO_MINUTE);
  }
  get second(): Return['second'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return GetSlot(dateTime(this), ISO_SECOND);
  }
  get millisecond(): Return['millisecond'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return GetSlot(dateTime(this), ISO_MILLISECOND);
  }
  get microsecond(): Return['microsecond'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return GetSlot(dateTime(this), ISO_MICROSECOND);
  }
  get nanosecond(): Return['nanosecond'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return GetSlot(dateTime(this), ISO_NANOSECOND);
  }
  get era(): Return['era'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return ES.CalendarEra(GetSlot(this, CALENDAR), dateTime(this));
  }
  get eraYear(): Return['eraYear'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return ES.CalendarEraYear(GetSlot(this, CALENDAR), dateTime(this));
  }
  get epochSeconds(): Return['epochSeconds'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    const value = GetSlot(this, EPOCHNANOSECONDS);
    return JSBI.toNumber(ES.BigIntFloorDiv(value, BILLION));
  }
  get epochMilliseconds(): Return['epochMilliseconds'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    const value = GetSlot(this, EPOCHNANOSECONDS);
    return JSBI.toNumber(ES.BigIntFloorDiv(value, MILLION));
  }
  get epochMicroseconds(): Return['epochMicroseconds'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    const value = GetSlot(this, EPOCHNANOSECONDS);
    return ES.ToBigIntExternal(ES.BigIntFloorDiv(value, THOUSAND));
  }
  get epochNanoseconds(): Return['epochNanoseconds'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return ES.ToBigIntExternal(GetSlot(this, EPOCHNANOSECONDS));
  }
  get dayOfWeek(): Return['dayOfWeek'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return ES.CalendarDayOfWeek(GetSlot(this, CALENDAR), dateTime(this));
  }
  get dayOfYear(): Return['dayOfYear'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return ES.CalendarDayOfYear(GetSlot(this, CALENDAR), dateTime(this));
  }
  get weekOfYear(): Return['weekOfYear'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return ES.CalendarWeekOfYear(GetSlot(this, CALENDAR), dateTime(this));
  }
  get yearOfWeek(): Return['yearOfWeek'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return ES.CalendarYearOfWeek(GetSlot(this, CALENDAR), dateTime(this));
  }
  get hoursInDay(): Return['hoursInDay'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    const dt = dateTime(this);
    const DateTime = GetIntrinsic('%Temporal.PlainDateTime%');
    const year = GetSlot(dt, ISO_YEAR);
    const month = GetSlot(dt, ISO_MONTH);
    const day = GetSlot(dt, ISO_DAY);
    const today = new DateTime(year, month, day, 0, 0, 0, 0, 0, 0);
    const tomorrowFields = ES.AddISODate(year, month, day, 0, 0, 0, 1, 'reject');
    const tomorrow = new DateTime(tomorrowFields.year, tomorrowFields.month, tomorrowFields.day, 0, 0, 0, 0, 0, 0);
    const timeZone = GetSlot(this, TIME_ZONE);
    const todayNs = GetSlot(ES.GetInstantFor(timeZone, today, 'compatible'), EPOCHNANOSECONDS);
    const tomorrowNs = GetSlot(ES.GetInstantFor(timeZone, tomorrow, 'compatible'), EPOCHNANOSECONDS);
    const diffNs = JSBI.subtract(tomorrowNs, todayNs);
    return ES.BigIntDivideToNumber(diffNs, HOUR_NANOS);
  }
  get daysInWeek(): Return['daysInWeek'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return ES.CalendarDaysInWeek(GetSlot(this, CALENDAR), dateTime(this));
  }
  get daysInMonth(): Return['daysInMonth'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return ES.CalendarDaysInMonth(GetSlot(this, CALENDAR), dateTime(this));
  }
  get daysInYear(): Return['daysInYear'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return ES.CalendarDaysInYear(GetSlot(this, CALENDAR), dateTime(this));
  }
  get monthsInYear(): Return['monthsInYear'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return ES.CalendarMonthsInYear(GetSlot(this, CALENDAR), dateTime(this));
  }
  get inLeapYear(): Return['inLeapYear'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return ES.CalendarInLeapYear(GetSlot(this, CALENDAR), dateTime(this));
  }
  get offset(): Return['offset'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return ES.GetOffsetStringFor(GetSlot(this, TIME_ZONE), GetSlot(this, INSTANT));
  }
  get offsetNanoseconds(): Return['offsetNanoseconds'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return ES.GetOffsetNanosecondsFor(GetSlot(this, TIME_ZONE), GetSlot(this, INSTANT));
  }
  with(temporalZonedDateTimeLike: Params['with'][0], optionsParam: Params['with'][1] = undefined): Return['with'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    if (!ES.IsObject(temporalZonedDateTimeLike)) {
      throw new TypeError('invalid zoned-date-time-like');
    }
    ES.RejectTemporalLikeObject(temporalZonedDateTimeLike);
    const options = ES.GetOptionsObject(optionsParam);

    const calendar = GetSlot(this, CALENDAR);
    let fieldNames: (keyof Temporal.ZonedDateTimeLike)[] = ES.CalendarFields(calendar, [
      'day',
      'hour',
      'microsecond',
      'millisecond',
      'minute',
      'month',
      'monthCode',
      'nanosecond',
      'second',
      'year'
    ] as const);
    fieldNames.push('offset');
    let fields = ES.PrepareTemporalFields(this, fieldNames, ['offset']);
    const partialZonedDateTime = ES.PrepareTemporalFields(temporalZonedDateTimeLike, fieldNames, 'partial');
    fields = ES.CalendarMergeFields(calendar, fields, partialZonedDateTime);
    fields = ES.PrepareTemporalFields(fields, fieldNames, ['offset']);

    const disambiguation = ES.ToTemporalDisambiguation(options);
    const offset = ES.ToTemporalOffset(options, 'prefer');

    let { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } =
      ES.InterpretTemporalDateTimeFields(calendar, fields, options);
    const offsetNs = ES.ParseTimeZoneOffsetString(fields.offset);
    const timeZone = GetSlot(this, TIME_ZONE);
    const epochNanoseconds = ES.InterpretISODateTimeOffset(
      year,
      month,
      day,
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond,
      'option',
      offsetNs,
      timeZone,
      disambiguation,
      offset,
      /* matchMinute = */ false
    );

    return ES.CreateTemporalZonedDateTime(epochNanoseconds, timeZone, calendar);
  }
  withPlainDate(temporalDateParam: Params['withPlainDate'][0]): Return['withPlainDate'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');

    const temporalDate = ES.ToTemporalDate(temporalDateParam);

    const year = GetSlot(temporalDate, ISO_YEAR);
    const month = GetSlot(temporalDate, ISO_MONTH);
    const day = GetSlot(temporalDate, ISO_DAY);
    let calendar = GetSlot(temporalDate, CALENDAR);
    const thisDt = dateTime(this);
    const hour = GetSlot(thisDt, ISO_HOUR);
    const minute = GetSlot(thisDt, ISO_MINUTE);
    const second = GetSlot(thisDt, ISO_SECOND);
    const millisecond = GetSlot(thisDt, ISO_MILLISECOND);
    const microsecond = GetSlot(thisDt, ISO_MICROSECOND);
    const nanosecond = GetSlot(thisDt, ISO_NANOSECOND);

    calendar = ES.ConsolidateCalendars(GetSlot(this, CALENDAR), calendar);
    const timeZone = GetSlot(this, TIME_ZONE);
    const PlainDateTime = GetIntrinsic('%Temporal.PlainDateTime%');
    const dt = new PlainDateTime(
      year,
      month,
      day,
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond,
      calendar
    );
    const instant = ES.GetInstantFor(timeZone, dt, 'compatible');
    return ES.CreateTemporalZonedDateTime(GetSlot(instant, EPOCHNANOSECONDS), timeZone, calendar);
  }
  withPlainTime(temporalTimeParam: Params['withPlainTime'][0] = undefined): Return['withPlainTime'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');

    const PlainTime = GetIntrinsic('%Temporal.PlainTime%');
    const temporalTime = temporalTimeParam === undefined ? new PlainTime() : ES.ToTemporalTime(temporalTimeParam);

    const thisDt = dateTime(this);
    const year = GetSlot(thisDt, ISO_YEAR);
    const month = GetSlot(thisDt, ISO_MONTH);
    const day = GetSlot(thisDt, ISO_DAY);
    const calendar = GetSlot(this, CALENDAR);
    const hour = GetSlot(temporalTime, ISO_HOUR);
    const minute = GetSlot(temporalTime, ISO_MINUTE);
    const second = GetSlot(temporalTime, ISO_SECOND);
    const millisecond = GetSlot(temporalTime, ISO_MILLISECOND);
    const microsecond = GetSlot(temporalTime, ISO_MICROSECOND);
    const nanosecond = GetSlot(temporalTime, ISO_NANOSECOND);

    const timeZone = GetSlot(this, TIME_ZONE);
    const PlainDateTime = GetIntrinsic('%Temporal.PlainDateTime%');
    const dt = new PlainDateTime(
      year,
      month,
      day,
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond,
      calendar
    );
    const instant = ES.GetInstantFor(timeZone, dt, 'compatible');
    return ES.CreateTemporalZonedDateTime(GetSlot(instant, EPOCHNANOSECONDS), timeZone, calendar);
  }
  withTimeZone(timeZoneParam: Params['withTimeZone'][0]): Return['withTimeZone'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    const timeZone = ES.ToTemporalTimeZoneSlotValue(timeZoneParam);
    return ES.CreateTemporalZonedDateTime(GetSlot(this, EPOCHNANOSECONDS), timeZone, GetSlot(this, CALENDAR));
  }
  withCalendar(calendarParam: Params['withCalendar'][0]): Return['withCalendar'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    const calendar = ES.ToTemporalCalendarSlotValue(calendarParam);
    return ES.CreateTemporalZonedDateTime(GetSlot(this, EPOCHNANOSECONDS), GetSlot(this, TIME_ZONE), calendar);
  }
  add(temporalDurationLike: Params['add'][0], options: Params['add'][1] = undefined): Return['add'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return ES.AddDurationToOrSubtractDurationFromZonedDateTime('add', this, temporalDurationLike, options);
  }
  subtract(
    temporalDurationLike: Params['subtract'][0],
    options: Params['subtract'][1] = undefined
  ): Return['subtract'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return ES.AddDurationToOrSubtractDurationFromZonedDateTime('subtract', this, temporalDurationLike, options);
  }
  until(other: Params['until'][0], options: Params['until'][1] = undefined): Return['until'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return ES.DifferenceTemporalZonedDateTime('until', this, other, options);
  }
  since(other: Params['since'][0], options: Params['since'][1] = undefined): Return['since'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return ES.DifferenceTemporalZonedDateTime('since', this, other, options);
  }
  round(roundToParam: Params['round'][0]): Return['round'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    if (roundToParam === undefined) throw new TypeError('options parameter is required');
    const roundTo =
      typeof roundToParam === 'string'
        ? (ES.CreateOnePropObject('smallestUnit', roundToParam) as Exclude<typeof roundToParam, string>)
        : ES.GetOptionsObject(roundToParam);
    const roundingIncrement = ES.ToTemporalRoundingIncrement(roundTo);
    const roundingMode = ES.ToTemporalRoundingMode(roundTo, 'halfExpand');
    const smallestUnit = ES.GetTemporalUnit(roundTo, 'smallestUnit', 'time', ES.REQUIRED, ['day']);
    const maximumIncrements = {
      day: 1,
      hour: 24,
      minute: 60,
      second: 60,
      millisecond: 1000,
      microsecond: 1000,
      nanosecond: 1000
    };
    const maximum = maximumIncrements[smallestUnit];
    const inclusive = maximum === 1;
    ES.ValidateTemporalRoundingIncrement(roundingIncrement, maximum, inclusive);

    // first, round the underlying DateTime fields
    const dt = dateTime(this);
    let year = GetSlot(dt, ISO_YEAR);
    let month = GetSlot(dt, ISO_MONTH);
    let day = GetSlot(dt, ISO_DAY);
    let hour = GetSlot(dt, ISO_HOUR);
    let minute = GetSlot(dt, ISO_MINUTE);
    let second = GetSlot(dt, ISO_SECOND);
    let millisecond = GetSlot(dt, ISO_MILLISECOND);
    let microsecond = GetSlot(dt, ISO_MICROSECOND);
    let nanosecond = GetSlot(dt, ISO_NANOSECOND);

    const DateTime = GetIntrinsic('%Temporal.PlainDateTime%');
    const timeZone = GetSlot(this, TIME_ZONE);
    const calendar = GetSlot(this, CALENDAR);
    const dtStart = new DateTime(GetSlot(dt, ISO_YEAR), GetSlot(dt, ISO_MONTH), GetSlot(dt, ISO_DAY), 0, 0, 0, 0, 0, 0);
    const instantStart = ES.GetInstantFor(timeZone, dtStart, 'compatible');
    const endNs = ES.AddZonedDateTime(instantStart, timeZone, calendar, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0);
    const dayLengthNs = JSBI.subtract(endNs, JSBI.BigInt(GetSlot(instantStart, EPOCHNANOSECONDS)));
    if (JSBI.lessThanOrEqual(dayLengthNs, ZERO)) {
      throw new RangeError('cannot round a ZonedDateTime in a calendar with zero or negative length days');
    }
    ({ year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } = ES.RoundISODateTime(
      year,
      month,
      day,
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond,
      roundingIncrement,
      smallestUnit,
      roundingMode,
      // Days are guaranteed to be shorter than Number.MAX_SAFE_INTEGER
      // (which can hold up to 104 days in nanoseconds)
      JSBI.toNumber(dayLengthNs)
    ));

    // Now reset all DateTime fields but leave the TimeZone. The offset will
    // also be retained if the new date/time values are still OK with the old
    // offset. Otherwise the offset will be changed to be compatible with the
    // new date/time values. If DST disambiguation is required, the `compatible`
    // disambiguation algorithm will be used.
    const offsetNs = ES.GetOffsetNanosecondsFor(timeZone, GetSlot(this, INSTANT));
    const epochNanoseconds = ES.InterpretISODateTimeOffset(
      year,
      month,
      day,
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond,
      'option',
      offsetNs,
      timeZone,
      'compatible',
      'prefer',
      /* matchMinute = */ false
    );

    return ES.CreateTemporalZonedDateTime(epochNanoseconds, timeZone, GetSlot(this, CALENDAR));
  }
  equals(otherParam: Params['equals'][0]): Return['equals'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    const other = ES.ToTemporalZonedDateTime(otherParam);
    const one = GetSlot(this, EPOCHNANOSECONDS);
    const two = GetSlot(other, EPOCHNANOSECONDS);
    if (!JSBI.equal(JSBI.BigInt(one), JSBI.BigInt(two))) return false;
    if (!ES.TimeZoneEquals(GetSlot(this, TIME_ZONE), GetSlot(other, TIME_ZONE))) return false;
    return ES.CalendarEquals(GetSlot(this, CALENDAR), GetSlot(other, CALENDAR));
  }
  toString(optionsParam: Params['toString'][0] = undefined): string {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    const options = ES.GetOptionsObject(optionsParam);
    const showCalendar = ES.ToCalendarNameOption(options);
    const digits = ES.ToFractionalSecondDigits(options);
    const showOffset = ES.ToShowOffsetOption(options);
    const roundingMode = ES.ToTemporalRoundingMode(options, 'trunc');
    const smallestUnit = ES.GetTemporalUnit(options, 'smallestUnit', 'time', undefined);
    if (smallestUnit === 'hour') throw new RangeError('smallestUnit must be a time unit other than "hour"');
    const showTimeZone = ES.ToTimeZoneNameOption(options);
    const { precision, unit, increment } = ES.ToSecondsStringPrecisionRecord(smallestUnit, digits);
    return ES.TemporalZonedDateTimeToString(this, precision, showCalendar, showTimeZone, showOffset, {
      unit,
      increment,
      roundingMode
    });
  }
  toLocaleString(
    locales: Params['toLocaleString'][0] = undefined,
    optionsParam: Params['toLocaleString'][1] = undefined
  ): string {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    const options = ES.GetOptionsObject(optionsParam);

    const optionsCopy = ObjectCreate(null);
    // This is not quite per specification, but this polyfill's DateTimeFormat
    // already doesn't match the InitializeDateTimeFormat operation, and the
    // access order might change anyway;
    // see https://github.com/tc39/ecma402/issues/747
    ES.CopyDataProperties(optionsCopy, options, ['timeZone']);

    if (options.timeZone !== undefined) {
      throw new TypeError('ZonedDateTime toLocaleString does not accept a timeZone option');
    }

    if (
      optionsCopy.year === undefined &&
      optionsCopy.month === undefined &&
      optionsCopy.day === undefined &&
      optionsCopy.weekday === undefined &&
      optionsCopy.dateStyle === undefined &&
      optionsCopy.hour === undefined &&
      optionsCopy.minute === undefined &&
      optionsCopy.second === undefined &&
      optionsCopy.timeStyle === undefined &&
      optionsCopy.dayPeriod === undefined &&
      optionsCopy.timeZoneName === undefined
    ) {
      optionsCopy.timeZoneName = 'short';
      // The rest of the defaults will be filled in by formatting the Instant
    }

    let timeZone = ES.ToTemporalTimeZoneIdentifier(GetSlot(this, TIME_ZONE));
    if (ES.IsTimeZoneOffsetString(timeZone)) {
      // Note: https://github.com/tc39/ecma402/issues/683 will remove this
      throw new RangeError('toLocaleString does not support offset string time zones');
    }
    timeZone = ES.GetCanonicalTimeZoneIdentifier(timeZone);
    optionsCopy.timeZone = timeZone;

    const formatter = new DateTimeFormat(locales, optionsCopy);

    const localeCalendarIdentifier = ES.Call(customResolvedOptions, formatter, []).calendar;
    const calendarIdentifier = ES.ToTemporalCalendarIdentifier(GetSlot(this, CALENDAR));
    if (
      calendarIdentifier !== 'iso8601' &&
      localeCalendarIdentifier !== 'iso8601' &&
      localeCalendarIdentifier !== calendarIdentifier
    ) {
      throw new RangeError(
        `cannot format ZonedDateTime with calendar ${calendarIdentifier}` +
          ` in locale with calendar ${localeCalendarIdentifier}`
      );
    }

    return formatter.format(GetSlot(this, INSTANT));
  }
  toJSON(): Return['toJSON'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return ES.TemporalZonedDateTimeToString(this, 'auto');
  }
  valueOf(): never {
    throw new TypeError('use compare() or equals() to compare Temporal.ZonedDateTime');
  }
  startOfDay(): Return['startOfDay'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    const dt = dateTime(this);
    const DateTime = GetIntrinsic('%Temporal.PlainDateTime%');
    const calendar = GetSlot(this, CALENDAR);
    const dtStart = new DateTime(
      GetSlot(dt, ISO_YEAR),
      GetSlot(dt, ISO_MONTH),
      GetSlot(dt, ISO_DAY),
      0,
      0,
      0,
      0,
      0,
      0,
      calendar
    );
    const timeZone = GetSlot(this, TIME_ZONE);
    const instant = ES.GetInstantFor(timeZone, dtStart, 'compatible');
    return ES.CreateTemporalZonedDateTime(GetSlot(instant, EPOCHNANOSECONDS), timeZone, calendar);
  }
  toInstant(): Return['toInstant'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
    return new TemporalInstant(GetSlot(this, EPOCHNANOSECONDS));
  }
  toPlainDate(): Return['toPlainDate'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return ES.TemporalDateTimeToDate(dateTime(this));
  }
  toPlainTime(): Return['toPlainTime'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return ES.TemporalDateTimeToTime(dateTime(this));
  }
  toPlainDateTime(): Return['toPlainDateTime'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return dateTime(this);
  }
  toPlainYearMonth(): Return['toPlainYearMonth'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    const calendar = GetSlot(this, CALENDAR);
    const fieldNames = ES.CalendarFields(calendar, ['monthCode', 'year'] as const);
    const fields = ES.PrepareTemporalFields(this, fieldNames, []);
    return ES.CalendarYearMonthFromFields(calendar, fields);
  }
  toPlainMonthDay(): Return['toPlainMonthDay'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    const calendar = GetSlot(this, CALENDAR);
    const fieldNames = ES.CalendarFields(calendar, ['day', 'monthCode'] as const);
    const fields = ES.PrepareTemporalFields(this, fieldNames, []);
    return ES.CalendarMonthDayFromFields(calendar, fields);
  }
  getISOFields(): Return['getISOFields'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    const dt = dateTime(this);
    const tz = GetSlot(this, TIME_ZONE);
    return {
      calendar: GetSlot(this, CALENDAR),
      isoDay: GetSlot(dt, ISO_DAY),
      isoHour: GetSlot(dt, ISO_HOUR),
      isoMicrosecond: GetSlot(dt, ISO_MICROSECOND),
      isoMillisecond: GetSlot(dt, ISO_MILLISECOND),
      isoMinute: GetSlot(dt, ISO_MINUTE),
      isoMonth: GetSlot(dt, ISO_MONTH),
      isoNanosecond: GetSlot(dt, ISO_NANOSECOND),
      isoSecond: GetSlot(dt, ISO_SECOND),
      isoYear: GetSlot(dt, ISO_YEAR),
      offset: ES.GetOffsetStringFor(tz, GetSlot(this, INSTANT)),
      timeZone: tz
    };
  }
  getCalendar(): Return['getCalendar'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return ES.ToTemporalCalendarObject(GetSlot(this, CALENDAR));
  }
  getTimeZone(): Return['getTimeZone'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return ES.ToTemporalTimeZoneObject(GetSlot(this, TIME_ZONE));
  }

  static from(item: Params['from'][0], optionsParam: Params['from'][1] = undefined): Return['from'] {
    const options = ES.GetOptionsObject(optionsParam);
    if (ES.IsTemporalZonedDateTime(item)) {
      ES.ToTemporalDisambiguation(options); // validate and ignore
      ES.ToTemporalOffset(options, 'reject');
      ES.ToTemporalOverflow(options);
      return ES.CreateTemporalZonedDateTime(
        GetSlot(item, EPOCHNANOSECONDS),
        GetSlot(item, TIME_ZONE),
        GetSlot(item, CALENDAR)
      );
    }
    return ES.ToTemporalZonedDateTime(item, options);
  }
  static compare(oneParam: Params['compare'][0], twoParam: Params['compare'][1]): Return['compare'] {
    const one = ES.ToTemporalZonedDateTime(oneParam);
    const two = ES.ToTemporalZonedDateTime(twoParam);
    const ns1 = GetSlot(one, EPOCHNANOSECONDS);
    const ns2 = GetSlot(two, EPOCHNANOSECONDS);
    if (JSBI.lessThan(JSBI.BigInt(ns1), JSBI.BigInt(ns2))) return -1;
    if (JSBI.greaterThan(JSBI.BigInt(ns1), JSBI.BigInt(ns2))) return 1;
    return 0;
  }
  [Symbol.toStringTag]!: 'Temporal.ZonedDateTime';
}

MakeIntrinsicClass(ZonedDateTime, 'Temporal.ZonedDateTime');

function dateTime(zdt: Temporal.ZonedDateTime) {
  return ES.GetPlainDateTimeFor(GetSlot(zdt, TIME_ZONE), GetSlot(zdt, INSTANT), GetSlot(zdt, CALENDAR));
}
