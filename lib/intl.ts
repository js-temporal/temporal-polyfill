import { assert } from './assert';
import * as ES from './ecmascript';
import { MakeIntrinsicClass } from './intrinsicclass';
import {
  CAL_ID,
  CALENDAR,
  CreateSlots,
  DATE,
  DATETIME,
  DAYS,
  EPOCHNANOSECONDS,
  GetSlot,
  HasSlot,
  HOURS,
  INST,
  ISO_DATE,
  ISO_DATE_TIME,
  LOCALE,
  MD,
  MICROSECONDS,
  MILLISECONDS,
  MINUTES,
  MONTHS,
  NANOSECONDS,
  OPTIONS,
  ORIGINAL,
  ResetSlot,
  SECONDS,
  SetSlot,
  TIME,
  TIME_FMT,
  TZ_CANONICAL,
  TZ_ORIGINAL,
  WEEKS,
  YEARS,
  YM
} from './slots';
import type { Temporal } from '..';
import type { DateTimeFormatParams as Params, DateTimeFormatReturn as Return } from './internaltypes';

// Save the original Intl.DateTimeFormat, it will likely be overwritten
const OriginalIntlDateTimeFormat = Intl.DateTimeFormat;

type LazySlot = typeof DATE | typeof YM | typeof MD | typeof TIME_FMT | typeof DATETIME | typeof INST;

// Construction of built-in Intl.DateTimeFormat objects is sloooooow,
// so we'll only create those instances when we need them.
// See https://bugs.chromium.org/p/v8/issues/detail?id=6528
function getSlotLazy(obj: DateTimeFormatImpl, slot: LazySlot) {
  let val = GetSlot(obj, slot);
  if (typeof val === 'function') {
    // If we get here, `val` is an "amender function". It will take the user's
    // options and transform them into suitable options to be passed into the
    // built-in (non-polyfill) Intl.DateTimeFormat constructor. These options
    // will vary depending on the Temporal type, so that's why we store separate
    // formatters in separate props on the polyfill's DateTimeFormat instances.
    // The efficiency happens because we don't create an (expensive) formatter
    // until the user calls toLocaleString for that Temporal type.
    val = new OriginalIntlDateTimeFormat(GetSlot(obj, LOCALE), val(GetSlot(obj, OPTIONS)));
    ResetSlot(obj, slot, val);
  }
  return val;
}

function createDateTimeFormat(
  dtf: DateTimeFormatImpl,
  locale: Params['constructor'][0],
  optionsParam: Params['constructor'][1]
) {
  const hasOptions = typeof optionsParam !== 'undefined';
  let options: Intl.DateTimeFormatOptions;
  if (hasOptions) {
    // Read all the options in the expected order and copy them to a
    // null-prototype object with which we can do further operations
    // unobservably
    const props: (keyof Intl.DateTimeFormatOptions)[] = [
      'localeMatcher',
      'calendar',
      'numberingSystem',
      'hour12',
      'hourCycle',
      'timeZone',
      'weekday',
      'era',
      'year',
      'month',
      'day',
      'dayPeriod',
      'hour',
      'minute',
      'second',
      'fractionalSecondDigits',
      'timeZoneName',
      'formatMatcher',
      'dateStyle',
      'timeStyle'
    ];
    options = ES.ToObject(optionsParam);
    const newOptions = Object.create(null);
    for (let i = 0; i < props.length; i++) {
      const prop = props[i];
      if (Object.prototype.hasOwnProperty.call(options, prop)) {
        newOptions[prop] = options[prop];
      }
    }
    options = newOptions;
  } else {
    options = Object.create(null);
  }
  const original = new OriginalIntlDateTimeFormat(locale, options);
  const ro = original.resolvedOptions();

  CreateSlots(dtf);

  // DateTimeFormat instances are very expensive to create. Therefore, they will
  // be lazily created only when needed, using the locale and options provided.
  // But it's possible for callers to mutate those inputs before lazy creation
  // happens. For this reason, we clone the inputs instead of caching the
  // original objects. To avoid the complexity of deep cloning any inputs that
  // are themselves objects (e.g. the locales array, or options property values
  // that will be coerced to strings), we rely on `resolvedOptions()` to do the
  // coercion and cloning for us. Unfortunately, we can't just use the resolved
  // options as-is because our options-amending logic adds additional fields if
  // the user doesn't supply any unit fields like year, month, day, hour, etc.
  // Therefore, we limit the properties in the clone to properties that were
  // present in the original input.
  if (hasOptions) {
    const clonedResolved = Object.assign(Object.create(null), ro);
    for (const prop in clonedResolved) {
      if (!Object.prototype.hasOwnProperty.call(options, prop)) {
        delete clonedResolved[prop as keyof typeof clonedResolved];
      }
    }
    // hour12/hourCycle don't show up in resolvedOptions() unless the chosen
    // format includes an hour component, so copy them explicitly in case they
    // would otherwise be lost
    clonedResolved.hour12 = options.hour12;
    clonedResolved.hourCycle = options.hourCycle;
    SetSlot(dtf, OPTIONS, clonedResolved);
  } else {
    SetSlot(dtf, OPTIONS, options);
  }

  SetSlot(dtf, LOCALE, ro.locale);
  SetSlot(dtf, ORIGINAL, original);
  SetSlot(dtf, TZ_CANONICAL, ro.timeZone);
  SetSlot(dtf, CAL_ID, ro.calendar);
  SetSlot(dtf, DATE, dateAmend);
  SetSlot(dtf, YM, yearMonthAmend);
  SetSlot(dtf, MD, monthDayAmend);
  SetSlot(dtf, TIME_FMT, timeAmend);
  SetSlot(dtf, DATETIME, datetimeAmend);
  SetSlot(dtf, INST, instantAmend);

  // Save the original time zone, for a few reasons:
  // - Clearer error messages
  // - More clearly follows the spec for InitializeDateTimeFormat
  // - Because it follows the spec more closely, will make it easier to integrate
  //   support of offset strings and other potential changes like proposal-canonical-tz.
  const timeZoneOption = hasOptions ? options.timeZone : undefined;
  if (timeZoneOption === undefined) {
    SetSlot(dtf, TZ_ORIGINAL, ro.timeZone);
  } else {
    const id = ES.ToString(timeZoneOption);
    if (id.startsWith('−')) {
      // The initial (Node 23) implementation of offset time zones allowed use
      // of the Unicode minus sign, which was disallowed by a later spec change.
      throw new RangeError('Unicode minus (U+2212) is not supported in time zone offsets');
    }
    // store a normalized identifier
    SetSlot(dtf, TZ_ORIGINAL, ES.ToTemporalTimeZoneIdentifier(id));
  }
  return undefined; // TODO: I couldn't satisfy TS without adding this. Is there another way?
}

function IsPatchedDateTimeFormat(item: unknown): item is DateTimeFormatImpl {
  return HasSlot(item, ORIGINAL);
}

class DateTimeFormatImpl {
  constructor(locales: Params['constructor'][0] = undefined, options: Params['constructor'][1] = undefined) {
    createDateTimeFormat(this, locales, options);
  }

  get format() {
    ES.CheckReceiver(this, IsPatchedDateTimeFormat);
    const boundFormat = format.bind(this);
    Object.defineProperties(boundFormat, {
      length: { value: 1, enumerable: false, writable: false, configurable: true },
      name: { value: '', enumerable: false, writable: false, configurable: true }
    });
    return boundFormat;
  }

  formatRange(a: Params['formatRange'][0], b: Params['formatRange'][1]): Return['formatRange'] {
    ES.CheckReceiver(this, IsPatchedDateTimeFormat);
    return formatRange.call(this, a, b);
  }

  formatToParts?<P extends readonly unknown[]>(
    datetime: Params['formatToParts'][0],
    ...rest: P
  ): Return['formatToParts'] {
    ES.CheckReceiver(this, IsPatchedDateTimeFormat);
    return formatToParts.call(this, datetime, ...rest);
  }

  formatRangeToParts?(
    a: Params['formatRangeToParts'][0],
    b: Params['formatRangeToParts'][1]
  ): Return['formatRangeToParts'] {
    ES.CheckReceiver(this, IsPatchedDateTimeFormat);
    return formatRangeToParts.call(this, a, b);
  }

  resolvedOptions(): Return['resolvedOptions'] {
    ES.CheckReceiver(this, IsPatchedDateTimeFormat);
    return resolvedOptions.call(this);
  }
}

if (!('formatToParts' in OriginalIntlDateTimeFormat.prototype)) {
  delete DateTimeFormatImpl.prototype.formatToParts;
}

if (!('formatRangeToParts' in OriginalIntlDateTimeFormat.prototype)) {
  delete DateTimeFormatImpl.prototype.formatRangeToParts;
}
export type { DateTimeFormatImpl };

interface DateTimeFormatInterface {
  (locales: Params['constructor'][0], options: Params['constructor'][1]): DateTimeFormatImpl;
  new (locales: Params['constructor'][0], options: Params['constructor'][1]): DateTimeFormatImpl;
  supportedLocalesOf: typeof Intl.DateTimeFormat.supportedLocalesOf;
}

// A non-class constructor is needed because Intl.DateTimeFormat must be able to
// be called without 'new'
export const DateTimeFormat = function (
  locales: Params['constructor'][0] = undefined,
  options: Params['constructor'][1] = undefined
): DateTimeFormatImpl {
  return new DateTimeFormatImpl(locales, options);
} as unknown as DateTimeFormatInterface;
DateTimeFormatImpl.prototype.constructor = DateTimeFormat;

Object.defineProperty(DateTimeFormat, 'prototype', {
  value: DateTimeFormatImpl.prototype,
  writable: false,
  enumerable: false,
  configurable: false
});
DateTimeFormat.supportedLocalesOf = OriginalIntlDateTimeFormat.supportedLocalesOf;
MakeIntrinsicClass(DateTimeFormat as unknown as typeof Intl.DateTimeFormat, 'Intl.DateTimeFormat');

function resolvedOptions(this: DateTimeFormatImpl): Return['resolvedOptions'] {
  const resolved = GetSlot(this, ORIGINAL).resolvedOptions();
  resolved.timeZone = GetSlot(this, TZ_ORIGINAL);
  return resolved;
}

// TODO: investigate why there's a rest parameter here. Does this function really need to accept extra params?
// And if so, why doesn't formatRange also accept extra params?
function format<P extends readonly unknown[]>(
  this: DateTimeFormatImpl,
  datetime: Params['format'][0],
  ...rest: P
): Return['format'] {
  let overrides = extractOverrides(datetime, this);
  let formatter, formatArgs: [Params['format'][0], ...unknown[]];
  if (overrides.formatter) {
    formatter = overrides.formatter;
    formatArgs = [ES.epochNsToMs(overrides.epochNs, 'floor')];
  } else {
    formatter = GetSlot(this, ORIGINAL);
    formatArgs = [datetime, ...rest];
  }
  return formatter.format(...(formatArgs as [number | Date | undefined]));
}

function formatToParts<P extends readonly unknown[]>(
  this: DateTimeFormatImpl,
  datetime: Params['formatToParts'][0],
  ...rest: P
): Return['formatToParts'] {
  let overrides = extractOverrides(datetime, this);
  let formatter, formatArgs;
  if (overrides.formatter) {
    formatter = overrides.formatter;
    formatArgs = [ES.epochNsToMs(overrides.epochNs, 'floor')];
  } else {
    formatter = GetSlot(this, ORIGINAL);
    formatArgs = [datetime, ...rest];
  }
  return formatter.formatToParts(...(formatArgs as [number | Date | undefined]));
}

function formatRange(this: DateTimeFormatImpl, aParam: Params['formatRange'][0], bParam: Params['formatRange'][1]) {
  if (aParam === undefined || bParam === undefined) {
    throw new TypeError('Intl.DateTimeFormat.formatRange requires two values');
  }
  const a = toDateTimeFormattable(aParam);
  const b = toDateTimeFormattable(bParam);
  let formatArgs = [a, b] as const;
  let formatter;
  if (isTemporalObject(a) !== isTemporalObject(b)) {
    throw new TypeError('Intl.DateTimeFormat.formatRange accepts two values of the same type');
  }
  if (isTemporalObject(a)) {
    if (!sameTemporalType(a, b)) {
      throw new TypeError('Intl.DateTimeFormat.formatRange accepts two values of the same type');
    }
    const { epochNs: aa, formatter: aformatter } = extractOverrides(a, this);
    const { epochNs: bb, formatter: bformatter } = extractOverrides(b, this);
    if (aformatter) {
      assert(bformatter == aformatter, 'formatters for same Temporal type should be identical');
      formatter = aformatter;
      formatArgs = [ES.epochNsToMs(aa, 'floor'), ES.epochNsToMs(bb, 'floor')];
    }
  }
  if (!formatter) {
    formatter = GetSlot(this, ORIGINAL);
  }
  return formatter.formatRange(...(formatArgs as [number, number]));
}

function formatRangeToParts(
  this: DateTimeFormatImpl,
  aParam: Params['formatRangeToParts'][0],
  bParam: Params['formatRangeToParts'][1]
) {
  if (aParam === undefined || bParam === undefined) {
    throw new TypeError('Intl.DateTimeFormat.formatRange requires two values');
  }
  const a = toDateTimeFormattable(aParam);
  const b = toDateTimeFormattable(bParam);
  let formatArgs = [a, b] as const;
  let formatter;
  if (isTemporalObject(a) !== isTemporalObject(b)) {
    throw new TypeError('Intl.DateTimeFormat.formatRangeToParts accepts two values of the same type');
  }
  if (isTemporalObject(a)) {
    if (!sameTemporalType(a, b)) {
      throw new TypeError('Intl.DateTimeFormat.formatRangeToParts accepts two values of the same type');
    }
    const { epochNs: aa, formatter: aformatter } = extractOverrides(a, this);
    const { epochNs: bb, formatter: bformatter } = extractOverrides(b, this);
    if (aformatter) {
      assert(bformatter == aformatter, 'formatters for same Temporal type should be identical');
      formatter = aformatter;
      formatArgs = [ES.epochNsToMs(aa, 'floor'), ES.epochNsToMs(bb, 'floor')];
    }
  }
  if (!formatter) {
    formatter = GetSlot(this, ORIGINAL);
  }
  return formatter.formatRangeToParts(...(formatArgs as [number, number]));
}

// "false" is a signal to delete this option
type MaybeFalseOptions = {
  [K in keyof Intl.DateTimeFormatOptions]?: Intl.DateTimeFormatOptions[K] | false;
};

function amend(optionsParam: Intl.DateTimeFormatOptions = {}, amended: MaybeFalseOptions = {}) {
  const options = Object.assign({}, optionsParam);
  const props = [
    'year',
    'month',
    'day',
    'hour',
    'minute',
    'second',
    'weekday',
    'dayPeriod',
    'timeZoneName',
    'dateStyle',
    'timeStyle'
  ] as const;
  for (let i = 0; i < props.length; i++) {
    const opt = props[i];
    // TODO: can this be typed more cleanly?
    type OptionMaybeFalse = (typeof options)[typeof opt] | false;
    (options[opt] as OptionMaybeFalse) = opt in amended ? amended[opt] : options[opt];
    if ((options[opt] as OptionMaybeFalse) === false || options[opt] === undefined) delete options[opt];
  }
  return options;
}

type OptionsType<T extends TypesWithToLocaleString> = NonNullable<Parameters<T['toLocaleString']>[1]>;

function timeAmend(originalOptions: OptionsType<Temporal.PlainTime>) {
  const options = amend(originalOptions, {
    year: false,
    month: false,
    day: false,
    weekday: false,
    timeZoneName: false,
    dateStyle: false
  });
  if (options.timeStyle === 'long' || options.timeStyle === 'full') {
    // Try to fake what timeStyle should do if not printing the time zone name
    delete options.timeStyle;
    Object.assign(options, { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  }
  if (!hasTimeOptions(options)) {
    if (hasAnyDateTimeOptions(originalOptions)) {
      throw new TypeError(`cannot format Temporal.PlainTime with options [${Object.keys(originalOptions)}]`);
    }
    Object.assign(options, {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    });
  }
  return options;
}

function yearMonthAmend(originalOptions: OptionsType<Temporal.PlainYearMonth>) {
  // Try to fake what dateStyle should do for dates without a day. This is not
  // accurate for locales that always print the era
  const dateStyleHacks = {
    short: { year: '2-digit', month: 'numeric' },
    medium: { year: 'numeric', month: 'short' },
    long: { year: 'numeric', month: 'long' },
    full: { year: 'numeric', month: 'long' }
  };
  const options = amend(originalOptions, {
    day: false,
    hour: false,
    minute: false,
    second: false,
    weekday: false,
    dayPeriod: false,
    timeZoneName: false,
    timeStyle: false
  });
  if ('dateStyle' in options && options.dateStyle) {
    const style = options.dateStyle;
    delete options.dateStyle;
    Object.assign(options, dateStyleHacks[style]);
  }
  if (!('year' in options || 'month' in options || 'era' in options)) {
    if (hasAnyDateTimeOptions(originalOptions)) {
      throw new TypeError(`cannot format PlainYearMonth with options [${Object.keys(originalOptions)}]`);
    }
    Object.assign(options, { year: 'numeric', month: 'numeric' });
  }
  return options;
}

function monthDayAmend(originalOptions: OptionsType<Temporal.PlainMonthDay>) {
  // Try to fake what dateStyle should do for dates without a day
  const dateStyleHacks = {
    short: { month: 'numeric', day: 'numeric' },
    medium: { month: 'short', day: 'numeric' },
    long: { month: 'long', day: 'numeric' },
    full: { month: 'long', day: 'numeric' }
  };
  const options = amend(originalOptions, {
    year: false,
    hour: false,
    minute: false,
    second: false,
    weekday: false,
    dayPeriod: false,
    timeZoneName: false,
    timeStyle: false
  });
  if ('dateStyle' in options && options.dateStyle) {
    const style = options.dateStyle;
    delete options.dateStyle;
    Object.assign(options, dateStyleHacks[style]);
  }
  if (!('month' in options || 'day' in options)) {
    if (hasAnyDateTimeOptions(originalOptions)) {
      throw new TypeError(`cannot format PlainMonthDay with options [${Object.keys(originalOptions)}]`);
    }
    Object.assign(options, { month: 'numeric', day: 'numeric' });
  }
  return options;
}

function dateAmend(originalOptions: OptionsType<Temporal.PlainDate>) {
  const options = amend(originalOptions, {
    hour: false,
    minute: false,
    second: false,
    dayPeriod: false,
    timeZoneName: false,
    timeStyle: false
  });
  if (!hasDateOptions(options)) {
    if (hasAnyDateTimeOptions(originalOptions)) {
      throw new TypeError(`cannot format PlainDate with options [${Object.keys(originalOptions)}]`);
    }
    Object.assign(options, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
  }
  return options;
}

function datetimeAmend(originalOptions: OptionsType<Temporal.PlainDateTime>) {
  const options = amend(originalOptions, { timeZoneName: false });
  if (options.timeStyle === 'long' || options.timeStyle === 'full') {
    // Try to fake what timeStyle should do if not printing the time zone name
    delete options.timeStyle;
    Object.assign(options, { hour: 'numeric', minute: '2-digit', second: '2-digit' });

    // If moving to a fake timeStyle while dateStyle is present, we also have to
    // move to a fake dateStyle. dateStyle is mutually exclusive with hour etc.
    if (options.dateStyle) {
      const dateStyleHacks = {
        short: { year: 'numeric', month: 'numeric', day: 'numeric' },
        medium: { year: 'numeric', month: 'short', day: 'numeric' },
        long: { year: 'numeric', month: 'long', day: 'numeric' },
        full: { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }
      };
      Object.assign(options, dateStyleHacks[options.dateStyle]);
      delete options.dateStyle;
    }
  }
  if (!hasTimeOptions(options) && !hasDateOptions(options)) {
    if (hasAnyDateTimeOptions(originalOptions)) {
      throw new TypeError(`cannot format PlainDateTime with options [${Object.keys(originalOptions)}]`);
    }
    Object.assign(options, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    });
  }
  return options;
}

function instantAmend(optionsParam: OptionsType<Temporal.Instant>) {
  let options = optionsParam;
  if (!hasTimeOptions(options) && !hasDateOptions(options)) {
    options = Object.assign({}, options, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    });
  }
  return options;
}

function hasDateOptions(options: OptionsType<TypesWithToLocaleString>) {
  return (
    'year' in options ||
    'month' in options ||
    'day' in options ||
    'weekday' in options ||
    'dateStyle' in options ||
    'era' in options
  );
}

function hasTimeOptions(options: OptionsType<TypesWithToLocaleString>) {
  return (
    'hour' in options ||
    'minute' in options ||
    'second' in options ||
    'timeStyle' in options ||
    'dayPeriod' in options ||
    'fractionalSecondDigits' in options
  );
}

function hasAnyDateTimeOptions(originalOptions: OptionsType<TypesWithToLocaleString>) {
  return (
    hasDateOptions(originalOptions) ||
    hasTimeOptions(originalOptions) ||
    'dateStyle' in originalOptions ||
    'timeStyle' in originalOptions ||
    'timeZoneName' in originalOptions
  );
}

function isTemporalObject(
  obj: unknown
): obj is
  | Temporal.PlainDate
  | Temporal.PlainTime
  | Temporal.PlainDateTime
  | Temporal.ZonedDateTime
  | Temporal.PlainYearMonth
  | Temporal.PlainMonthDay
  | Temporal.Instant {
  return (
    ES.IsTemporalDate(obj) ||
    ES.IsTemporalTime(obj) ||
    ES.IsTemporalDateTime(obj) ||
    ES.IsTemporalZonedDateTime(obj) ||
    ES.IsTemporalYearMonth(obj) ||
    ES.IsTemporalMonthDay(obj) ||
    ES.IsTemporalInstant(obj)
  );
}

function toDateTimeFormattable(value: unknown) {
  if (isTemporalObject(value)) return value;
  return ES.ToNumber(value);
}

function sameTemporalType(x: unknown, y: unknown) {
  if (!isTemporalObject(x) || !isTemporalObject(y)) return false;
  if (ES.IsTemporalTime(x) && !ES.IsTemporalTime(y)) return false;
  if (ES.IsTemporalDate(x) && !ES.IsTemporalDate(y)) return false;
  if (ES.IsTemporalDateTime(x) && !ES.IsTemporalDateTime(y)) return false;
  if (ES.IsTemporalZonedDateTime(x) && !ES.IsTemporalZonedDateTime(y)) return false;
  if (ES.IsTemporalYearMonth(x) && !ES.IsTemporalYearMonth(y)) return false;
  if (ES.IsTemporalMonthDay(x) && !ES.IsTemporalMonthDay(y)) return false;
  if (ES.IsTemporalInstant(x) && !ES.IsTemporalInstant(y)) return false;
  return true;
}

type TypesWithToLocaleString =
  | Temporal.PlainDateTime
  | Temporal.PlainDate
  | Temporal.PlainTime
  | Temporal.PlainYearMonth
  | Temporal.PlainMonthDay
  | Temporal.ZonedDateTime
  | Temporal.Instant;

function extractOverrides(temporalObj: Params['format'][0], main: DateTimeFormatImpl) {
  if (ES.IsTemporalTime(temporalObj)) {
    const isoDateTime = {
      isoDate: { year: 1970, month: 1, day: 1 },
      time: GetSlot(temporalObj, TIME)
    };
    return {
      epochNs: ES.GetEpochNanosecondsFor(GetSlot(main, TZ_CANONICAL), isoDateTime, 'compatible'),
      formatter: getSlotLazy(main, TIME_FMT)
    };
  }

  if (ES.IsTemporalYearMonth(temporalObj)) {
    const calendar = GetSlot(temporalObj, CALENDAR);
    const mainCalendar = GetSlot(main, CAL_ID);
    if (calendar !== mainCalendar) {
      throw new RangeError(
        `cannot format PlainYearMonth with calendar ${calendar} in locale with calendar ${mainCalendar}`
      );
    }
    const isoDateTime = ES.CombineISODateAndTimeRecord(GetSlot(temporalObj, ISO_DATE), ES.NoonTimeRecord());
    return {
      epochNs: ES.GetEpochNanosecondsFor(GetSlot(main, TZ_CANONICAL), isoDateTime, 'compatible'),
      formatter: getSlotLazy(main, YM)
    };
  }

  if (ES.IsTemporalMonthDay(temporalObj)) {
    const calendar = GetSlot(temporalObj, CALENDAR);
    const mainCalendar = GetSlot(main, CAL_ID);
    if (calendar !== mainCalendar) {
      throw new RangeError(
        `cannot format PlainMonthDay with calendar ${calendar} in locale with calendar ${mainCalendar}`
      );
    }
    const isoDateTime = ES.CombineISODateAndTimeRecord(GetSlot(temporalObj, ISO_DATE), ES.NoonTimeRecord());
    return {
      epochNs: ES.GetEpochNanosecondsFor(GetSlot(main, TZ_CANONICAL), isoDateTime, 'compatible'),
      formatter: getSlotLazy(main, MD)
    };
  }

  if (ES.IsTemporalDate(temporalObj)) {
    const calendar = GetSlot(temporalObj, CALENDAR);
    const mainCalendar = GetSlot(main, CAL_ID);
    if (calendar !== 'iso8601' && calendar !== mainCalendar) {
      throw new RangeError(`cannot format PlainDate with calendar ${calendar} in locale with calendar ${mainCalendar}`);
    }
    const isoDateTime = ES.CombineISODateAndTimeRecord(GetSlot(temporalObj, ISO_DATE), ES.NoonTimeRecord());
    return {
      epochNs: ES.GetEpochNanosecondsFor(GetSlot(main, TZ_CANONICAL), isoDateTime, 'compatible'),
      formatter: getSlotLazy(main, DATE)
    };
  }

  if (ES.IsTemporalDateTime(temporalObj)) {
    const calendar = GetSlot(temporalObj, CALENDAR);
    const mainCalendar = GetSlot(main, CAL_ID);
    if (calendar !== 'iso8601' && calendar !== mainCalendar) {
      throw new RangeError(
        `cannot format PlainDateTime with calendar ${calendar} in locale with calendar ${mainCalendar}`
      );
    }
    const isoDateTime = GetSlot(temporalObj, ISO_DATE_TIME);
    return {
      epochNs: ES.GetEpochNanosecondsFor(GetSlot(main, TZ_CANONICAL), isoDateTime, 'compatible'),
      formatter: getSlotLazy(main, DATETIME)
    };
  }

  if (ES.IsTemporalZonedDateTime(temporalObj)) {
    throw new TypeError(
      'Temporal.ZonedDateTime not supported in DateTimeFormat methods. Use toLocaleString() instead.'
    );
  }

  if (ES.IsTemporalInstant(temporalObj)) {
    return {
      epochNs: GetSlot(temporalObj, EPOCHNANOSECONDS),
      formatter: getSlotLazy(main, INST)
    };
  }

  return {};
}

function temporalDurationToCompatibilityRecord(duration: Temporal.Duration) {
  const record = Object.create(null);
  record.years = GetSlot(duration, YEARS);
  record.months = GetSlot(duration, MONTHS);
  record.weeks = GetSlot(duration, WEEKS);
  record.days = GetSlot(duration, DAYS);
  record.hours = GetSlot(duration, HOURS);
  record.minutes = GetSlot(duration, MINUTES);
  record.seconds = GetSlot(duration, SECONDS);
  record.milliseconds = GetSlot(duration, MILLISECONDS);
  record.microseconds = GetSlot(duration, MICROSECONDS);
  record.nanoseconds = GetSlot(duration, NANOSECONDS);
  return record;
}

const { format: IntlDurationFormatPrototypeFormat, formatToParts: IntlDurationFormatPrototypeFormatToParts } =
  Intl.DurationFormat?.prototype ?? Object.create(null);

export function ModifiedIntlDurationFormatPrototypeFormat(
  this: Intl.DurationFormat,
  durationLike: Temporal.DurationLike
) {
  Intl.DurationFormat.prototype.resolvedOptions.call(this); // brand check
  const duration = ES.ToTemporalDuration(durationLike);
  const record = temporalDurationToCompatibilityRecord(duration);
  return IntlDurationFormatPrototypeFormat.call(this, record);
}

if (Intl.DurationFormat?.prototype) {
  Intl.DurationFormat.prototype.format = ModifiedIntlDurationFormatPrototypeFormat;
  Intl.DurationFormat.prototype.formatToParts = function formatToParts(durationLike: Temporal.DurationLike) {
    Intl.DurationFormat.prototype.resolvedOptions.call(this); // brand check
    const duration = ES.ToTemporalDuration(durationLike);
    const record = temporalDurationToCompatibilityRecord(duration);
    return IntlDurationFormatPrototypeFormatToParts.call(this, record);
  };
}
