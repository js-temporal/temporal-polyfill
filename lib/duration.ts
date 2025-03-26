import { DEBUG } from './debug';
import { assert } from './assert';
import * as ES from './ecmascript';
import { ModifiedIntlDurationFormatPrototypeFormat } from './intl';
import { MakeIntrinsicClass } from './intrinsicclass';
import {
  YEARS,
  MONTHS,
  WEEKS,
  DAYS,
  HOURS,
  MINUTES,
  SECONDS,
  MILLISECONDS,
  MICROSECONDS,
  NANOSECONDS,
  CALENDAR,
  EPOCHNANOSECONDS,
  CreateSlots,
  GetSlot,
  ISO_DATE,
  SetSlot,
  TIME_ZONE
} from './slots';
import { TimeDuration } from './timeduration';
import type { Temporal } from '..';
import type { DurationParams as Params, DurationReturn as Return } from './internaltypes';
import JSBI from 'jsbi';

export class Duration implements Temporal.Duration {
  constructor(
    yearsParam: Params['constructor'][0] = 0,
    monthsParam: Params['constructor'][1] = 0,
    weeksParam: Params['constructor'][2] = 0,
    daysParam: Params['constructor'][3] = 0,
    hoursParam: Params['constructor'][4] = 0,
    minutesParam: Params['constructor'][5] = 0,
    secondsParam: Params['constructor'][6] = 0,
    millisecondsParam: Params['constructor'][7] = 0,
    microsecondsParam: Params['constructor'][8] = 0,
    nanosecondsParam: Params['constructor'][9] = 0
  ) {
    const years = yearsParam === undefined ? 0 : ES.ToIntegerIfIntegral(yearsParam);
    const months = monthsParam === undefined ? 0 : ES.ToIntegerIfIntegral(monthsParam);
    const weeks = weeksParam === undefined ? 0 : ES.ToIntegerIfIntegral(weeksParam);
    const days = daysParam === undefined ? 0 : ES.ToIntegerIfIntegral(daysParam);
    const hours = hoursParam === undefined ? 0 : ES.ToIntegerIfIntegral(hoursParam);
    const minutes = minutesParam === undefined ? 0 : ES.ToIntegerIfIntegral(minutesParam);
    const seconds = secondsParam === undefined ? 0 : ES.ToIntegerIfIntegral(secondsParam);
    const milliseconds = millisecondsParam === undefined ? 0 : ES.ToIntegerIfIntegral(millisecondsParam);
    const microseconds = microsecondsParam === undefined ? 0 : ES.ToIntegerIfIntegral(microsecondsParam);
    const nanoseconds = nanosecondsParam === undefined ? 0 : ES.ToIntegerIfIntegral(nanosecondsParam);

    ES.RejectDuration(years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds);

    CreateSlots(this);
    SetSlot(this, YEARS, years);
    SetSlot(this, MONTHS, months);
    SetSlot(this, WEEKS, weeks);
    SetSlot(this, DAYS, days);
    SetSlot(this, HOURS, hours);
    SetSlot(this, MINUTES, minutes);
    SetSlot(this, SECONDS, seconds);
    SetSlot(this, MILLISECONDS, milliseconds);
    SetSlot(this, MICROSECONDS, microseconds);
    SetSlot(this, NANOSECONDS, nanoseconds);

    if (DEBUG) {
      Object.defineProperty(this, '_repr_', {
        value: `Temporal.Duration <${ES.TemporalDurationToString(this, 'auto')}>`,
        writable: false,
        enumerable: false,
        configurable: false
      });
    }
  }
  get years(): Return['years'] {
    ES.CheckReceiver(this, ES.IsTemporalDuration);
    return GetSlot(this, YEARS);
  }
  get months(): Return['months'] {
    ES.CheckReceiver(this, ES.IsTemporalDuration);
    return GetSlot(this, MONTHS);
  }
  get weeks(): Return['weeks'] {
    ES.CheckReceiver(this, ES.IsTemporalDuration);
    return GetSlot(this, WEEKS);
  }
  get days(): Return['days'] {
    ES.CheckReceiver(this, ES.IsTemporalDuration);
    return GetSlot(this, DAYS);
  }
  get hours(): Return['hours'] {
    ES.CheckReceiver(this, ES.IsTemporalDuration);
    return GetSlot(this, HOURS);
  }
  get minutes(): Return['minutes'] {
    ES.CheckReceiver(this, ES.IsTemporalDuration);
    return GetSlot(this, MINUTES);
  }
  get seconds(): Return['seconds'] {
    ES.CheckReceiver(this, ES.IsTemporalDuration);
    return GetSlot(this, SECONDS);
  }
  get milliseconds(): Return['milliseconds'] {
    ES.CheckReceiver(this, ES.IsTemporalDuration);
    return GetSlot(this, MILLISECONDS);
  }
  get microseconds(): Return['microseconds'] {
    ES.CheckReceiver(this, ES.IsTemporalDuration);
    return GetSlot(this, MICROSECONDS);
  }
  get nanoseconds(): Return['nanoseconds'] {
    ES.CheckReceiver(this, ES.IsTemporalDuration);
    return GetSlot(this, NANOSECONDS);
  }
  get sign(): Return['sign'] {
    ES.CheckReceiver(this, ES.IsTemporalDuration);
    return ES.DurationSign(this);
  }
  get blank(): Return['blank'] {
    ES.CheckReceiver(this, ES.IsTemporalDuration);
    return ES.DurationSign(this) === 0;
  }
  with(durationLike: Params['with'][0]): Return['with'] {
    ES.CheckReceiver(this, ES.IsTemporalDuration);
    const partialDuration = ES.ToTemporalPartialDurationRecord(durationLike);
    const {
      years = GetSlot(this, YEARS),
      months = GetSlot(this, MONTHS),
      weeks = GetSlot(this, WEEKS),
      days = GetSlot(this, DAYS),
      hours = GetSlot(this, HOURS),
      minutes = GetSlot(this, MINUTES),
      seconds = GetSlot(this, SECONDS),
      milliseconds = GetSlot(this, MILLISECONDS),
      microseconds = GetSlot(this, MICROSECONDS),
      nanoseconds = GetSlot(this, NANOSECONDS)
    } = partialDuration;
    return new Duration(years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
  }
  negated(): Return['negated'] {
    ES.CheckReceiver(this, ES.IsTemporalDuration);
    return ES.CreateNegatedTemporalDuration(this);
  }
  abs(): Return['abs'] {
    ES.CheckReceiver(this, ES.IsTemporalDuration);
    return new Duration(
      Math.abs(GetSlot(this, YEARS)),
      Math.abs(GetSlot(this, MONTHS)),
      Math.abs(GetSlot(this, WEEKS)),
      Math.abs(GetSlot(this, DAYS)),
      Math.abs(GetSlot(this, HOURS)),
      Math.abs(GetSlot(this, MINUTES)),
      Math.abs(GetSlot(this, SECONDS)),
      Math.abs(GetSlot(this, MILLISECONDS)),
      Math.abs(GetSlot(this, MICROSECONDS)),
      Math.abs(GetSlot(this, NANOSECONDS))
    );
  }
  add(other: Params['add'][0]): Return['add'] {
    ES.CheckReceiver(this, ES.IsTemporalDuration);
    return ES.AddDurations('add', this, other);
  }
  subtract(other: Params['subtract'][0]): Return['subtract'] {
    ES.CheckReceiver(this, ES.IsTemporalDuration);
    return ES.AddDurations('subtract', this, other);
  }
  round(roundToParam: Params['round'][0]): Return['round'] {
    ES.CheckReceiver(this, ES.IsTemporalDuration);
    if (roundToParam === undefined) throw new TypeError('options parameter is required');

    const existingLargestUnit = ES.DefaultTemporalLargestUnit(this);
    const roundTo =
      typeof roundToParam === 'string'
        ? (ES.CreateOnePropObject('smallestUnit', roundToParam) as Exclude<typeof roundToParam, string>)
        : ES.GetOptionsObject(roundToParam);

    let largestUnit = ES.GetTemporalUnitValuedOption(roundTo, 'largestUnit', 'datetime', undefined, ['auto']);
    let { plainRelativeTo, zonedRelativeTo } = ES.GetTemporalRelativeToOption(roundTo);
    const roundingIncrement = ES.GetTemporalRoundingIncrementOption(roundTo);
    const roundingMode = ES.GetRoundingModeOption(roundTo, 'halfExpand');
    let smallestUnit = ES.GetTemporalUnitValuedOption(roundTo, 'smallestUnit', 'datetime', undefined);

    let smallestUnitPresent = true;
    if (!smallestUnit) {
      smallestUnitPresent = false;
      smallestUnit = 'nanosecond';
    }
    const defaultLargestUnit = ES.LargerOfTwoTemporalUnits(existingLargestUnit, smallestUnit);
    let largestUnitPresent = true;
    if (!largestUnit) {
      largestUnitPresent = false;
      largestUnit = defaultLargestUnit;
    }
    if (largestUnit === 'auto') largestUnit = defaultLargestUnit;
    if (!smallestUnitPresent && !largestUnitPresent) {
      throw new RangeError('at least one of smallestUnit or largestUnit is required');
    }
    if (ES.LargerOfTwoTemporalUnits(largestUnit, smallestUnit) !== largestUnit) {
      throw new RangeError(`largestUnit ${largestUnit} cannot be smaller than smallestUnit ${smallestUnit}`);
    }

    const maximumIncrements = {
      hour: 24,
      minute: 60,
      second: 60,
      millisecond: 1000,
      microsecond: 1000,
      nanosecond: 1000
    } as { [k in Temporal.DateTimeUnit]?: number };
    const maximum = maximumIncrements[smallestUnit];
    if (maximum !== undefined) ES.ValidateTemporalRoundingIncrement(roundingIncrement, maximum, false);
    if (roundingIncrement > 1 && ES.TemporalUnitCategory(smallestUnit) === 'date' && largestUnit !== smallestUnit) {
      throw new RangeError('For calendar units with roundingIncrement > 1, use largestUnit = smallestUnit');
    }

    if (zonedRelativeTo) {
      let duration = ES.ToInternalDurationRecord(this);
      const timeZone = GetSlot(zonedRelativeTo, TIME_ZONE);
      const calendar = GetSlot(zonedRelativeTo, CALENDAR);
      const relativeEpochNs = GetSlot(zonedRelativeTo, EPOCHNANOSECONDS);
      const targetEpochNs = ES.AddZonedDateTime(relativeEpochNs, timeZone, calendar, duration);
      duration = ES.DifferenceZonedDateTimeWithRounding(
        relativeEpochNs,
        targetEpochNs,
        timeZone,
        calendar,
        largestUnit,
        roundingIncrement,
        smallestUnit,
        roundingMode
      );
      if (ES.TemporalUnitCategory(largestUnit) === 'date') largestUnit = 'hour';
      return ES.TemporalDurationFromInternal(duration, largestUnit);
    }

    if (plainRelativeTo) {
      let duration = ES.ToInternalDurationRecordWith24HourDays(this);
      const targetTime = ES.AddTime(ES.MidnightTimeRecord(), duration.time);

      // Delegate the date part addition to the calendar
      const isoRelativeToDate = GetSlot(plainRelativeTo, ISO_DATE);
      const calendar = GetSlot(plainRelativeTo, CALENDAR);
      const dateDuration = ES.AdjustDateDurationRecord(duration.date, targetTime.deltaDays);
      const targetDate = ES.CalendarDateAdd(calendar, isoRelativeToDate, dateDuration, 'constrain');

      const isoDateTime = ES.CombineISODateAndTimeRecord(isoRelativeToDate, ES.MidnightTimeRecord());
      const targetDateTime = ES.CombineISODateAndTimeRecord(targetDate, targetTime);
      duration = ES.DifferencePlainDateTimeWithRounding(
        isoDateTime,
        targetDateTime,
        calendar,
        largestUnit,
        roundingIncrement,
        smallestUnit,
        roundingMode
      );
      return ES.TemporalDurationFromInternal(duration, largestUnit);
    }

    // No reference date to calculate difference relative to
    if (ES.IsCalendarUnit(existingLargestUnit)) {
      throw new RangeError(`a starting point is required for ${existingLargestUnit}s balancing`);
    }
    if (ES.IsCalendarUnit(largestUnit)) {
      throw new RangeError(`a starting point is required for ${largestUnit}s balancing`);
    }
    assert(!ES.IsCalendarUnit(smallestUnit), 'smallestUnit was larger than largestUnit');
    let internalDuration = ES.ToInternalDurationRecordWith24HourDays(this);
    if (smallestUnit === 'day') {
      // First convert time units up to days
      const { quotient, remainder } = internalDuration.time.divmod(ES.DAY_NANOS);
      let days = internalDuration.date.days + quotient + ES.TotalTimeDuration(remainder, 'day');
      days = ES.RoundNumberToIncrement(days, roundingIncrement, roundingMode);
      const dateDuration = { years: 0, months: 0, weeks: 0, days };
      internalDuration = ES.CombineDateAndTimeDuration(dateDuration, TimeDuration.ZERO);
    } else {
      const timeDuration = ES.RoundTimeDuration(internalDuration.time, roundingIncrement, smallestUnit, roundingMode);
      internalDuration = ES.CombineDateAndTimeDuration(ES.ZeroDateDuration(), timeDuration);
    }
    return ES.TemporalDurationFromInternal(internalDuration, largestUnit);
  }
  total(optionsParam: Params['total'][0]): Return['total'] {
    ES.CheckReceiver(this, ES.IsTemporalDuration);

    if (optionsParam === undefined) throw new TypeError('options argument is required');
    const options =
      typeof optionsParam === 'string'
        ? (ES.CreateOnePropObject('unit', optionsParam) as Exclude<typeof optionsParam, string>)
        : ES.GetOptionsObject(optionsParam);
    let { plainRelativeTo, zonedRelativeTo } = ES.GetTemporalRelativeToOption(options);
    const unit = ES.GetTemporalUnitValuedOption(options, 'unit', 'datetime', ES.REQUIRED);

    if (zonedRelativeTo) {
      const duration = ES.ToInternalDurationRecord(this);
      const timeZone = GetSlot(zonedRelativeTo, TIME_ZONE);
      const calendar = GetSlot(zonedRelativeTo, CALENDAR);
      const relativeEpochNs = GetSlot(zonedRelativeTo, EPOCHNANOSECONDS);
      const targetEpochNs = ES.AddZonedDateTime(relativeEpochNs, timeZone, calendar, duration);
      return ES.DifferenceZonedDateTimeWithTotal(relativeEpochNs, targetEpochNs, timeZone, calendar, unit);
    }

    if (plainRelativeTo) {
      const duration = ES.ToInternalDurationRecordWith24HourDays(this);
      let targetTime = ES.AddTime(ES.MidnightTimeRecord(), duration.time);

      // Delegate the date part addition to the calendar
      const isoRelativeToDate = GetSlot(plainRelativeTo, ISO_DATE);
      const calendar = GetSlot(plainRelativeTo, CALENDAR);
      const dateDuration = ES.AdjustDateDurationRecord(duration.date, targetTime.deltaDays);
      const targetDate = ES.CalendarDateAdd(calendar, isoRelativeToDate, dateDuration, 'constrain');

      const isoDateTime = ES.CombineISODateAndTimeRecord(isoRelativeToDate, ES.MidnightTimeRecord());
      const targetDateTime = ES.CombineISODateAndTimeRecord(targetDate, targetTime);
      return ES.DifferencePlainDateTimeWithTotal(isoDateTime, targetDateTime, calendar, unit);
    }

    // No reference date to calculate difference relative to
    const largestUnit = ES.DefaultTemporalLargestUnit(this);
    if (ES.IsCalendarUnit(largestUnit)) {
      throw new RangeError(`a starting point is required for ${largestUnit}s total`);
    }
    if (ES.IsCalendarUnit(unit)) {
      throw new RangeError(`a starting point is required for ${unit}s total`);
    }
    const duration = ES.ToInternalDurationRecordWith24HourDays(this);
    return ES.TotalTimeDuration(duration.time, unit);
  }
  toString(options: Params['toString'][0] = undefined): string {
    ES.CheckReceiver(this, ES.IsTemporalDuration);
    const resolvedOptions = ES.GetOptionsObject(options);
    const digits = ES.GetTemporalFractionalSecondDigitsOption(resolvedOptions);
    const roundingMode = ES.GetRoundingModeOption(resolvedOptions, 'trunc');
    const smallestUnit = ES.GetTemporalUnitValuedOption(resolvedOptions, 'smallestUnit', 'time', undefined);
    if (smallestUnit === 'hour' || smallestUnit === 'minute') {
      throw new RangeError('smallestUnit must be a time unit other than "hours" or "minutes"');
    }
    const { precision, unit, increment } = ES.ToSecondsStringPrecisionRecord(smallestUnit, digits);
    ES.uncheckedAssertNarrowedType<Exclude<typeof precision, 'minute'>>(
      precision,
      'Precision cannot be "minute" because of RangeError above'
    );

    if (unit === 'nanosecond' && increment === 1) return ES.TemporalDurationToString(this, precision);

    const largestUnit = ES.DefaultTemporalLargestUnit(this);
    let internalDuration = ES.ToInternalDurationRecord(this);
    const timeDuration = ES.RoundTimeDuration(internalDuration.time, increment, unit, roundingMode);
    internalDuration = ES.CombineDateAndTimeDuration(internalDuration.date, timeDuration);
    const roundedDuration = ES.TemporalDurationFromInternal(
      internalDuration,
      ES.LargerOfTwoTemporalUnits(largestUnit, 'second')
    );
    return ES.TemporalDurationToString(roundedDuration, precision);
  }
  toJSON(): Return['toJSON'] {
    ES.CheckReceiver(this, ES.IsTemporalDuration);
    return ES.TemporalDurationToString(this, 'auto');
  }
  toLocaleString(
    locales: Params['toLocaleString'][0] = undefined,
    options: Params['toLocaleString'][1] = undefined
  ): string {
    ES.CheckReceiver(this, ES.IsTemporalDuration);
    if (typeof Intl.DurationFormat === 'function') {
      const formatter = new Intl.DurationFormat(locales, options as Intl.DurationFormatOptions);
      return ModifiedIntlDurationFormatPrototypeFormat.call(formatter, this);
    }
    console.warn('Temporal.Duration.prototype.toLocaleString() requires Intl.DurationFormat.');
    return ES.TemporalDurationToString(this, 'auto');
  }
  valueOf(): never {
    ES.ValueOfThrows('Duration');
  }
  static from(item: Params['from'][0]): Return['from'] {
    return ES.ToTemporalDuration(item);
  }
  static compare(
    oneParam: Params['compare'][0],
    twoParam: Params['compare'][1],
    options: Params['compare'][2] = undefined
  ): Return['compare'] {
    const one = ES.ToTemporalDuration(oneParam);
    const two = ES.ToTemporalDuration(twoParam);
    const resolvedOptions = ES.GetOptionsObject(options);
    const { plainRelativeTo, zonedRelativeTo } = ES.GetTemporalRelativeToOption(resolvedOptions);

    if (
      GetSlot(one, YEARS) === GetSlot(two, YEARS) &&
      GetSlot(one, MONTHS) === GetSlot(two, MONTHS) &&
      GetSlot(one, WEEKS) === GetSlot(two, WEEKS) &&
      GetSlot(one, DAYS) === GetSlot(two, DAYS) &&
      GetSlot(one, HOURS) === GetSlot(two, HOURS) &&
      GetSlot(one, MINUTES) === GetSlot(two, MINUTES) &&
      GetSlot(one, SECONDS) === GetSlot(two, SECONDS) &&
      GetSlot(one, MILLISECONDS) === GetSlot(two, MILLISECONDS) &&
      GetSlot(one, MICROSECONDS) === GetSlot(two, MICROSECONDS) &&
      GetSlot(one, NANOSECONDS) === GetSlot(two, NANOSECONDS)
    ) {
      return 0;
    }

    const largestUnit1 = ES.DefaultTemporalLargestUnit(one);
    const largestUnit2 = ES.DefaultTemporalLargestUnit(two);
    const duration1 = ES.ToInternalDurationRecord(one);
    const duration2 = ES.ToInternalDurationRecord(two);

    if (
      zonedRelativeTo &&
      (ES.TemporalUnitCategory(largestUnit1) === 'date' || ES.TemporalUnitCategory(largestUnit2) === 'date')
    ) {
      const timeZone = GetSlot(zonedRelativeTo, TIME_ZONE);
      const calendar = GetSlot(zonedRelativeTo, CALENDAR);
      const epochNs = GetSlot(zonedRelativeTo, EPOCHNANOSECONDS);

      const after1 = ES.AddZonedDateTime(epochNs, timeZone, calendar, duration1);
      const after2 = ES.AddZonedDateTime(epochNs, timeZone, calendar, duration2);
      return ES.ComparisonResult(JSBI.toNumber(JSBI.subtract(after1, after2)));
    }

    let d1 = duration1.date.days;
    let d2 = duration2.date.days;
    if (ES.IsCalendarUnit(largestUnit1) || ES.IsCalendarUnit(largestUnit2)) {
      if (!plainRelativeTo) {
        throw new RangeError('A starting point is required for years, months, or weeks comparison');
      }
      d1 = ES.DateDurationDays(duration1.date, plainRelativeTo);
      d2 = ES.DateDurationDays(duration2.date, plainRelativeTo);
    }
    const timeDuration1 = duration1.time.add24HourDays(d1);
    const timeDuration2 = duration2.time.add24HourDays(d2);
    return timeDuration1.cmp(timeDuration2);
  }
  [Symbol.toStringTag]!: 'Temporal.Duration';
}

MakeIntrinsicClass(Duration, 'Temporal.Duration');
