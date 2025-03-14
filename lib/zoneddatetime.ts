import * as ES from './ecmascript';
import { GetIntrinsic, MakeIntrinsicClass } from './intrinsicclass';
import {
  CALENDAR,
  EPOCHNANOSECONDS,
  ISO_HOUR,
  ISO_MICROSECOND,
  ISO_MILLISECOND,
  ISO_MINUTE,
  ISO_NANOSECOND,
  ISO_SECOND,
  TIME_ZONE,
  GetSlot
} from './slots';
import { TimeDuration } from './timeduration';
import type { Temporal } from '..';
import { DateTimeFormat } from './intl';
import type { BuiltinCalendarId, ZonedDateTimeParams as Params, ZonedDateTimeReturn as Return } from './internaltypes';

import JSBI from 'jsbi';
import { MILLION, HOUR_NANOS, BigIntFloorDiv } from './bigintmath';

const customResolvedOptions = DateTimeFormat.prototype.resolvedOptions as Intl.DateTimeFormat['resolvedOptions'];
const ObjectCreate = Object.create;

export class ZonedDateTime implements Temporal.ZonedDateTime {
  constructor(epochNanosecondsParam: bigint | JSBI, timeZoneParam: string, calendarParam = 'iso8601') {
    // Note: if the argument is not passed, ToBigInt(undefined) will throw. This check exists only
    //       to improve the error message.
    if (arguments.length < 1) {
      throw new TypeError('missing argument: epochNanoseconds is required');
    }
    const epochNanoseconds = ES.ToBigInt(epochNanosecondsParam);
    let timeZone = ES.RequireString(timeZoneParam);
    const { tzName, offsetMinutes } = ES.ParseTimeZoneIdentifier(timeZone);
    if (offsetMinutes === undefined) {
      // if offsetMinutes is undefined, then tzName must be present
      const record = ES.GetAvailableNamedTimeZoneIdentifier(tzName);
      if (!record) throw new RangeError(`unknown time zone ${tzName}`);
      timeZone = record.identifier;
    } else {
      timeZone = ES.FormatOffsetTimeZoneIdentifier(offsetMinutes);
    }
    let calendar = calendarParam === undefined ? 'iso8601' : ES.RequireString(calendarParam);
    if (!ES.IsBuiltinCalendar(calendar)) throw new RangeError(`unknown calendar ${calendar}`);
    calendar = ES.CanonicalizeCalendar(calendar);
    ES.uncheckedAssertNarrowedType<BuiltinCalendarId>(calendar, 'lowercased and canonicalized');

    ES.CreateTemporalZonedDateTimeSlots(this, epochNanoseconds, timeZone, calendar);
  }
  get calendarId(): Return['calendarId'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return GetSlot(this, CALENDAR);
  }
  get timeZoneId(): Return['timeZoneId'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return GetSlot(this, TIME_ZONE);
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
    return dateTime(this).hour;
  }
  get minute(): Return['minute'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return dateTime(this).minute;
  }
  get second(): Return['second'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return dateTime(this).second;
  }
  get millisecond(): Return['millisecond'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return dateTime(this).millisecond;
  }
  get microsecond(): Return['microsecond'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return dateTime(this).microsecond;
  }
  get nanosecond(): Return['nanosecond'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return dateTime(this).nanosecond;
  }
  get era(): Return['era'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return ES.CalendarEra(GetSlot(this, CALENDAR), dateTime(this));
  }
  get eraYear(): Return['eraYear'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return ES.CalendarEraYear(GetSlot(this, CALENDAR), dateTime(this));
  }
  get epochMilliseconds(): Return['epochMilliseconds'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    const value = GetSlot(this, EPOCHNANOSECONDS);
    return JSBI.toNumber(BigIntFloorDiv(value, MILLION));
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
    const timeZone = GetSlot(this, TIME_ZONE);
    const { year, month, day } = ES.GetISODateTimeFor(timeZone, GetSlot(this, EPOCHNANOSECONDS));
    const today = { year, month, day };
    const tomorrow = ES.BalanceISODate(year, month, day + 1);
    const todayNs = ES.GetEpochNanosecondsFor(timeZone, today, 'compatible');
    const tomorrowNs = ES.GetEpochNanosecondsFor(timeZone, tomorrow, 'compatible');
    const diff = TimeDuration.fromEpochNsDiff(tomorrowNs, todayNs);
    return diff.fdiv(HOUR_NANOS);
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
    const offsetNs = ES.GetOffsetNanosecondsFor(GetSlot(this, TIME_ZONE), GetSlot(this, EPOCHNANOSECONDS));
    return ES.FormatUTCOffsetNanoseconds(offsetNs);
  }
  get offsetNanoseconds(): Return['offsetNanoseconds'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return ES.GetOffsetNanosecondsFor(GetSlot(this, TIME_ZONE), GetSlot(this, EPOCHNANOSECONDS));
  }
  with(temporalZonedDateTimeLike: Params['with'][0], options: Params['with'][1] = undefined): Return['with'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    if (!ES.IsObject(temporalZonedDateTimeLike)) {
      throw new TypeError('invalid zoned-date-time-like');
    }
    ES.RejectTemporalLikeObject(temporalZonedDateTimeLike);

    const calendar = GetSlot(this, CALENDAR);
    const timeZone = GetSlot(this, TIME_ZONE);
    const epochNs = GetSlot(this, EPOCHNANOSECONDS);
    const offsetNs = ES.GetOffsetNanosecondsFor(timeZone, epochNs);
    const isoDateTime = ES.GetISODateTimeFor(timeZone, epochNs);
    let fields = {
      ...ES.ISODateToFields(calendar, isoDateTime),
      hour: isoDateTime.hour,
      minute: isoDateTime.minute,
      second: isoDateTime.second,
      millisecond: isoDateTime.millisecond,
      microsecond: isoDateTime.microsecond,
      nanosecond: isoDateTime.nanosecond,
      offset: ES.FormatUTCOffsetNanoseconds(offsetNs)
    };
    const partialZonedDateTime = ES.PrepareCalendarFields(
      calendar,
      temporalZonedDateTimeLike,
      ['day', 'month', 'monthCode', 'year'],
      ['hour', 'microsecond', 'millisecond', 'minute', 'nanosecond', 'offset', 'second'],
      'partial'
    );
    fields = ES.CalendarMergeFields(calendar, fields, partialZonedDateTime);

    const resolvedOptions = ES.GetOptionsObject(options);
    const disambiguation = ES.GetTemporalDisambiguationOption(resolvedOptions);
    const offset = ES.GetTemporalOffsetOption(resolvedOptions, 'prefer');
    const overflow = ES.GetTemporalOverflowOption(resolvedOptions);

    let { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } =
      ES.InterpretTemporalDateTimeFields(calendar, fields, overflow);
    const newOffsetNs = ES.ParseDateTimeUTCOffset(fields.offset);
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
      newOffsetNs,
      timeZone,
      disambiguation,
      offset,
      /* matchMinute = */ false
    );

    return ES.CreateTemporalZonedDateTime(epochNanoseconds, timeZone, calendar);
  }
  withPlainTime(temporalTimeParam: Params['withPlainTime'][0] = undefined): Return['withPlainTime'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');

    const temporalTime = ES.ToTemporalTimeOrMidnight(temporalTimeParam);
    const time = {
      hour: GetSlot(temporalTime, ISO_HOUR),
      minute: GetSlot(temporalTime, ISO_MINUTE),
      second: GetSlot(temporalTime, ISO_SECOND),
      millisecond: GetSlot(temporalTime, ISO_MILLISECOND),
      microsecond: GetSlot(temporalTime, ISO_MICROSECOND),
      nanosecond: GetSlot(temporalTime, ISO_NANOSECOND)
    };

    const timeZone = GetSlot(this, TIME_ZONE);
    const calendar = GetSlot(this, CALENDAR);
    const iso = ES.GetISODateTimeFor(timeZone, GetSlot(this, EPOCHNANOSECONDS));
    const dt = ES.CombineISODateAndTimeRecord(iso, time);
    const epochNs = ES.GetEpochNanosecondsFor(timeZone, dt, 'compatible');
    return ES.CreateTemporalZonedDateTime(epochNs, timeZone, calendar);
  }
  withTimeZone(timeZoneParam: Params['withTimeZone'][0]): Return['withTimeZone'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    const timeZone = ES.ToTemporalTimeZoneIdentifier(timeZoneParam);
    return ES.CreateTemporalZonedDateTime(GetSlot(this, EPOCHNANOSECONDS), timeZone, GetSlot(this, CALENDAR));
  }
  withCalendar(calendarParam: Params['withCalendar'][0]): Return['withCalendar'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    const calendar = ES.ToTemporalCalendarIdentifier(calendarParam);
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
    const roundingIncrement = ES.GetTemporalRoundingIncrementOption(roundTo);
    const roundingMode = ES.GetRoundingModeOption(roundTo, 'halfExpand');
    const smallestUnit = ES.GetTemporalUnitValuedOption(roundTo, 'smallestUnit', 'time', ES.REQUIRED, ['day']);
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

    if (smallestUnit === 'nanosecond' && roundingIncrement === 1) {
      return ES.CreateTemporalZonedDateTime(
        GetSlot(this, EPOCHNANOSECONDS),
        GetSlot(this, TIME_ZONE),
        GetSlot(this, CALENDAR)
      );
    }

    // first, round the underlying DateTime fields
    const timeZone = GetSlot(this, TIME_ZONE);
    const thisNs = GetSlot(this, EPOCHNANOSECONDS);
    const iso = ES.GetISODateTimeFor(timeZone, thisNs);
    let epochNanoseconds;

    if (smallestUnit === 'day') {
      // Compute Instants for start-of-day and end-of-day
      // Determine how far the current instant has progressed through this span.
      const { year, month, day } = iso;
      const dtStart = { year, month, day };
      const dtEnd = ES.BalanceISODate(year, month, day + 1);

      const startNs = ES.GetEpochNanosecondsFor(timeZone, dtStart, 'compatible');
      if (JSBI.lessThan(thisNs, startNs)) {
        throw new Error(
          'assertion failure: cannot produce an instant during a day that ' +
            'occurs before another instant it deems start-of-day'
        );
      }

      const endNs = ES.GetEpochNanosecondsFor(timeZone, dtEnd, 'compatible');
      if (JSBI.greaterThanOrEqual(thisNs, endNs)) {
        throw new Error(
          'assertion failure: cannot produce an instant during a day that ' +
            'occurs on or after another instant it deems end-of-day'
        );
      }

      const dayLengthNs = JSBI.subtract(endNs, startNs);
      const dayProgressNs = TimeDuration.fromEpochNsDiff(thisNs, startNs);
      epochNanoseconds = dayProgressNs.round(dayLengthNs, roundingMode).add(new TimeDuration(startNs)).totalNs;
    } else {
      // smallestUnit < day
      // Round based on ISO-calendar time units
      const { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } = ES.RoundISODateTime(
        iso.year,
        iso.month,
        iso.day,
        iso.hour,
        iso.minute,
        iso.second,
        iso.millisecond,
        iso.microsecond,
        iso.nanosecond,
        roundingIncrement,
        smallestUnit,
        roundingMode
      );

      // Now reset all DateTime fields but leave the TimeZone. The offset will
      // also be retained if the new date/time values are still OK with the old
      // offset. Otherwise the offset will be changed to be compatible with the
      // new date/time values. If DST disambiguation is required, the `compatible`
      // disambiguation algorithm will be used.
      const offsetNs = ES.GetOffsetNanosecondsFor(timeZone, thisNs);
      epochNanoseconds = ES.InterpretISODateTimeOffset(
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
    }

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
    const showCalendar = ES.GetTemporalShowCalendarNameOption(options);
    const digits = ES.GetTemporalFractionalSecondDigitsOption(options);
    const showOffset = ES.GetTemporalShowOffsetOption(options);
    const roundingMode = ES.GetRoundingModeOption(options, 'trunc');
    const smallestUnit = ES.GetTemporalUnitValuedOption(options, 'smallestUnit', 'time', undefined);
    if (smallestUnit === 'hour') throw new RangeError('smallestUnit must be a time unit other than "hour"');
    const showTimeZone = ES.GetTemporalShowTimeZoneNameOption(options);
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

    // This is not quite per specification, but this polyfill's DateTimeFormat
    // already doesn't match the InitializeDateTimeFormat operation, and the
    // access order might change anyway;
    // see https://github.com/tc39/ecma402/issues/747
    const optionsCopy = ObjectCreate(null);
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

    const timeZoneIdentifier = GetSlot(this, TIME_ZONE);
    if (ES.IsOffsetTimeZoneIdentifier(timeZoneIdentifier)) {
      // Note: https://github.com/tc39/ecma402/issues/683 will remove this
      throw new RangeError('toLocaleString does not currently support offset time zones');
    } else {
      const record = ES.GetAvailableNamedTimeZoneIdentifier(timeZoneIdentifier);
      if (!record) throw new RangeError(`toLocaleString formats built-in time zones, not ${timeZoneIdentifier}`);
      optionsCopy.timeZone = record.identifier;
    }

    const formatter = new DateTimeFormat(locales, optionsCopy);

    const localeCalendarIdentifier = ES.Call(customResolvedOptions, formatter, []).calendar as BuiltinCalendarId;
    const calendarIdentifier = GetSlot(this, CALENDAR);
    if (
      calendarIdentifier !== 'iso8601' &&
      localeCalendarIdentifier !== 'iso8601' &&
      !ES.CalendarEquals(localeCalendarIdentifier, calendarIdentifier)
    ) {
      throw new RangeError(
        `cannot format ZonedDateTime with calendar ${calendarIdentifier}` +
          ` in locale with calendar ${localeCalendarIdentifier}`
      );
    }

    const Instant = GetIntrinsic('%Temporal.Instant%');
    return formatter.format(new Instant(GetSlot(this, EPOCHNANOSECONDS)));
  }
  toJSON(): Return['toJSON'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    return ES.TemporalZonedDateTimeToString(this, 'auto');
  }
  valueOf(): never {
    ES.ValueOfThrows('ZonedDateTime');
  }
  startOfDay(): Return['startOfDay'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    const timeZone = GetSlot(this, TIME_ZONE);
    const calendar = GetSlot(this, CALENDAR);
    const { year, month, day } = ES.GetISODateTimeFor(timeZone, GetSlot(this, EPOCHNANOSECONDS));
    const epochNanoseconds = ES.GetEpochNanosecondsFor(timeZone, { year, month, day }, 'compatible');
    return ES.CreateTemporalZonedDateTime(epochNanoseconds, timeZone, calendar);
  }
  getTimeZoneTransition(directionParam: Params['getTimeZoneTransition'][0]): Return['getTimeZoneTransition'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    const timeZone = GetSlot(this, TIME_ZONE);

    if (directionParam === undefined) throw new TypeError('options parameter is required');
    const direction = ES.GetDirectionOption(
      typeof directionParam === 'string'
        ? (ES.CreateOnePropObject('direction', directionParam) as Exclude<typeof directionParam, string>)
        : ES.GetOptionsObject(directionParam)
    );
    if (direction === undefined) throw new TypeError('direction option is required');

    // Offset time zones or UTC have no transitions
    if (ES.IsOffsetTimeZoneIdentifier(timeZone) || timeZone === 'UTC') {
      return null;
    }

    const thisEpochNanoseconds = GetSlot(this, EPOCHNANOSECONDS);
    const epochNanoseconds =
      direction === 'next'
        ? ES.GetNamedTimeZoneNextTransition(timeZone, thisEpochNanoseconds)
        : ES.GetNamedTimeZonePreviousTransition(timeZone, thisEpochNanoseconds);
    return epochNanoseconds === null ? null : new ZonedDateTime(epochNanoseconds, timeZone, GetSlot(this, CALENDAR));
  }
  toInstant(): Return['toInstant'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
    return new TemporalInstant(GetSlot(this, EPOCHNANOSECONDS));
  }
  toPlainDate(): Return['toPlainDate'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    const { year, month, day } = dateTime(this);
    return ES.CreateTemporalDate(year, month, day, GetSlot(this, CALENDAR));
  }
  toPlainTime(): Return['toPlainTime'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    const { hour, minute, second, millisecond, microsecond, nanosecond } = dateTime(this);
    const PlainTime = GetIntrinsic('%Temporal.PlainTime%');
    return new PlainTime(hour, minute, second, millisecond, microsecond, nanosecond);
  }
  toPlainDateTime(): Return['toPlainDateTime'] {
    if (!ES.IsTemporalZonedDateTime(this)) throw new TypeError('invalid receiver');
    const isoDateTime = dateTime(this);
    return ES.CreateTemporalDateTime(
      isoDateTime.year,
      isoDateTime.month,
      isoDateTime.day,
      isoDateTime.hour,
      isoDateTime.minute,
      isoDateTime.second,
      isoDateTime.millisecond,
      isoDateTime.microsecond,
      isoDateTime.nanosecond,
      GetSlot(this, CALENDAR)
    );
  }

  static from(item: Params['from'][0], optionsParam: Params['from'][1] = undefined): Return['from'] {
    if (ES.IsTemporalZonedDateTime(item)) {
      const options = ES.GetOptionsObject(optionsParam);
      ES.GetTemporalDisambiguationOption(options); // validate and ignore
      ES.GetTemporalOffsetOption(options, 'reject');
      ES.GetTemporalOverflowOption(options);
      return ES.CreateTemporalZonedDateTime(
        GetSlot(item, EPOCHNANOSECONDS),
        GetSlot(item, TIME_ZONE),
        GetSlot(item, CALENDAR)
      );
    }
    return ES.ToTemporalZonedDateTime(item, optionsParam);
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
  return ES.GetISODateTimeFor(GetSlot(zdt, TIME_ZONE), GetSlot(zdt, EPOCHNANOSECONDS));
}
