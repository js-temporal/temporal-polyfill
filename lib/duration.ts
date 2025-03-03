import { DEBUG } from './debug';
import * as ES from './ecmascript';
import { MakeIntrinsicClass } from './intrinsicclass';
import { CalendarMethodRecord } from './methodrecord';
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
  INSTANT,
  EPOCHNANOSECONDS,
  CreateSlots,
  GetSlot,
  SetSlot
} from './slots';
import { TimeDuration } from './timeduration';
import type { Temporal } from '..';
import type { DurationParams as Params, DurationReturn as Return } from './internaltypes';
import JSBI from 'jsbi';

const MathAbs = Math.abs;

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
    const partialDuration = ES.PrepareTemporalFields(
      durationLike,
      // NOTE: Field order here is important.
      [
        'days',
        'hours',
        'microseconds',
        'milliseconds',
        'minutes',
        'months',
        'nanoseconds',
        'seconds',
        'weeks',
        'years'
      ],
      'partial'
    );
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
  add(other: Params['add'][0], options: Params['add'][1] = undefined): Return['add'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
    return ES.AddDurationToOrSubtractDurationFromDuration('add', this, other, options);
  }
  subtract(other: Params['subtract'][0], options: Params['subtract'][1] = undefined): Return['subtract'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
    return ES.AddDurationToOrSubtractDurationFromDuration('subtract', this, other, options);
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

    const existingLargestUnit = ES.DefaultTemporalLargestUnit(
      years,
      months,
      weeks,
      days,
      hours,
      minutes,
      seconds,
      milliseconds,
      microseconds,
      nanoseconds
    );
    const roundTo =
      typeof roundToParam === 'string'
        ? (ES.CreateOnePropObject('smallestUnit', roundToParam) as Exclude<typeof roundToParam, string>)
        : ES.GetOptionsObject(roundToParam);

    let largestUnit = ES.GetTemporalUnit(roundTo, 'largestUnit', 'datetime', undefined, ['auto']);
    let { plainRelativeTo, zonedRelativeTo, timeZoneRec } = ES.ToRelativeTemporalObject(roundTo);
    const roundingIncrement = ES.ToTemporalRoundingIncrement(roundTo);
    const roundingMode = ES.ToTemporalRoundingMode(roundTo, 'halfExpand');
    let smallestUnit = ES.GetTemporalUnit(roundTo, 'smallestUnit', 'datetime', undefined);

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

    const roundingGranularityIsNoop = smallestUnit === 'nanosecond' && roundingIncrement === 1;
    const balancingRequested = largestUnit !== existingLargestUnit;
    const calendarUnitsPresent = years !== 0 || months !== 0 || weeks !== 0;
    const timeUnitsOverflowWillOccur =
      MathAbs(minutes) >= 60 ||
      MathAbs(seconds) >= 60 ||
      MathAbs(milliseconds) >= 1000 ||
      MathAbs(microseconds) >= 1000 ||
      MathAbs(nanoseconds) >= 1000;
    const hoursToDaysConversionMayOccur = (days !== 0 && zonedRelativeTo) || MathAbs(hours) >= 24;
    if (
      roundingGranularityIsNoop &&
      !balancingRequested &&
      !calendarUnitsPresent &&
      !timeUnitsOverflowWillOccur &&
      !hoursToDaysConversionMayOccur
    ) {
      return new Duration(years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
    }

    let precalculatedPlainDateTime;
    const plainDateTimeOrRelativeToWillBeUsed =
      !roundingGranularityIsNoop ||
      ES.IsCalendarUnit(largestUnit) ||
      largestUnit === 'day' ||
      calendarUnitsPresent ||
      days !== 0;
    if (zonedRelativeTo && plainDateTimeOrRelativeToWillBeUsed) {
      ES.assertExists(timeZoneRec);
      // Convert a ZonedDateTime relativeTo to PlainDateTime and PlainDate only
      // if either is needed in one of the operations below, because the
      // conversion is user visible
      precalculatedPlainDateTime = ES.GetPlainDateTimeFor(
        timeZoneRec,
        GetSlot(zonedRelativeTo, INSTANT),
        GetSlot(zonedRelativeTo, CALENDAR)
      );
      plainRelativeTo = ES.TemporalDateTimeToDate(precalculatedPlainDateTime);
    }

    const calendarRec = CalendarMethodRecord.CreateFromRelativeTo(plainRelativeTo, zonedRelativeTo, [
      'dateAdd',
      'dateUntil'
    ]);

    ({ years, months, weeks, days } = ES.UnbalanceDateDurationRelative(
      years,
      months,
      weeks,
      days,
      largestUnit,
      plainRelativeTo,
      calendarRec
    ));
    let norm = TimeDuration.normalize(hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
    ({ years, months, weeks, days, norm } = ES.RoundDuration(
      years,
      months,
      weeks,
      days,
      norm,
      roundingIncrement,
      smallestUnit,
      roundingMode,
      plainRelativeTo,
      calendarRec,
      zonedRelativeTo,
      timeZoneRec,
      precalculatedPlainDateTime
    ));
    if (zonedRelativeTo) {
      ES.assertExists(calendarRec);
      ES.assertExists(timeZoneRec);
      ({ years, months, weeks, days, norm } = ES.AdjustRoundedDurationDays(
        years,
        months,
        weeks,
        days,
        norm,
        roundingIncrement,
        smallestUnit,
        roundingMode,
        zonedRelativeTo,
        calendarRec,
        timeZoneRec,
        precalculatedPlainDateTime
      ));
      ({ days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.BalanceTimeDurationRelative(
        days,
        norm,
        largestUnit,
        zonedRelativeTo,
        timeZoneRec,
        precalculatedPlainDateTime
      ));
    } else {
      ({ days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.BalanceTimeDuration(
        norm.add24HourDays(days),
        largestUnit
      ));
    }
    ({ years, months, weeks, days } = ES.BalanceDateDurationRelative(
      years,
      months,
      weeks,
      days,
      largestUnit,
      smallestUnit,
      plainRelativeTo,
      calendarRec
    ));

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
    let { plainRelativeTo, zonedRelativeTo, timeZoneRec } = ES.ToRelativeTemporalObject(options);
    const unit = ES.GetTemporalUnit(options, 'unit', 'datetime', ES.REQUIRED);

    let precalculatedPlainDateTime;
    const plainDateTimeOrRelativeToWillBeUsed =
      ES.IsCalendarUnit(unit) || unit === 'day' || years !== 0 || months !== 0 || weeks !== 0 || days !== 0;
    if (zonedRelativeTo && plainDateTimeOrRelativeToWillBeUsed) {
      // Convert a ZonedDateTime relativeTo to PlainDate only if needed in one
      // of the operations below, because the conversion is user visible
      ES.assertExists(timeZoneRec);
      precalculatedPlainDateTime = ES.GetPlainDateTimeFor(
        timeZoneRec,
        GetSlot(zonedRelativeTo, INSTANT),
        GetSlot(zonedRelativeTo, CALENDAR)
      );
      plainRelativeTo = ES.TemporalDateTimeToDate(precalculatedPlainDateTime);
    }

    const calendarRec = CalendarMethodRecord.CreateFromRelativeTo(plainRelativeTo, zonedRelativeTo, [
      'dateAdd',
      'dateUntil'
    ]);

    // Convert larger units down to days
    ({ years, months, weeks, days } = ES.UnbalanceDateDurationRelative(
      years,
      months,
      weeks,
      days,
      unit,
      plainRelativeTo,
      calendarRec
    ));
    let norm;
    // If the unit we're totalling is smaller than `days`, convert days down to that unit.
    if (zonedRelativeTo) {
      ES.assertExists(calendarRec);
      ES.assertExists(timeZoneRec);
      const intermediate = ES.MoveRelativeZonedDateTime(
        zonedRelativeTo,
        calendarRec,
        timeZoneRec,
        years,
        months,
        weeks,
        0,
        precalculatedPlainDateTime
      );
      norm = TimeDuration.normalize(hours, minutes, seconds, milliseconds, microseconds, nanoseconds);

      // Inline BalanceTimeDurationRelative, without the final balance step
      const start = GetSlot(intermediate, INSTANT);
      const startNs = GetSlot(intermediate, EPOCHNANOSECONDS);
      let intermediateNs = startNs;
      let startDt;
      if (days !== 0) {
        startDt = ES.GetPlainDateTimeFor(timeZoneRec, start, 'iso8601');
        intermediateNs = ES.AddDaysToZonedDateTime(start, startDt, timeZoneRec, 'iso8601', days).epochNs;
      }
      const endNs = ES.AddInstant(intermediateNs, norm);
      norm = TimeDuration.fromEpochNsDiff(endNs, startNs);
      if (ES.IsCalendarUnit(unit) || unit === 'day') {
        if (!norm.isZero()) startDt ??= ES.GetPlainDateTimeFor(timeZoneRec, start, 'iso8601');
        ({ days, norm } = ES.NormalizedTimeDurationToDays(norm, intermediate, timeZoneRec, startDt));
      } else {
        days = 0;
      }
    } else {
      norm = TimeDuration.normalize(hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
      norm = norm.add24HourDays(days);
      days = 0;
    }
    // Finally, truncate to the correct unit and calculate remainder
    const { total } = ES.RoundDuration(
      years,
      months,
      weeks,
      days,
      norm,
      1,
      unit,
      'trunc',
      plainRelativeTo,
      calendarRec,
      zonedRelativeTo,
      timeZoneRec,
      precalculatedPlainDateTime
    );
    return total;
  }
  toString(optionsParam: Params['toString'][0] = undefined): string {
    if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
    const options = ES.GetOptionsObject(optionsParam);
    const digits = ES.ToFractionalSecondDigits(options);
    const roundingMode = ES.ToTemporalRoundingMode(options, 'trunc');
    const smallestUnit = ES.GetTemporalUnit(options, 'smallestUnit', 'time', undefined);
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
      const largestUnit = ES.DefaultTemporalLargestUnit(
        years,
        months,
        weeks,
        days,
        hours,
        minutes,
        seconds,
        milliseconds,
        microseconds,
        nanoseconds
      );
      ({ norm } = ES.RoundDuration(0, 0, 0, 0, norm, increment, unit, roundingMode));
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
    const { plainRelativeTo, zonedRelativeTo, timeZoneRec } = ES.ToRelativeTemporalObject(options);

    const calendarUnitsPresent = y1 !== 0 || y2 !== 0 || mon1 !== 0 || mon2 !== 0 || w1 !== 0 || w2 !== 0;

    const calendarRec = CalendarMethodRecord.CreateFromRelativeTo(plainRelativeTo, zonedRelativeTo, ['dateAdd']);

    if (zonedRelativeTo && (calendarUnitsPresent || d1 != 0 || d2 !== 0)) {
      ES.assertExists(calendarRec);
      ES.assertExists(timeZoneRec);
      const instant = GetSlot(zonedRelativeTo, INSTANT);
      const precalculatedPlainDateTime = ES.GetPlainDateTimeFor(timeZoneRec, instant, calendarRec.receiver);

      const norm1 = TimeDuration.normalize(h1, min1, s1, ms1, µs1, ns1);
      const norm2 = TimeDuration.normalize(h2, min2, s2, ms2, µs2, ns2);
      const after1 = ES.AddZonedDateTime(
        instant,
        timeZoneRec,
        calendarRec,
        y1,
        mon1,
        w1,
        d1,
        norm1,
        precalculatedPlainDateTime
      );
      const after2 = ES.AddZonedDateTime(
        instant,
        timeZoneRec,
        calendarRec,
        y2,
        mon2,
        w2,
        d2,
        norm2,
        precalculatedPlainDateTime
      );
      return ES.ComparisonResult(JSBI.toNumber(JSBI.subtract(after1, after2)));
    }

    if (calendarUnitsPresent) {
      // plainRelativeTo may be undefined, and if so Unbalance will throw
      ({ days: d1 } = ES.UnbalanceDateDurationRelative(y1, mon1, w1, d1, 'day', plainRelativeTo, calendarRec));
      ({ days: d2 } = ES.UnbalanceDateDurationRelative(y2, mon2, w2, d2, 'day', plainRelativeTo, calendarRec));
    }
    const norm1 = TimeDuration.normalize(h1, min1, s1, ms1, µs1, ns1).add24HourDays(d1);
    const norm2 = TimeDuration.normalize(h2, min2, s2, ms2, µs2, ns2).add24HourDays(d2);
    return norm1.cmp(norm2);
  }
  [Symbol.toStringTag]!: 'Temporal.Duration';
}

MakeIntrinsicClass(Duration, 'Temporal.Duration');
