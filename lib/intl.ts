import {
  // error constructors
  RangeError as RangeErrorCtor,
  TypeError as TypeErrorCtor,

  // class static functions and methods
  IntlDateTimeFormat,
  IntlDateTimeFormatPrototypeGetFormat,
  IntlDateTimeFormatPrototypeFormatRange,
  IntlDateTimeFormatPrototypeFormatRangeToParts,
  IntlDateTimeFormatPrototypeFormatToParts,
  IntlDateTimeFormatPrototypeResolvedOptions,
  ObjectAssign,
  ObjectCreate,
  ObjectDefineProperties,
  ObjectDefineProperty,
  ObjectPrototypeHasOwnProperty,
  ReflectApply
} from './primordials';

import { assert } from './assert';
import { BigIntFloorDiv, MILLION } from './bigintmath';
import * as ES from './ecmascript';
import { MakeIntrinsicClass } from './intrinsicclass';
import {
  CAL_ID,
  CALENDAR,
  CreateSlots,
  DATE,
  DATETIME,
  GetSlot,
  HasSlot,
  EPOCHNANOSECONDS,
  INST,
  ISO_HOUR,
  ISO_MINUTE,
  ISO_SECOND,
  ISO_MILLISECOND,
  ISO_MICROSECOND,
  ISO_NANOSECOND,
  LOCALE,
  MD,
  OPTIONS,
  ORIGINAL,
  ResetSlot,
  SetSlot,
  TIME,
  TZ_CANONICAL,
  TZ_ORIGINAL,
  YM
} from './slots';
import type { Temporal } from '..';
import type { DateTimeFormatParams as Params, DateTimeFormatReturn as Return } from './internaltypes';
import JSBI from 'jsbi';

type LazySlot = typeof DATE | typeof YM | typeof MD | typeof TIME | typeof DATETIME | typeof INST;

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
    val = new IntlDateTimeFormat(GetSlot(obj, LOCALE), val(GetSlot(obj, OPTIONS)));
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
    const newOptions = ObjectCreate(null);
    for (let i = 0; i < props.length; i++) {
      const prop = props[i];
      if (ES.Call(ObjectPrototypeHasOwnProperty, options, [prop])) {
        newOptions[prop] = options[prop];
      }
    }
    options = newOptions;
  } else {
    options = ObjectCreate(null);
  }
  const original = new IntlDateTimeFormat(locale, options);
  const ro = ES.Call(IntlDateTimeFormatPrototypeResolvedOptions, original, []);

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
    const clonedResolved = ObjectAssign(ObjectCreate(null), ro);
    for (const prop in clonedResolved) {
      if (!ReflectApply(ObjectPrototypeHasOwnProperty, options, [prop])) {
        delete clonedResolved[prop as keyof typeof clonedResolved];
      }
    }
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
  SetSlot(dtf, TIME, timeAmend);
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
    if (ES.IsOffsetTimeZoneIdentifier(id)) {
      // Note: https://github.com/tc39/ecma402/issues/683 will remove this
      throw new RangeErrorCtor('Intl.DateTimeFormat does not currently support offset time zones');
    }
    const record = ES.GetAvailableNamedTimeZoneIdentifier(id);
    if (!record) throw new RangeErrorCtor(`Intl.DateTimeFormat formats built-in time zones, not ${id}`);
    SetSlot(dtf, TZ_ORIGINAL, record.identifier);
  }
  return undefined; // TODO: I couldn't satisfy TS without adding this. Is there another way?
}

class DateTimeFormatImpl {
  constructor(locales: Params['constructor'][0] = undefined, options: Params['constructor'][1] = undefined) {
    createDateTimeFormat(this, locales, options);
  }

  get format() {
    if (!HasSlot(this, ORIGINAL)) throw new TypeErrorCtor('invalid receiver');
    const boundFormat = <P extends readonly unknown[]>(datetime: Params['format'][0], ...args: P) =>
      ES.Call(format, this, [datetime, ...args]);
    ObjectDefineProperties(boundFormat, {
      length: { value: 1, enumerable: false, writable: false, configurable: true },
      name: { value: '', enumerable: false, writable: false, configurable: true }
    });
    return boundFormat;
  }

  formatRange(a: Params['formatRange'][0], b: Params['formatRange'][1]): Return['formatRange'] {
    if (!HasSlot(this, ORIGINAL)) throw new TypeErrorCtor('invalid receiver');
    return ES.Call(formatRange, this, [a, b]);
  }

  formatToParts?<P extends readonly unknown[]>(
    datetime: Params['formatToParts'][0],
    ...rest: P
  ): Return['formatToParts'] {
    if (!HasSlot(this, ORIGINAL)) throw new TypeErrorCtor('invalid receiver');
    return ES.Call(formatToParts, this, [datetime, ...rest]);
  }

  formatRangeToParts?(
    a: Params['formatRangeToParts'][0],
    b: Params['formatRangeToParts'][1]
  ): Return['formatRangeToParts'] {
    if (!HasSlot(this, ORIGINAL)) throw new TypeErrorCtor('invalid receiver');
    return ES.Call(formatRangeToParts, this, [a, b]);
  }

  resolvedOptions(): Return['resolvedOptions'] {
    if (!HasSlot(this, ORIGINAL)) throw new TypeErrorCtor('invalid receiver');
    return ES.Call(resolvedOptions, this, []);
  }
}

if (!('formatToParts' in IntlDateTimeFormat.prototype)) {
  delete DateTimeFormatImpl.prototype.formatToParts;
}

if (!('formatRangeToParts' in IntlDateTimeFormat.prototype)) {
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

ObjectDefineProperty(DateTimeFormat, 'prototype', {
  value: DateTimeFormatImpl.prototype,
  writable: false,
  enumerable: false,
  configurable: false
});
DateTimeFormat.supportedLocalesOf = IntlDateTimeFormat.supportedLocalesOf;
MakeIntrinsicClass(DateTimeFormat as unknown as typeof Intl.DateTimeFormat, 'Intl.DateTimeFormat');

function resolvedOptions(this: DateTimeFormatImpl): Return['resolvedOptions'] {
  const resolved = ES.Call(IntlDateTimeFormatPrototypeResolvedOptions, GetSlot(this, ORIGINAL), []);
  resolved.timeZone = GetSlot(this, TZ_ORIGINAL);
  return resolved;
}

function epochNsToMs(epochNs: JSBI) {
  return JSBI.toNumber(BigIntFloorDiv(epochNs, MILLION));
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
    formatArgs = [epochNsToMs(overrides.epochNs)];
  } else {
    formatter = GetSlot(this, ORIGINAL);
    formatArgs = [datetime, ...rest];
  }
  const boundFormat = ES.Call(IntlDateTimeFormatPrototypeGetFormat, formatter, []);
  return ES.Call(boundFormat, formatter, formatArgs);
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
    formatArgs = [epochNsToMs(overrides.epochNs)];
  } else {
    formatter = GetSlot(this, ORIGINAL);
    formatArgs = [datetime, ...rest];
  }
  return ES.Call(IntlDateTimeFormatPrototypeFormatToParts, formatter, formatArgs as [number | Date | undefined]);
}

function formatRange(this: DateTimeFormatImpl, a: Params['formatRange'][0], b: Params['formatRange'][1]) {
  let formatArgs = [a, b] as const;
  let formatter;
  if (isTemporalObject(a) || isTemporalObject(b)) {
    if (!sameTemporalType(a, b)) {
      throw new TypeErrorCtor('Intl.DateTimeFormat.formatRange accepts two values of the same type');
    }
    const { epochNs: aa, formatter: aformatter } = extractOverrides(a, this);
    const { epochNs: bb, formatter: bformatter } = extractOverrides(b, this);
    if (aformatter) {
      assert(bformatter == aformatter, 'formatters for same Temporal type should be identical');
      formatter = aformatter;
      formatArgs = [epochNsToMs(aa), epochNsToMs(bb)];
    }
  } else {
    formatter = GetSlot(this, ORIGINAL);
  }
  return ES.Call(IntlDateTimeFormatPrototypeFormatRange, formatter, formatArgs);
}

function formatRangeToParts(
  this: DateTimeFormatImpl,
  a: Params['formatRangeToParts'][0],
  b: Params['formatRangeToParts'][1]
) {
  let formatArgs = [a, b] as const;
  let formatter;
  if (isTemporalObject(a) || isTemporalObject(b)) {
    if (!sameTemporalType(a, b)) {
      throw new TypeErrorCtor('Intl.DateTimeFormat.formatRangeToParts accepts two values of the same type');
    }
    const { epochNs: aa, formatter: aformatter } = extractOverrides(a, this);
    const { epochNs: bb, formatter: bformatter } = extractOverrides(b, this);
    if (aformatter) {
      assert(bformatter == aformatter, 'formatters for same Temporal type should be identical');
      formatter = aformatter;
      formatArgs = [epochNsToMs(aa), epochNsToMs(bb)];
    }
  } else {
    formatter = GetSlot(this, ORIGINAL);
  }
  return ES.Call(IntlDateTimeFormatPrototypeFormatRangeToParts, formatter, formatArgs);
}

// "false" is a signal to delete this option
type MaybeFalseOptions = {
  [K in keyof Intl.DateTimeFormatOptions]?: Intl.DateTimeFormatOptions[K] | false;
};

function amend(optionsParam: Intl.DateTimeFormatOptions = {}, amended: MaybeFalseOptions = {}) {
  const options = ObjectAssign({}, optionsParam);
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

function timeAmend(optionsParam: OptionsType<Temporal.PlainTime>) {
  let options = amend(optionsParam, {
    year: false,
    month: false,
    day: false,
    weekday: false,
    timeZoneName: false,
    dateStyle: false
  });
  if (!hasTimeOptions(options)) {
    options = ObjectAssign({}, options, {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    });
  }
  return options;
}

function yearMonthAmend(optionsParam: OptionsType<Temporal.PlainYearMonth>) {
  // Try to fake what dateStyle should do for dates without a day. This is not
  // accurate for locales that always print the era
  const dateStyleHacks = {
    short: { year: '2-digit', month: 'numeric' },
    medium: { year: 'numeric', month: 'short' },
    long: { year: 'numeric', month: 'long' },
    full: { year: 'numeric', month: 'long' }
  };
  let options = amend(optionsParam, {
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
    ObjectAssign(options, dateStyleHacks[style]);
  }
  if (!('year' in options || 'month' in options)) {
    options = ObjectAssign(options, { year: 'numeric', month: 'numeric' });
  }
  return options;
}

function monthDayAmend(optionsParam: OptionsType<Temporal.PlainMonthDay>) {
  // Try to fake what dateStyle should do for dates without a day
  const dateStyleHacks = {
    short: { month: 'numeric', day: 'numeric' },
    medium: { month: 'short', day: 'numeric' },
    long: { month: 'long', day: 'numeric' },
    full: { month: 'long', day: 'numeric' }
  };
  let options = amend(optionsParam, {
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
    ObjectAssign(options, dateStyleHacks[style]);
  }
  if (!('month' in options || 'day' in options)) {
    options = ObjectAssign({}, options, { month: 'numeric', day: 'numeric' });
  }
  return options;
}

function dateAmend(optionsParam: OptionsType<Temporal.PlainDate>) {
  let options = amend(optionsParam, {
    hour: false,
    minute: false,
    second: false,
    dayPeriod: false,
    timeZoneName: false,
    timeStyle: false
  });
  if (!hasDateOptions(options)) {
    options = ObjectAssign({}, options, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
  }
  return options;
}

function datetimeAmend(optionsParam: OptionsType<Temporal.PlainDateTime>) {
  let options = amend(optionsParam, { timeZoneName: false });
  if (!hasTimeOptions(options) && !hasDateOptions(options)) {
    options = ObjectAssign({}, options, {
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
    options = ObjectAssign({}, options, {
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
  return 'year' in options || 'month' in options || 'day' in options || 'weekday' in options || 'dateStyle' in options;
}

function hasTimeOptions(options: OptionsType<TypesWithToLocaleString>) {
  return (
    'hour' in options || 'minute' in options || 'second' in options || 'timeStyle' in options || 'dayPeriod' in options
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

const noon = { hour: 12, minute: 0, second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 };

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
      year: 1970,
      month: 1,
      day: 1,
      hour: GetSlot(temporalObj, ISO_HOUR),
      minute: GetSlot(temporalObj, ISO_MINUTE),
      second: GetSlot(temporalObj, ISO_SECOND),
      millisecond: GetSlot(temporalObj, ISO_MILLISECOND),
      microsecond: GetSlot(temporalObj, ISO_MICROSECOND),
      nanosecond: GetSlot(temporalObj, ISO_NANOSECOND)
    };
    return {
      epochNs: ES.GetEpochNanosecondsFor(GetSlot(main, TZ_CANONICAL), isoDateTime, 'compatible'),
      formatter: getSlotLazy(main, TIME)
    };
  }

  if (ES.IsTemporalYearMonth(temporalObj)) {
    const calendar = GetSlot(temporalObj, CALENDAR);
    const mainCalendar = GetSlot(main, CAL_ID);
    if (calendar !== mainCalendar) {
      throw new RangeErrorCtor(
        `cannot format PlainYearMonth with calendar ${calendar} in locale with calendar ${mainCalendar}`
      );
    }
    const isoDate = ES.TemporalObjectToISODateRecord(temporalObj);
    const isoDateTime = { ...isoDate, ...noon };
    return {
      epochNs: ES.GetEpochNanosecondsFor(GetSlot(main, TZ_CANONICAL), isoDateTime, 'compatible'),
      formatter: getSlotLazy(main, YM)
    };
  }

  if (ES.IsTemporalMonthDay(temporalObj)) {
    const calendar = GetSlot(temporalObj, CALENDAR);
    const mainCalendar = GetSlot(main, CAL_ID);
    if (calendar !== mainCalendar) {
      throw new RangeErrorCtor(
        `cannot format PlainMonthDay with calendar ${calendar} in locale with calendar ${mainCalendar}`
      );
    }
    const isoDate = ES.TemporalObjectToISODateRecord(temporalObj);
    const isoDateTime = { ...isoDate, ...noon };
    return {
      epochNs: ES.GetEpochNanosecondsFor(GetSlot(main, TZ_CANONICAL), isoDateTime, 'compatible'),
      formatter: getSlotLazy(main, MD)
    };
  }

  if (ES.IsTemporalDate(temporalObj)) {
    const calendar = GetSlot(temporalObj, CALENDAR);
    const mainCalendar = GetSlot(main, CAL_ID);
    if (calendar !== 'iso8601' && calendar !== mainCalendar) {
      throw new RangeErrorCtor(
        `cannot format PlainDate with calendar ${calendar} in locale with calendar ${mainCalendar}`
      );
    }
    const isoDate = ES.TemporalObjectToISODateRecord(temporalObj);
    const isoDateTime = { ...isoDate, ...noon };
    return {
      epochNs: ES.GetEpochNanosecondsFor(GetSlot(main, TZ_CANONICAL), isoDateTime, 'compatible'),
      formatter: getSlotLazy(main, DATE)
    };
  }

  if (ES.IsTemporalDateTime(temporalObj)) {
    const calendar = GetSlot(temporalObj, CALENDAR);
    const mainCalendar = GetSlot(main, CAL_ID);
    if (calendar !== 'iso8601' && calendar !== mainCalendar) {
      throw new RangeErrorCtor(
        `cannot format PlainDateTime with calendar ${calendar} in locale with calendar ${mainCalendar}`
      );
    }
    const isoDateTime = ES.PlainDateTimeToISODateTimeRecord(temporalObj);
    return {
      epochNs: ES.GetEpochNanosecondsFor(GetSlot(main, TZ_CANONICAL), isoDateTime, 'compatible'),
      formatter: getSlotLazy(main, DATETIME)
    };
  }

  if (ES.IsTemporalZonedDateTime(temporalObj)) {
    throw new TypeErrorCtor(
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
