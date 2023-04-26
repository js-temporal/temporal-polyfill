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
  CreateSlots,
  GetSlot,
  SetSlot
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
      Object.defineProperty(this, '_repr_', {
        value: `${this[Symbol.toStringTag]} <${ES.TemporalDurationToString(this)}>`,
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

    let defaultLargestUnit = ES.DefaultTemporalLargestUnit(
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
    let relativeTo = ES.ToRelativeTemporalObject(roundTo);
    const roundingIncrement = ES.ToTemporalRoundingIncrement(roundTo);
    const roundingMode = ES.ToTemporalRoundingMode(roundTo, 'halfExpand');
    let smallestUnit = ES.GetTemporalUnit(roundTo, 'smallestUnit', 'datetime', undefined);

    let smallestUnitPresent = true;
    if (!smallestUnit) {
      smallestUnitPresent = false;
      smallestUnit = 'nanosecond';
    }
    defaultLargestUnit = ES.LargerOfTwoTemporalUnits(defaultLargestUnit, smallestUnit);
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

    ({ years, months, weeks, days } = ES.UnbalanceDurationRelative(
      years,
      months,
      weeks,
      days,
      largestUnit,
      relativeTo
    ));
    ({ years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } =
      ES.RoundDuration(
        years,
        months,
        weeks,
        days,
        hours,
        minutes,
        seconds,
        milliseconds,
        microseconds,
        nanoseconds,
        roundingIncrement,
        smallestUnit,
        roundingMode,
        relativeTo
      ));
    ({ years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } =
      ES.AdjustRoundedDurationDays(
        years,
        months,
        weeks,
        days,
        hours,
        minutes,
        seconds,
        milliseconds,
        microseconds,
        nanoseconds,
        roundingIncrement,
        smallestUnit,
        roundingMode,
        relativeTo
      ));
    ({ days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.BalanceDuration(
      days,
      hours,
      minutes,
      seconds,
      milliseconds,
      microseconds,
      nanoseconds,
      largestUnit,
      relativeTo
    ));
    ({ years, months, weeks, days } = ES.BalanceDurationRelative(years, months, weeks, days, largestUnit, relativeTo));

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
    const relativeTo = ES.ToRelativeTemporalObject(options);
    const unit = ES.GetTemporalUnit(options, 'unit', 'datetime', ES.REQUIRED);

    // Convert larger units down to days
    ({ years, months, weeks, days } = ES.UnbalanceDurationRelative(years, months, weeks, days, unit, relativeTo));
    // If the unit we're totalling is smaller than `days`, convert days down to that unit.
    let intermediate;
    if (ES.IsTemporalZonedDateTime(relativeTo)) {
      intermediate = ES.MoveRelativeZonedDateTime(relativeTo, years, months, weeks, 0);
    }
    let balanceResult = ES.BalancePossiblyInfiniteDuration(
      days,
      hours,
      minutes,
      seconds,
      milliseconds,
      microseconds,
      nanoseconds,
      unit,
      intermediate
    );
    if (balanceResult === 'positive overflow') {
      return Infinity;
    } else if (balanceResult === 'negative overflow') {
      return -Infinity;
    }
    ({ days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = balanceResult);
    // Finally, truncate to the correct unit and calculate remainder
    const { total } = ES.RoundDuration(
      years,
      months,
      weeks,
      days,
      hours,
      minutes,
      seconds,
      milliseconds,
      microseconds,
      nanoseconds,
      1,
      unit,
      'trunc',
      relativeTo
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
    return ES.TemporalDurationToString(this, precision, { unit, increment, roundingMode });
  }
  toJSON(): Return['toJSON'] {
    if (!ES.IsTemporalDuration(this)) throw new TypeError('invalid receiver');
    return ES.TemporalDurationToString(this);
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
    return ES.TemporalDurationToString(this);
  }
  valueOf(): never {
    throw new TypeError('use compare() to compare Temporal.Duration');
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
    const relativeTo = ES.ToRelativeTemporalObject(options);
    const y1 = GetSlot(one, YEARS);
    const mon1 = GetSlot(one, MONTHS);
    const w1 = GetSlot(one, WEEKS);
    let d1 = GetSlot(one, DAYS);
    const h1 = GetSlot(one, HOURS);
    const min1 = GetSlot(one, MINUTES);
    const s1 = GetSlot(one, SECONDS);
    const ms1 = GetSlot(one, MILLISECONDS);
    const µs1 = GetSlot(one, MICROSECONDS);
    let ns1 = GetSlot(one, NANOSECONDS);
    const y2 = GetSlot(two, YEARS);
    const mon2 = GetSlot(two, MONTHS);
    const w2 = GetSlot(two, WEEKS);
    let d2 = GetSlot(two, DAYS);
    const h2 = GetSlot(two, HOURS);
    const min2 = GetSlot(two, MINUTES);
    const s2 = GetSlot(two, SECONDS);
    const ms2 = GetSlot(two, MILLISECONDS);
    const µs2 = GetSlot(two, MICROSECONDS);
    let ns2 = GetSlot(two, NANOSECONDS);
    const shift1 = ES.CalculateOffsetShift(relativeTo, y1, mon1, w1, d1);
    const shift2 = ES.CalculateOffsetShift(relativeTo, y2, mon2, w2, d2);
    if (y1 !== 0 || y2 !== 0 || mon1 !== 0 || mon2 !== 0 || w1 !== 0 || w2 !== 0) {
      ({ days: d1 } = ES.UnbalanceDurationRelative(y1, mon1, w1, d1, 'day', relativeTo));
      ({ days: d2 } = ES.UnbalanceDurationRelative(y2, mon2, w2, d2, 'day', relativeTo));
    }
    const totalNs1 = ES.TotalDurationNanoseconds(d1, h1, min1, s1, ms1, µs1, ns1, shift1);
    const totalNs2 = ES.TotalDurationNanoseconds(d2, h2, min2, s2, ms2, µs2, ns2, shift2);
    return ES.ComparisonResult(JSBI.toNumber(JSBI.subtract(totalNs1, totalNs2)));
  }
  [Symbol.toStringTag]!: 'Temporal.Duration';
}

MakeIntrinsicClass(Duration, 'Temporal.Duration');
