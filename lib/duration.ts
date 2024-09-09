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
import { TimeDuration } from './timeduration';
import type { Temporal } from '..';
import type { DurationParams as Params, DurationReturn as Return } from './internaltypes';
import JSBI from 'jsbi';

const NumberIsNaN = Number.isNaN;

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
      const normSeconds = TimeDuration.normalize(0, 0, seconds, milliseconds, microseconds, nanoseconds);
      Object.defineProperty(this, '_repr_', {
        value: `Temporal.Duration <${ES.TemporalDurationToString(
          years,
          months,
          weeks,
          days,
          hours,
          minutes,
          normSeconds
        )}>`,
        writable: false,
        enumerable: false,
        configurable: false
      });
    }
  }
  get years(): Return['years'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
    return GetSlot(this, YEARS);
  }
  get months(): Return['months'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
    return GetSlot(this, MONTHS);
  }
  get weeks(): Return['weeks'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
    return GetSlot(this, WEEKS);
  }
  get days(): Return['days'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
    return GetSlot(this, DAYS);
  }
  get hours(): Return['hours'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
    return GetSlot(this, HOURS);
  }
  get minutes(): Return['minutes'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
    return GetSlot(this, MINUTES);
  }
  get seconds(): Return['seconds'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
    return GetSlot(this, SECONDS);
  }
  get milliseconds(): Return['milliseconds'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
    return GetSlot(this, MILLISECONDS);
  }
  get microseconds(): Return['microseconds'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
    return GetSlot(this, MICROSECONDS);
  }
  get nanoseconds(): Return['nanoseconds'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
    return GetSlot(this, NANOSECONDS);
  }
  get sign(): Return['sign'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
    return ES.DurationSign(
      GetSlot(this, YEARS),
      GetSlot(this, MONTHS),
      GetSlot(this, WEEKS),
      GetSlot(this, DAYS),
      GetSlot(this, HOURS),
      GetSlot(this, MINUTES),
      GetSlot(this, SECONDS),
      GetSlot(this, MILLISECONDS),
      GetSlot(this, MICROSECONDS),
      GetSlot(this, NANOSECONDS)
    );
  }
  get blank(): Return['blank'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
    return (
      ES.DurationSign(
        GetSlot(this, YEARS),
        GetSlot(this, MONTHS),
        GetSlot(this, WEEKS),
        GetSlot(this, DAYS),
        GetSlot(this, HOURS),
        GetSlot(this, MINUTES),
        GetSlot(this, SECONDS),
        GetSlot(this, MILLISECONDS),
        GetSlot(this, MICROSECONDS),
        GetSlot(this, NANOSECONDS)
      ) === 0
    );
  }
  with(durationLike: Params['with'][0]): Return['with'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
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
    if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
    return ES.CreateNegatedTemporalDuration(this);
  }
  abs(): Return['abs'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
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
    if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
    return ES.AddDurations('add', this, other);
  }
  subtract(other: Params['subtract'][0]): Return['subtract'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
    return ES.AddDurations('subtract', this, other);
  }
  round(roundToParam: Params['round'][0]): Return['round'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
    if (roundToParam === undefined) throw new TypeError('options parameter is required');
    let years = GetSlot(this, YEARS);
    let months = GetSlot(this, MONTHS);
    let weeks = GetSlot(this, WEEKS);
    let days = GetSlot(this, DAYS);
    let hours = GetSlot(this, HOURS);
    let minutes = GetSlot(this, MINUTES);
    let seconds = GetSlot(this, SECONDS);
    let milliseconds = GetSlot(this, MILLISECONDS);
    let microseconds = GetSlot(this, MICROSECONDS);
    let nanoseconds = GetSlot(this, NANOSECONDS);

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
    if (
      roundingIncrement > 1 &&
      (ES.IsCalendarUnit(smallestUnit) || smallestUnit === 'day') &&
      largestUnit !== smallestUnit
    ) {
      throw new RangeError('For calendar units with roundingIncrement > 1, use largestUnit = smallestUnit');
    }

    let norm = TimeDuration.normalize(hours, minutes, seconds, milliseconds, microseconds, nanoseconds);

    if (zonedRelativeTo) {
      const timeZone = GetSlot(zonedRelativeTo, TIME_ZONE);
      const calendar = GetSlot(zonedRelativeTo, CALENDAR);
      const relativeEpochNs = GetSlot(zonedRelativeTo, EPOCHNANOSECONDS);
      const targetEpochNs = ES.AddZonedDateTime(relativeEpochNs, timeZone, calendar, {
        years,
        months,
        weeks,
        days,
        norm
      });
      ({ years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } =
        ES.DifferenceZonedDateTimeWithRounding(
          relativeEpochNs,
          targetEpochNs,
          timeZone,
          calendar,
          largestUnit,
          roundingIncrement,
          smallestUnit,
          roundingMode
        ));
    } else if (plainRelativeTo) {
      let targetTime = ES.AddTime(0, 0, 0, 0, 0, 0, norm);

      // Delegate the date part addition to the calendar
      ES.RejectDuration(years, months, weeks, days + targetTime.deltaDays, 0, 0, 0, 0, 0, 0);
      const isoRelativeToDate = ES.TemporalObjectToISODateRecord(plainRelativeTo);
      const calendar = GetSlot(plainRelativeTo, CALENDAR);
      const dateDuration = { years, months, weeks, days: days + targetTime.deltaDays };
      const targetDate = ES.CalendarDateAdd(calendar, isoRelativeToDate, dateDuration, 'constrain');

      ({ years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } =
        ES.DifferencePlainDateTimeWithRounding(
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
        ));
    } else {
      // No reference date to calculate difference relative to
      if (years !== 0 || months !== 0 || weeks !== 0) {
        throw new RangeError('a starting point is required for years, months, or weeks balancing');
      }
      if (ES.IsCalendarUnit(largestUnit)) {
        throw new RangeError(`a starting point is required for ${largestUnit}s balancing`);
      }
      if (ES.IsCalendarUnit(smallestUnit)) {
        throw new Error('assertion failed: smallestUnit was larger than largestUnit');
      }
      ({ days, norm } = ES.RoundTimeDuration(days, norm, roundingIncrement, smallestUnit, roundingMode));
      ({ days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.BalanceTimeDuration(
        norm.add24HourDays(days),
        largestUnit
      ));
    }

    return new Duration(years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
  }
  total(optionsParam: Params['total'][0]): Return['total'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
    let years = GetSlot(this, YEARS);
    let months = GetSlot(this, MONTHS);
    let weeks = GetSlot(this, WEEKS);
    let days = GetSlot(this, DAYS);
    let hours = GetSlot(this, HOURS);
    let minutes = GetSlot(this, MINUTES);
    let seconds = GetSlot(this, SECONDS);
    let milliseconds = GetSlot(this, MILLISECONDS);
    let microseconds = GetSlot(this, MICROSECONDS);
    let nanoseconds = GetSlot(this, NANOSECONDS);

    if (optionsParam === undefined) throw new TypeError('options argument is required');
    const options =
      typeof optionsParam === 'string'
        ? (ES.CreateOnePropObject('unit', optionsParam) as Exclude<typeof optionsParam, string>)
        : ES.GetOptionsObject(optionsParam);
    let { plainRelativeTo, zonedRelativeTo } = ES.GetTemporalRelativeToOption(options);
    const unit = ES.GetTemporalUnitValuedOption(options, 'unit', 'datetime', ES.REQUIRED);

    let norm = TimeDuration.normalize(hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
    if (zonedRelativeTo) {
      const timeZone = GetSlot(zonedRelativeTo, TIME_ZONE);
      const calendar = GetSlot(zonedRelativeTo, CALENDAR);
      const relativeEpochNs = GetSlot(zonedRelativeTo, EPOCHNANOSECONDS);
      const targetEpochNs = ES.AddZonedDateTime(relativeEpochNs, timeZone, calendar, {
        years,
        months,
        weeks,
        days,
        norm
      });
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
      if (NumberIsNaN(total)) throw new Error('assertion failed: total hit unexpected code path');
      return total;
    }

    if (plainRelativeTo) {
      let targetTime = ES.AddTime(0, 0, 0, 0, 0, 0, norm);

      // Delegate the date part addition to the calendar
      ES.RejectDuration(years, months, weeks, days + targetTime.deltaDays, 0, 0, 0, 0, 0, 0);
      const isoRelativeToDate = ES.TemporalObjectToISODateRecord(plainRelativeTo);
      const calendar = GetSlot(plainRelativeTo, CALENDAR);
      const dateDuration = { years, months, weeks, days: days + targetTime.deltaDays };
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
      if (NumberIsNaN(total)) throw new Error('assertion failed: total hit unexpected code path');
      return total;
    }

    // No reference date to calculate difference relative to
    if (years !== 0 || months !== 0 || weeks !== 0) {
      throw new RangeError('a starting point is required for years, months, or weeks total');
    }
    if (ES.IsCalendarUnit(unit)) {
      throw new RangeError(`a starting point is required for ${unit}s total`);
    }
    norm = norm.add24HourDays(days);
    const { total } = ES.RoundTimeDuration(0, norm, 1, unit, 'trunc');
    return total;
  }
  toString(optionsParam: Params['toString'][0] = undefined): string {
    if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
    const options = ES.GetOptionsObject(optionsParam);
    const digits = ES.GetTemporalFractionalSecondDigitsOption(options);
    const roundingMode = ES.GetRoundingModeOption(options, 'trunc');
    const smallestUnit = ES.GetTemporalUnitValuedOption(options, 'smallestUnit', 'time', undefined);
    if (smallestUnit === 'hour' || smallestUnit === 'minute') {
      throw new RangeError('smallestUnit must be a time unit other than "hours" or "minutes"');
    }
    const { precision, unit, increment } = ES.ToSecondsStringPrecisionRecord(smallestUnit, digits);
    ES.uncheckedAssertNarrowedType<Exclude<typeof precision, 'minute'>>(
      precision,
      'Precision cannot be "minute" because of RangeError above'
    );

    let years = GetSlot(this, YEARS);
    let months = GetSlot(this, MONTHS);
    let weeks = GetSlot(this, WEEKS);
    let days = GetSlot(this, DAYS);
    let hours = GetSlot(this, HOURS);
    let minutes = GetSlot(this, MINUTES);
    let seconds = GetSlot(this, SECONDS);
    let milliseconds = GetSlot(this, MILLISECONDS);
    let microseconds = GetSlot(this, MICROSECONDS);
    let nanoseconds = GetSlot(this, NANOSECONDS);

    if (unit !== 'nanosecond' || increment !== 1) {
      let norm = TimeDuration.normalize(hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
      const largestUnit = ES.DefaultTemporalLargestUnit(this);
      ({ norm } = ES.RoundTimeDuration(0, norm, increment, unit, roundingMode));
      let deltaDays;
      ({
        days: deltaDays,
        hours,
        minutes,
        seconds,
        milliseconds,
        microseconds,
        nanoseconds
      } = ES.BalanceTimeDuration(norm, ES.LargerOfTwoTemporalUnits(largestUnit, 'second')));
      // Keeping sub-second units separate avoids losing precision after
      // resolving any overflows from rounding
      days += deltaDays;
    }

    const normSeconds = TimeDuration.normalize(0, 0, seconds, milliseconds, microseconds, nanoseconds);
    return ES.TemporalDurationToString(years, months, weeks, days, hours, minutes, normSeconds, precision);
  }
  toJSON(): Return['toJSON'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
    const normSeconds = TimeDuration.normalize(
      0,
      0,
      GetSlot(this, SECONDS),
      GetSlot(this, MILLISECONDS),
      GetSlot(this, MICROSECONDS),
      GetSlot(this, NANOSECONDS)
    );
    return ES.TemporalDurationToString(
      GetSlot(this, YEARS),
      GetSlot(this, MONTHS),
      GetSlot(this, WEEKS),
      GetSlot(this, DAYS),
      GetSlot(this, HOURS),
      GetSlot(this, MINUTES),
      normSeconds
    );
  }
  toLocaleString(
    locales: Params['toLocaleString'][0] = undefined,
    options: Params['toLocaleString'][1] = undefined
  ): string {
    if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
    if (typeof Intl !== 'undefined' && typeof (Intl as any).DurationFormat !== 'undefined') {
      return new (Intl as any).DurationFormat(locales, options).format(this);
    }
    console.warn('Temporal.Duration.prototype.toLocaleString() requires Intl.DurationFormat.');
    const normSeconds = TimeDuration.normalize(
      0,
      0,
      GetSlot(this, SECONDS),
      GetSlot(this, MILLISECONDS),
      GetSlot(this, MICROSECONDS),
      GetSlot(this, NANOSECONDS)
    );
    return ES.TemporalDurationToString(
      GetSlot(this, YEARS),
      GetSlot(this, MONTHS),
      GetSlot(this, WEEKS),
      GetSlot(this, DAYS),
      GetSlot(this, HOURS),
      GetSlot(this, MINUTES),
      normSeconds
    );
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
    const y1 = GetSlot(one, YEARS);
    const mon1 = GetSlot(one, MONTHS);
    const w1 = GetSlot(one, WEEKS);
    let d1 = GetSlot(one, DAYS);
    let h1 = GetSlot(one, HOURS);
    const min1 = GetSlot(one, MINUTES);
    const s1 = GetSlot(one, SECONDS);
    const ms1 = GetSlot(one, MILLISECONDS);
    const µs1 = GetSlot(one, MICROSECONDS);
    let ns1 = GetSlot(one, NANOSECONDS);
    const y2 = GetSlot(two, YEARS);
    const mon2 = GetSlot(two, MONTHS);
    const w2 = GetSlot(two, WEEKS);
    let d2 = GetSlot(two, DAYS);
    let h2 = GetSlot(two, HOURS);
    const min2 = GetSlot(two, MINUTES);
    const s2 = GetSlot(two, SECONDS);
    const ms2 = GetSlot(two, MILLISECONDS);
    const µs2 = GetSlot(two, MICROSECONDS);
    let ns2 = GetSlot(two, NANOSECONDS);

    if (
      y1 === y2 &&
      mon1 === mon2 &&
      w1 === w2 &&
      d1 === d2 &&
      h1 === h2 &&
      min1 === min2 &&
      s1 === s2 &&
      ms1 === ms2 &&
      µs1 === µs2 &&
      ns1 === ns2
    ) {
      return 0;
    }

    const calendarUnitsPresent = y1 !== 0 || y2 !== 0 || mon1 !== 0 || mon2 !== 0 || w1 !== 0 || w2 !== 0;

    if (zonedRelativeTo && (calendarUnitsPresent || d1 != 0 || d2 !== 0)) {
      const timeZone = GetSlot(zonedRelativeTo, TIME_ZONE);
      const calendar = GetSlot(zonedRelativeTo, CALENDAR);
      const epochNs = GetSlot(zonedRelativeTo, EPOCHNANOSECONDS);

      const norm1 = TimeDuration.normalize(h1, min1, s1, ms1, µs1, ns1);
      const duration1 = { years: y1, months: mon1, weeks: w1, days: d1, norm: norm1 };
      const norm2 = TimeDuration.normalize(h2, min2, s2, ms2, µs2, ns2);
      const duration2 = { years: y2, months: mon2, weeks: w2, days: d2, norm: norm2 };
      const after1 = ES.AddZonedDateTime(epochNs, timeZone, calendar, duration1);
      const after2 = ES.AddZonedDateTime(epochNs, timeZone, calendar, duration2);
      return ES.ComparisonResult(JSBI.toNumber(JSBI.subtract(after1, after2)));
    }

    if (calendarUnitsPresent) {
      if (!plainRelativeTo) {
        throw new RangeError('A starting point is required for years, months, or weeks comparison');
      }
      d1 = ES.UnbalanceDateDurationRelative(y1, mon1, w1, d1, plainRelativeTo);
      d2 = ES.UnbalanceDateDurationRelative(y2, mon2, w2, d2, plainRelativeTo);
    }
    const norm1 = TimeDuration.normalize(h1, min1, s1, ms1, µs1, ns1).add24HourDays(d1);
    const norm2 = TimeDuration.normalize(h2, min2, s2, ms2, µs2, ns2).add24HourDays(d2);
    return norm1.cmp(norm2);
  }
  [Symbol.toStringTag]!: 'Temporal.Duration';
}

MakeIntrinsicClass(Duration, 'Temporal.Duration');
