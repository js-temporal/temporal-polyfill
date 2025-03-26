import { assert } from './assert';
import * as ES from './ecmascript';
import { MakeIntrinsicClass } from './intrinsicclass';
import { CALENDAR, EPOCHNANOSECONDS, TIME, TIME_ZONE, GetSlot } from './slots';
import { TimeDuration } from './timeduration';
import type { Temporal } from '..';
import { DateTimeFormat } from './intl';
import type {
  BuiltinCalendarId,
  CalendarDateRecord,
  ZonedDateTimeParams as Params,
  ZonedDateTimeReturn as Return
} from './internaltypes';

import JSBI from 'jsbi';

const customResolvedOptions = DateTimeFormat.prototype.resolvedOptions as Intl.DateTimeFormat['resolvedOptions'];

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
    const calendar = ES.CanonicalizeCalendar(calendarParam === undefined ? 'iso8601' : ES.RequireString(calendarParam));

    ES.CreateTemporalZonedDateTimeSlots(this, epochNanoseconds, timeZone, calendar);
  }
  get calendarId(): Return['calendarId'] {
    ES.CheckReceiver(this, ES.IsTemporalZonedDateTime);
    return GetSlot(this, CALENDAR);
  }
  get timeZoneId(): Return['timeZoneId'] {
    ES.CheckReceiver(this, ES.IsTemporalZonedDateTime);
    return GetSlot(this, TIME_ZONE);
  }
  get year(): Return['year'] {
    return getCalendarProperty(this, 'year');
  }
  get month(): Return['month'] {
    return getCalendarProperty(this, 'month');
  }
  get monthCode(): Return['monthCode'] {
    return getCalendarProperty(this, 'monthCode');
  }
  get day(): Return['day'] {
    return getCalendarProperty(this, 'day');
  }
  get hour(): Return['hour'] {
    return getTimeProperty(this, 'hour');
  }
  get minute(): Return['minute'] {
    return getTimeProperty(this, 'minute');
  }
  get second(): Return['second'] {
    return getTimeProperty(this, 'second');
  }
  get millisecond(): Return['millisecond'] {
    return getTimeProperty(this, 'millisecond');
  }
  get microsecond(): Return['microsecond'] {
    return getTimeProperty(this, 'microsecond');
  }
  get nanosecond(): Return['nanosecond'] {
    return getTimeProperty(this, 'nanosecond');
  }
  get era(): Return['era'] {
    return getCalendarProperty(this, 'era');
  }
  get eraYear(): Return['eraYear'] {
    return getCalendarProperty(this, 'eraYear');
  }
  get epochMilliseconds(): Return['epochMilliseconds'] {
    ES.CheckReceiver(this, ES.IsTemporalZonedDateTime);
    const value = GetSlot(this, EPOCHNANOSECONDS);
    return ES.epochNsToMs(value, 'floor');
  }
  get epochNanoseconds(): Return['epochNanoseconds'] {
    ES.CheckReceiver(this, ES.IsTemporalZonedDateTime);
    return ES.ToBigIntExternal(GetSlot(this, EPOCHNANOSECONDS));
  }
  get dayOfWeek(): Return['dayOfWeek'] {
    return getCalendarProperty(this, 'dayOfWeek');
  }
  get dayOfYear(): Return['dayOfYear'] {
    return getCalendarProperty(this, 'dayOfYear');
  }
  get weekOfYear(): Return['weekOfYear'] {
    return getCalendarProperty(this, 'weekOfYear')?.week;
  }
  get yearOfWeek(): Return['yearOfWeek'] {
    return getCalendarProperty(this, 'weekOfYear')?.year;
  }
  get hoursInDay(): Return['hoursInDay'] {
    ES.CheckReceiver(this, ES.IsTemporalZonedDateTime);
    const timeZone = GetSlot(this, TIME_ZONE);
    const today = dateTime(this).isoDate;
    const tomorrow = ES.BalanceISODate(today.year, today.month, today.day + 1);
    const todayNs = ES.GetStartOfDay(timeZone, today);
    const tomorrowNs = ES.GetStartOfDay(timeZone, tomorrow);
    const diff = TimeDuration.fromEpochNsDiff(tomorrowNs, todayNs);
    return ES.TotalTimeDuration(diff, 'hour');
  }
  get daysInWeek(): Return['daysInWeek'] {
    return getCalendarProperty(this, 'daysInWeek');
  }
  get daysInMonth(): Return['daysInMonth'] {
    return getCalendarProperty(this, 'daysInMonth');
  }
  get daysInYear(): Return['daysInYear'] {
    return getCalendarProperty(this, 'daysInYear');
  }
  get monthsInYear(): Return['monthsInYear'] {
    return getCalendarProperty(this, 'monthsInYear');
  }
  get inLeapYear(): Return['inLeapYear'] {
    return getCalendarProperty(this, 'inLeapYear');
  }
  get offset(): Return['offset'] {
    ES.CheckReceiver(this, ES.IsTemporalZonedDateTime);
    const offsetNs = ES.GetOffsetNanosecondsFor(GetSlot(this, TIME_ZONE), GetSlot(this, EPOCHNANOSECONDS));
    return ES.FormatUTCOffsetNanoseconds(offsetNs);
  }
  get offsetNanoseconds(): Return['offsetNanoseconds'] {
    ES.CheckReceiver(this, ES.IsTemporalZonedDateTime);
    return ES.GetOffsetNanosecondsFor(GetSlot(this, TIME_ZONE), GetSlot(this, EPOCHNANOSECONDS));
  }
  with(temporalZonedDateTimeLike: Params['with'][0], options: Params['with'][1] = undefined): Return['with'] {
    ES.CheckReceiver(this, ES.IsTemporalZonedDateTime);
    if (!ES.IsObject(temporalZonedDateTimeLike)) {
      throw new TypeError('invalid zoned-date-time-like');
    }
    ES.RejectTemporalLikeObject(temporalZonedDateTimeLike);

    const calendar = GetSlot(this, CALENDAR);
    const timeZone = GetSlot(this, TIME_ZONE);
    const epochNs = GetSlot(this, EPOCHNANOSECONDS);
    const offsetNs = ES.GetOffsetNanosecondsFor(timeZone, epochNs);
    const isoDateTime = dateTime(this);
    let fields = {
      ...ES.ISODateToFields(calendar, isoDateTime.isoDate),
      ...isoDateTime.time,
      offset: ES.FormatUTCOffsetNanoseconds(offsetNs)
    };
    const partialZonedDateTime = ES.PrepareCalendarFields(
      calendar,
      temporalZonedDateTimeLike,
      ['year', 'month', 'monthCode', 'day'],
      ['hour', 'minute', 'second', 'millisecond', 'microsecond', 'nanosecond', 'offset'],
      'partial'
    );
    fields = ES.CalendarMergeFields(calendar, fields, partialZonedDateTime);

    const resolvedOptions = ES.GetOptionsObject(options);
    const disambiguation = ES.GetTemporalDisambiguationOption(resolvedOptions);
    const offset = ES.GetTemporalOffsetOption(resolvedOptions, 'prefer');
    const overflow = ES.GetTemporalOverflowOption(resolvedOptions);

    const newDateTime = ES.InterpretTemporalDateTimeFields(calendar, fields, overflow);
    const newOffsetNs = ES.ParseDateTimeUTCOffset(fields.offset);
    const epochNanoseconds = ES.InterpretISODateTimeOffset(
      newDateTime.isoDate,
      newDateTime.time,
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
    ES.CheckReceiver(this, ES.IsTemporalZonedDateTime);

    const timeZone = GetSlot(this, TIME_ZONE);
    const calendar = GetSlot(this, CALENDAR);
    const iso = dateTime(this).isoDate;

    let epochNs;
    if (temporalTimeParam === undefined) {
      epochNs = ES.GetStartOfDay(timeZone, iso);
    } else {
      const temporalTime = ES.ToTemporalTime(temporalTimeParam);
      const dt = ES.CombineISODateAndTimeRecord(iso, GetSlot(temporalTime, TIME));
      epochNs = ES.GetEpochNanosecondsFor(timeZone, dt, 'compatible');
    }
    return ES.CreateTemporalZonedDateTime(epochNs, timeZone, calendar);
  }
  withTimeZone(timeZoneParam: Params['withTimeZone'][0]): Return['withTimeZone'] {
    ES.CheckReceiver(this, ES.IsTemporalZonedDateTime);
    const timeZone = ES.ToTemporalTimeZoneIdentifier(timeZoneParam);
    return ES.CreateTemporalZonedDateTime(GetSlot(this, EPOCHNANOSECONDS), timeZone, GetSlot(this, CALENDAR));
  }
  withCalendar(calendarParam: Params['withCalendar'][0]): Return['withCalendar'] {
    ES.CheckReceiver(this, ES.IsTemporalZonedDateTime);
    const calendar = ES.ToTemporalCalendarIdentifier(calendarParam);
    return ES.CreateTemporalZonedDateTime(GetSlot(this, EPOCHNANOSECONDS), GetSlot(this, TIME_ZONE), calendar);
  }
  add(temporalDurationLike: Params['add'][0], options: Params['add'][1] = undefined): Return['add'] {
    ES.CheckReceiver(this, ES.IsTemporalZonedDateTime);
    return ES.AddDurationToZonedDateTime('add', this, temporalDurationLike, options);
  }
  subtract(
    temporalDurationLike: Params['subtract'][0],
    options: Params['subtract'][1] = undefined
  ): Return['subtract'] {
    ES.CheckReceiver(this, ES.IsTemporalZonedDateTime);
    return ES.AddDurationToZonedDateTime('subtract', this, temporalDurationLike, options);
  }
  until(other: Params['until'][0], options: Params['until'][1] = undefined): Return['until'] {
    ES.CheckReceiver(this, ES.IsTemporalZonedDateTime);
    return ES.DifferenceTemporalZonedDateTime('until', this, other, options);
  }
  since(other: Params['since'][0], options: Params['since'][1] = undefined): Return['since'] {
    ES.CheckReceiver(this, ES.IsTemporalZonedDateTime);
    return ES.DifferenceTemporalZonedDateTime('since', this, other, options);
  }
  round(roundToParam: Params['round'][0]): Return['round'] {
    ES.CheckReceiver(this, ES.IsTemporalZonedDateTime);
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
    const iso = dateTime(this);
    let epochNanoseconds;

    if (smallestUnit === 'day') {
      // Compute Instants for start-of-day and end-of-day
      // Determine how far the current instant has progressed through this span.
      const dateStart = iso.isoDate;
      const dateEnd = ES.BalanceISODate(dateStart.year, dateStart.month, dateStart.day + 1);

      const startNs = ES.GetStartOfDay(timeZone, dateStart);
      assert(
        JSBI.greaterThanOrEqual(thisNs, startNs),
        'cannot produce an instant during a day that occurs before start-of-day instant'
      );

      const endNs = ES.GetStartOfDay(timeZone, dateEnd);
      assert(
        JSBI.lessThan(thisNs, endNs),
        'cannot produce an instant during a day that occurs on or after end-of-day instant'
      );

      const dayLengthNs = JSBI.subtract(endNs, startNs);
      const dayProgressNs = TimeDuration.fromEpochNsDiff(thisNs, startNs);
      const roundedDayNs = dayProgressNs.round(dayLengthNs, roundingMode);
      epochNanoseconds = roundedDayNs.addToEpochNs(startNs);
    } else {
      // smallestUnit < day
      // Round based on ISO-calendar time units
      const roundedDateTime = ES.RoundISODateTime(iso, roundingIncrement, smallestUnit, roundingMode);

      // Now reset all DateTime fields but leave the TimeZone. The offset will
      // also be retained if the new date/time values are still OK with the old
      // offset. Otherwise the offset will be changed to be compatible with the
      // new date/time values. If DST disambiguation is required, the `compatible`
      // disambiguation algorithm will be used.
      const offsetNs = ES.GetOffsetNanosecondsFor(timeZone, thisNs);
      epochNanoseconds = ES.InterpretISODateTimeOffset(
        roundedDateTime.isoDate,
        roundedDateTime.time,
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
    ES.CheckReceiver(this, ES.IsTemporalZonedDateTime);
    const other = ES.ToTemporalZonedDateTime(otherParam);
    const one = GetSlot(this, EPOCHNANOSECONDS);
    const two = GetSlot(other, EPOCHNANOSECONDS);
    if (!JSBI.equal(JSBI.BigInt(one), JSBI.BigInt(two))) return false;
    if (!ES.TimeZoneEquals(GetSlot(this, TIME_ZONE), GetSlot(other, TIME_ZONE))) return false;
    return ES.CalendarEquals(GetSlot(this, CALENDAR), GetSlot(other, CALENDAR));
  }
  toString(options: Params['toString'][0] = undefined): string {
    ES.CheckReceiver(this, ES.IsTemporalZonedDateTime);
    const resolvedOptions = ES.GetOptionsObject(options);
    const showCalendar = ES.GetTemporalShowCalendarNameOption(resolvedOptions);
    const digits = ES.GetTemporalFractionalSecondDigitsOption(resolvedOptions);
    const showOffset = ES.GetTemporalShowOffsetOption(resolvedOptions);
    const roundingMode = ES.GetRoundingModeOption(resolvedOptions, 'trunc');
    const smallestUnit = ES.GetTemporalUnitValuedOption(resolvedOptions, 'smallestUnit', 'time', undefined);
    if (smallestUnit === 'hour') throw new RangeError('smallestUnit must be a time unit other than "hour"');
    const showTimeZone = ES.GetTemporalShowTimeZoneNameOption(resolvedOptions);
    const { precision, unit, increment } = ES.ToSecondsStringPrecisionRecord(smallestUnit, digits);
    return ES.TemporalZonedDateTimeToString(this, precision, showCalendar, showTimeZone, showOffset, {
      unit,
      increment,
      roundingMode
    });
  }
  toLocaleString(
    locales: Params['toLocaleString'][0] = undefined,
    options: Params['toLocaleString'][1] = undefined
  ): string {
    ES.CheckReceiver(this, ES.IsTemporalZonedDateTime);
    const resolvedOptions = ES.GetOptionsObject(options);

    // This is not quite per specification, but this polyfill's DateTimeFormat
    // already doesn't match the InitializeDateTimeFormat operation, and the
    // access order might change anyway;
    // see https://github.com/tc39/ecma402/issues/747
    const optionsCopy = Object.create(null);
    ES.CopyDataProperties(optionsCopy, resolvedOptions, ['timeZone']);

    if (resolvedOptions.timeZone !== undefined) {
      throw new TypeError('ZonedDateTime toLocaleString does not accept a timeZone option');
    }

    if (
      optionsCopy.year === undefined &&
      optionsCopy.month === undefined &&
      optionsCopy.day === undefined &&
      optionsCopy.era === undefined &&
      optionsCopy.weekday === undefined &&
      optionsCopy.dateStyle === undefined &&
      optionsCopy.hour === undefined &&
      optionsCopy.minute === undefined &&
      optionsCopy.second === undefined &&
      optionsCopy.fractionalSecondDigits === undefined &&
      optionsCopy.timeStyle === undefined &&
      optionsCopy.dayPeriod === undefined &&
      optionsCopy.timeZoneName === undefined
    ) {
      optionsCopy.timeZoneName = 'short';
      // The rest of the defaults will be filled in by formatting the Instant
    }

    optionsCopy.timeZone = GetSlot(this, TIME_ZONE);
    if (ES.IsOffsetTimeZoneIdentifier(optionsCopy.timeZone)) {
      // Note: https://github.com/tc39/ecma402/issues/683 will remove this
      throw new RangeError('toLocaleString does not currently support offset time zones');
    }

    const formatter = new DateTimeFormat(locales, optionsCopy);

    const localeCalendarIdentifier = customResolvedOptions.call(formatter).calendar as BuiltinCalendarId;
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

    return formatter.format(ES.CreateTemporalInstant(GetSlot(this, EPOCHNANOSECONDS)));
  }
  toJSON(): Return['toJSON'] {
    ES.CheckReceiver(this, ES.IsTemporalZonedDateTime);
    return ES.TemporalZonedDateTimeToString(this, 'auto');
  }
  valueOf(): never {
    ES.ValueOfThrows('ZonedDateTime');
  }
  startOfDay(): Return['startOfDay'] {
    ES.CheckReceiver(this, ES.IsTemporalZonedDateTime);
    const timeZone = GetSlot(this, TIME_ZONE);
    const isoDate = dateTime(this).isoDate;
    const epochNanoseconds = ES.GetStartOfDay(timeZone, isoDate);
    return ES.CreateTemporalZonedDateTime(epochNanoseconds, timeZone, GetSlot(this, CALENDAR));
  }
  getTimeZoneTransition(directionParam: Params['getTimeZoneTransition'][0]): Return['getTimeZoneTransition'] {
    ES.CheckReceiver(this, ES.IsTemporalZonedDateTime);
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
    return epochNanoseconds === null
      ? null
      : ES.CreateTemporalZonedDateTime(epochNanoseconds, timeZone, GetSlot(this, CALENDAR));
  }
  toInstant(): Return['toInstant'] {
    ES.CheckReceiver(this, ES.IsTemporalZonedDateTime);
    return ES.CreateTemporalInstant(GetSlot(this, EPOCHNANOSECONDS));
  }
  toPlainDate(): Return['toPlainDate'] {
    ES.CheckReceiver(this, ES.IsTemporalZonedDateTime);
    return ES.CreateTemporalDate(dateTime(this).isoDate, GetSlot(this, CALENDAR));
  }
  toPlainTime(): Return['toPlainTime'] {
    ES.CheckReceiver(this, ES.IsTemporalZonedDateTime);
    return ES.CreateTemporalTime(dateTime(this).time);
  }
  toPlainDateTime(): Return['toPlainDateTime'] {
    ES.CheckReceiver(this, ES.IsTemporalZonedDateTime);
    return ES.CreateTemporalDateTime(dateTime(this), GetSlot(this, CALENDAR));
  }

  static from(item: Params['from'][0], optionsParam: Params['from'][1] = undefined): Return['from'] {
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

function getCalendarProperty<P extends keyof CalendarDateRecord>(
  zdt: Temporal.ZonedDateTime,
  prop: P
): CalendarDateRecord[P] {
  ES.CheckReceiver(zdt, ES.IsTemporalZonedDateTime);
  const isoDate = dateTime(zdt).isoDate;
  return ES.calendarImplForObj(zdt).isoToDate(isoDate, { [prop]: true })[prop];
}

function getTimeProperty(zdt: Temporal.ZonedDateTime, prop: Temporal.TimeUnit) {
  ES.CheckReceiver(zdt, ES.IsTemporalZonedDateTime);
  return dateTime(zdt).time[prop];
}
