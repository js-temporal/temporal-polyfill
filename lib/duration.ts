import {
  // constructors and similar
  IntlDurationFormat,

  // error constructors
  Error as ErrorCtor,
  RangeError as RangeErrorCtor,
  TypeError as TypeErrorCtor,

  // class static functions and methods
  MathAbs,
  NumberIsNaN,
  ObjectDefineProperty,

  // miscellaneous
  warn
} from './primordials';

import { DEBUG } from './debug';
import * as ES from './ecmascript';
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
  SetSlot,
  TIME_ZONE
} from './slots';
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
      ObjectDefineProperty(this, '_repr_', {
        value: `Temporal.Duration <${ES.TemporalDurationToString(this, 'auto')}>`,
        writable: false,
        enumerable: false,
        configurable: false
      });
    }
  }
  get years(): Return['years'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeErrorCtor('invalid receiver');
    return GetSlot(this, YEARS);
  }
  get months(): Return['months'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeErrorCtor('invalid receiver');
    return GetSlot(this, MONTHS);
  }
  get weeks(): Return['weeks'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeErrorCtor('invalid receiver');
    return GetSlot(this, WEEKS);
  }
  get days(): Return['days'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeErrorCtor('invalid receiver');
    return GetSlot(this, DAYS);
  }
  get hours(): Return['hours'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeErrorCtor('invalid receiver');
    return GetSlot(this, HOURS);
  }
  get minutes(): Return['minutes'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeErrorCtor('invalid receiver');
    return GetSlot(this, MINUTES);
  }
  get seconds(): Return['seconds'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeErrorCtor('invalid receiver');
    return GetSlot(this, SECONDS);
  }
  get milliseconds(): Return['milliseconds'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeErrorCtor('invalid receiver');
    return GetSlot(this, MILLISECONDS);
  }
  get microseconds(): Return['microseconds'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeErrorCtor('invalid receiver');
    return GetSlot(this, MICROSECONDS);
  }
  get nanoseconds(): Return['nanoseconds'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeErrorCtor('invalid receiver');
    return GetSlot(this, NANOSECONDS);
  }
  get sign(): Return['sign'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeErrorCtor('invalid receiver');
    return ES.DurationSign(this);
  }
  get blank(): Return['blank'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeErrorCtor('invalid receiver');
    return ES.DurationSign(this) === 0;
  }
  with(durationLike: Params['with'][0]): Return['with'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeErrorCtor('invalid receiver');
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
    if (!ES.IsTemporalDuration(this)) throw new TypeErrorCtor('invalid receiver');
    return ES.CreateNegatedTemporalDuration(this);
  }
  abs(): Return['abs'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeErrorCtor('invalid receiver');
    return new Duration(
      MathAbs(GetSlot(this, YEARS)),
      MathAbs(GetSlot(this, MONTHS)),
      MathAbs(GetSlot(this, WEEKS)),
      MathAbs(GetSlot(this, DAYS)),
      MathAbs(GetSlot(this, HOURS)),
      MathAbs(GetSlot(this, MINUTES)),
      MathAbs(GetSlot(this, SECONDS)),
      MathAbs(GetSlot(this, MILLISECONDS)),
      MathAbs(GetSlot(this, MICROSECONDS)),
      MathAbs(GetSlot(this, NANOSECONDS))
    );
  }
  add(other: Params['add'][0]): Return['add'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeErrorCtor('invalid receiver');
    return ES.AddDurations('add', this, other);
  }
  subtract(other: Params['subtract'][0]): Return['subtract'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeErrorCtor('invalid receiver');
    return ES.AddDurations('subtract', this, other);
  }
  round(roundToParam: Params['round'][0]): Return['round'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeErrorCtor('invalid receiver');
    if (roundToParam === undefined) throw new TypeErrorCtor('options parameter is required');

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
      throw new RangeErrorCtor('at least one of smallestUnit or largestUnit is required');
    }
    if (ES.LargerOfTwoTemporalUnits(largestUnit, smallestUnit) !== largestUnit) {
      throw new RangeErrorCtor(`largestUnit ${largestUnit} cannot be smaller than smallestUnit ${smallestUnit}`);
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
    if (
      roundingIncrement > 1 &&
      (ES.IsCalendarUnit(smallestUnit) || smallestUnit === 'day') &&
      largestUnit !== smallestUnit
    ) {
      throw new RangeErrorCtor('For calendar units with roundingIncrement > 1, use largestUnit = smallestUnit');
    }

    if (zonedRelativeTo) {
      const duration = ES.NormalizeDuration(this);
      const timeZone = GetSlot(zonedRelativeTo, TIME_ZONE);
      const calendar = GetSlot(zonedRelativeTo, CALENDAR);
      const relativeEpochNs = GetSlot(zonedRelativeTo, EPOCHNANOSECONDS);
      const targetEpochNs = ES.AddZonedDateTime(relativeEpochNs, timeZone, calendar, duration);
      return ES.DifferenceZonedDateTimeWithRounding(
        relativeEpochNs,
        targetEpochNs,
        timeZone,
        calendar,
        largestUnit,
        roundingIncrement,
        smallestUnit,
        roundingMode
      ).duration;
    }

    if (plainRelativeTo) {
      const duration = ES.NormalizeDurationWith24HourDays(this);
      const targetTime = ES.AddTime(0, 0, 0, 0, 0, 0, duration.norm);

      // Delegate the date part addition to the calendar
      const isoRelativeToDate = ES.TemporalObjectToISODateRecord(plainRelativeTo);
      const calendar = GetSlot(plainRelativeTo, CALENDAR);
      const dateDuration = { ...duration.date, days: targetTime.deltaDays };
      const targetDate = ES.CalendarDateAdd(calendar, isoRelativeToDate, dateDuration, 'constrain');

      return ES.DifferencePlainDateTimeWithRounding(
        isoRelativeToDate.year,
        isoRelativeToDate.month,
        isoRelativeToDate.day,
        0,
        0,
        0,
        0,
        0,
        0,
        targetDate.year,
        targetDate.month,
        targetDate.day,
        targetTime.hour,
        targetTime.minute,
        targetTime.second,
        targetTime.millisecond,
        targetTime.microsecond,
        targetTime.nanosecond,
        calendar,
        largestUnit,
        roundingIncrement,
        smallestUnit,
        roundingMode
      ).duration;
    }

    // No reference date to calculate difference relative to
    if (ES.IsCalendarUnit(existingLargestUnit)) {
      throw new RangeErrorCtor(`a starting point is required for ${existingLargestUnit}s balancing`);
    }
    if (ES.IsCalendarUnit(largestUnit)) {
      throw new RangeErrorCtor(`a starting point is required for ${largestUnit}s balancing`);
    }
    if (ES.IsCalendarUnit(smallestUnit)) {
      throw new ErrorCtor('assertion failed: smallestUnit was larger than largestUnit');
    }
    let duration = ES.NormalizeDurationWith24HourDays(this);
    ({ duration } = ES.RoundTimeDuration(duration, roundingIncrement, smallestUnit, roundingMode));
    return ES.UnnormalizeDuration(duration, largestUnit);
  }
  total(optionsParam: Params['total'][0]): Return['total'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeErrorCtor('invalid receiver');

    if (optionsParam === undefined) throw new TypeErrorCtor('options argument is required');
    const options =
      typeof optionsParam === 'string'
        ? (ES.CreateOnePropObject('unit', optionsParam) as Exclude<typeof optionsParam, string>)
        : ES.GetOptionsObject(optionsParam);
    let { plainRelativeTo, zonedRelativeTo } = ES.GetTemporalRelativeToOption(options);
    const unit = ES.GetTemporalUnitValuedOption(options, 'unit', 'datetime', ES.REQUIRED);

    if (zonedRelativeTo) {
      const duration = ES.NormalizeDuration(this);
      const timeZone = GetSlot(zonedRelativeTo, TIME_ZONE);
      const calendar = GetSlot(zonedRelativeTo, CALENDAR);
      const relativeEpochNs = GetSlot(zonedRelativeTo, EPOCHNANOSECONDS);
      const targetEpochNs = ES.AddZonedDateTime(relativeEpochNs, timeZone, calendar, duration);
      const { total } = ES.DifferenceZonedDateTimeWithRounding(
        relativeEpochNs,
        targetEpochNs,
        timeZone,
        calendar,
        unit,
        1,
        unit,
        'trunc'
      );
      if (NumberIsNaN(total)) throw new ErrorCtor('assertion failed: total hit unexpected code path');
      return total;
    }

    if (plainRelativeTo) {
      const duration = ES.NormalizeDurationWith24HourDays(this);
      let targetTime = ES.AddTime(0, 0, 0, 0, 0, 0, duration.norm);

      // Delegate the date part addition to the calendar
      const isoRelativeToDate = ES.TemporalObjectToISODateRecord(plainRelativeTo);
      const calendar = GetSlot(plainRelativeTo, CALENDAR);
      const dateDuration = { ...duration.date, days: targetTime.deltaDays };
      const targetDate = ES.CalendarDateAdd(calendar, isoRelativeToDate, dateDuration, 'constrain');

      const { total } = ES.DifferencePlainDateTimeWithRounding(
        isoRelativeToDate.year,
        isoRelativeToDate.month,
        isoRelativeToDate.day,
        0,
        0,
        0,
        0,
        0,
        0,
        targetDate.year,
        targetDate.month,
        targetDate.day,
        targetTime.hour,
        targetTime.minute,
        targetTime.second,
        targetTime.millisecond,
        targetTime.microsecond,
        targetTime.nanosecond,
        calendar,
        unit,
        1,
        unit,
        'trunc'
      );
      if (NumberIsNaN(total)) throw new ErrorCtor('assertion failed: total hit unexpected code path');
      return total;
    }

    // No reference date to calculate difference relative to
    const largestUnit = ES.DefaultTemporalLargestUnit(this);
    if (ES.IsCalendarUnit(largestUnit)) {
      throw new RangeErrorCtor(`a starting point is required for ${largestUnit}s total`);
    }
    if (ES.IsCalendarUnit(unit)) {
      throw new RangeErrorCtor(`a starting point is required for ${unit}s total`);
    }
    const duration = ES.NormalizeDurationWith24HourDays(this);
    const { total } = ES.RoundTimeDuration(duration, 1, unit, 'trunc');
    return total;
  }
  toString(optionsParam: Params['toString'][0] = undefined): string {
    if (!ES.IsTemporalDuration(this)) throw new TypeErrorCtor('invalid receiver');
    const options = ES.GetOptionsObject(optionsParam);
    const digits = ES.GetTemporalFractionalSecondDigitsOption(options);
    const roundingMode = ES.GetRoundingModeOption(options, 'trunc');
    const smallestUnit = ES.GetTemporalUnitValuedOption(options, 'smallestUnit', 'time', undefined);
    if (smallestUnit === 'hour' || smallestUnit === 'minute') {
      throw new RangeErrorCtor('smallestUnit must be a time unit other than "hours" or "minutes"');
    }
    const { precision, unit, increment } = ES.ToSecondsStringPrecisionRecord(smallestUnit, digits);
    ES.uncheckedAssertNarrowedType<Exclude<typeof precision, 'minute'>>(
      precision,
      'Precision cannot be "minute" because of RangeError above'
    );

    if (unit === 'nanosecond' && increment === 1) return ES.TemporalDurationToString(this, precision);

    const largestUnit = ES.DefaultTemporalLargestUnit(this);
    let duration = ES.NormalizeDuration(this);
    ({ duration } = ES.RoundTimeDuration(duration, increment, unit, roundingMode));
    const roundedDuration = ES.UnnormalizeDuration(duration, ES.LargerOfTwoTemporalUnits(largestUnit, 'second'));
    return ES.TemporalDurationToString(roundedDuration, precision);
  }
  toJSON(): Return['toJSON'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeErrorCtor('invalid receiver');
    return ES.TemporalDurationToString(this, 'auto');
  }
  toLocaleString(
    locales: Params['toLocaleString'][0] = undefined,
    options: Params['toLocaleString'][1] = undefined
  ): string {
    if (!ES.IsTemporalDuration(this)) throw new TypeErrorCtor('invalid receiver');
    if (typeof IntlDurationFormat === 'function') {
      return new IntlDurationFormat(locales, options).format(this);
    }
    warn('Temporal.Duration.prototype.toLocaleString() requires Intl.DurationFormat.');
    return ES.TemporalDurationToString(this, 'auto');
  }
  valueOf(): never {
    ES.ValueOfThrows('Duration');
  }
  static from(item: Params['from'][0]): Return['from'] {
    if (ES.IsTemporalDuration(item)) {
      return new Duration(
        GetSlot(item, YEARS),
        GetSlot(item, MONTHS),
        GetSlot(item, WEEKS),
        GetSlot(item, DAYS),
        GetSlot(item, HOURS),
        GetSlot(item, MINUTES),
        GetSlot(item, SECONDS),
        GetSlot(item, MILLISECONDS),
        GetSlot(item, MICROSECONDS),
        GetSlot(item, NANOSECONDS)
      );
    }
    return ES.ToTemporalDuration(item);
  }
  static compare(
    oneParam: Params['compare'][0],
    twoParam: Params['compare'][1],
    optionsParam: Params['compare'][2] = undefined
  ) {
    const one = ES.ToTemporalDuration(oneParam);
    const two = ES.ToTemporalDuration(twoParam);
    const options = ES.GetOptionsObject(optionsParam);
    const { plainRelativeTo, zonedRelativeTo } = ES.GetTemporalRelativeToOption(options);

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
    const calendarUnitsPresent = ES.IsCalendarUnit(largestUnit1) || ES.IsCalendarUnit(largestUnit2);
    const duration1 = ES.NormalizeDuration(one);
    const duration2 = ES.NormalizeDuration(two);

    if (zonedRelativeTo && (calendarUnitsPresent || largestUnit1 === 'day' || largestUnit2 === 'day')) {
      const timeZone = GetSlot(zonedRelativeTo, TIME_ZONE);
      const calendar = GetSlot(zonedRelativeTo, CALENDAR);
      const epochNs = GetSlot(zonedRelativeTo, EPOCHNANOSECONDS);

      const after1 = ES.AddZonedDateTime(epochNs, timeZone, calendar, duration1);
      const after2 = ES.AddZonedDateTime(epochNs, timeZone, calendar, duration2);
      return ES.ComparisonResult(JSBI.toNumber(JSBI.subtract(after1, after2)));
    }

    let d1 = duration1.date.days;
    let d2 = duration2.date.days;
    if (calendarUnitsPresent) {
      if (!plainRelativeTo) {
        throw new RangeErrorCtor('A starting point is required for years, months, or weeks comparison');
      }
      d1 = ES.UnbalanceDateDurationRelative(duration1.date, plainRelativeTo);
      d2 = ES.UnbalanceDateDurationRelative(duration2.date, plainRelativeTo);
    }
    const norm1 = duration1.norm.add24HourDays(d1);
    const norm2 = duration2.norm.add24HourDays(d2);
    return norm1.cmp(norm2);
  }
  [Symbol.toStringTag]!: 'Temporal.Duration';
}

MakeIntrinsicClass(Duration, 'Temporal.Duration');
