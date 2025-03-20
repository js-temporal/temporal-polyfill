import type { Intl, Temporal } from '..';
import type { DateTimeFormatImpl } from './intl';
import type { TimeDuration } from './timeduration';

export type BuiltinCalendarId =
  | 'iso8601'
  | 'hebrew'
  | 'islamic'
  | 'islamic-umalqura'
  | 'islamic-tbla'
  | 'islamic-civil'
  | 'islamic-rgsa'
  | 'islamicc'
  | 'persian'
  | 'ethiopic'
  | 'ethioaa'
  | 'ethiopic-amete-alem' // see https://github.com/tc39/ecma402/issues/285
  | 'coptic'
  | 'chinese'
  | 'dangi'
  | 'roc'
  | 'indian'
  | 'buddhist'
  | 'japanese'
  | 'gregory';

export type AnySlottedType =
  | DateTimeFormatImpl
  | Temporal.Duration
  | Temporal.Instant
  | Temporal.PlainDate
  | Temporal.PlainDateTime
  | Temporal.PlainMonthDay
  | Temporal.PlainTime
  | Temporal.PlainYearMonth
  | Temporal.ZonedDateTime;

/*
// unused, but uncomment if this is needed later
export type AnyTemporalConstructor =
  | typeof Temporal.Calendar
  | typeof Temporal.Duration
  | typeof Temporal.Instant
  | typeof Temporal.PlainDate
  | typeof Temporal.PlainDateTime
  | typeof Temporal.PlainMonthDay
  | typeof Temporal.PlainTime
  | typeof Temporal.PlainYearMonth
  | typeof Temporal.TimeZone
  | typeof Temporal.ZonedDateTime;
*/

// Used in AnyTemporalLikeType
type AllTemporalLikeTypes = [
  Temporal.DurationLike,
  Temporal.PlainDateLike,
  Temporal.PlainDateTimeLike,
  Temporal.PlainMonthDayLike,
  Temporal.PlainTimeLike,
  Temporal.PlainYearMonthLike,
  Temporal.ZonedDateTimeLike
];
export type AnyTemporalLikeType = AllTemporalLikeTypes[number];

// Keys is a conditionally-mapped version of keyof
export type Keys<T> = T extends Record<string, unknown> ? keyof T : never;

// Resolve copies the keys and values of a given object type so that TS will
// stop using type names in error messages / autocomplete. Generally, those
// names can be more useful, but sometimes having the primitive object shape is
// significantly easier to reason about (e.g. deeply-nested types).
// Resolve is an identity function for function types.
export type Resolve<T> =
  // Re-mapping doesn't work very well for functions, so exclude them
  T extends (...args: never[]) => unknown
    ? T
    : // Re-map all the keys in T to the same value. This forces TS into no longer
      // using type aliases, etc.
      { [K in keyof T]: T[K] };

export type AnyTemporalKey = Exclude<Keys<AnyTemporalLikeType>, symbol>;

export type FieldKey = Exclude<AnyTemporalKey, Keys<Temporal.DurationLike>>;

// The properties below are all the names of Temporal properties that can be set with `with`.
// `timeZone` and `calendar` are not on the list because they have special methods to set them.

export type UnitSmallerThanOrEqualTo<T extends Temporal.DateTimeUnit> = T extends 'year'
  ? Temporal.DateTimeUnit
  : T extends 'month'
  ? Exclude<Temporal.DateTimeUnit, 'year'>
  : T extends 'week'
  ? Exclude<Temporal.DateTimeUnit, 'year' | 'month'>
  : T extends 'day'
  ? Exclude<Temporal.DateTimeUnit, 'year' | 'month' | 'week'>
  : T extends 'hour'
  ? Temporal.TimeUnit
  : T extends 'minute'
  ? Exclude<Temporal.TimeUnit, 'hour'>
  : T extends 'second'
  ? Exclude<Temporal.TimeUnit, 'hour' | 'minute'>
  : T extends 'millisecond'
  ? Exclude<Temporal.TimeUnit, 'hour' | 'minute' | 'second'>
  : T extends 'microsecond'
  ? 'nanosecond'
  : never;

type Method = (...args: any) => any;
type NonObjectKeys<T> = Exclude<keyof T, 'toString' | 'toLocaleString' | 'prototype'>;

type MethodParams<Type extends new (...args: any) => any> = {
  // constructor parameters
  constructor: ConstructorParameters<Type>;
} & {
  // static method parameters
  [Key in NonObjectKeys<Type>]: Type[Key] extends Method ? Parameters<Type[Key]> : never;
} & {
  // prototype method parameters
  [Key in keyof InstanceType<Type>]: InstanceType<Type>[Key] extends Method
    ? Parameters<InstanceType<Type>[Key]>
    : never;
};

type MethodReturn<Type extends new (...args: any) => any> = {
  constructor: InstanceType<Type>;
} & {
  [Key in NonObjectKeys<Type>]: Type[Key] extends Method ? ReturnType<Type[Key]> : Type[Key];
} & {
  [Key in keyof InstanceType<Type>]: InstanceType<Type>[Key] extends Method
    ? ReturnType<InstanceType<Type>[Key]>
    : InstanceType<Type>[Key];
};

/* Currently unused, but may use later
type InterfaceReturn<Type> = {
  [Key in keyof Type]: Type[Key] extends Method ? ReturnType<Type[Key]> : Type[Key];
};
*/

type InterfaceParams<Type> = {
  [Key in keyof Type]: Type[Key] extends Method ? Parameters<Type[Key]> : never;
};

// Parameters of each Temporal type. Examples:
// * InstantParams['compare'][1] - static methods
// * PlainDateParams['since'][0] - prototype methods
// * DurationParams['constructor'][3] - constructors
export interface ZonedDateTimeParams extends MethodParams<typeof Temporal.ZonedDateTime> {}
export interface DurationParams extends MethodParams<typeof Temporal.Duration> {}
export interface InstantParams extends MethodParams<typeof Temporal.Instant> {}
export interface PlainDateParams extends MethodParams<typeof Temporal.PlainDate> {}
export interface PlainDateTimeParams extends MethodParams<typeof Temporal.PlainDateTime> {}
export interface PlainMonthDayParams extends MethodParams<typeof Temporal.PlainMonthDay> {}
export interface PlainTimeParams extends MethodParams<typeof Temporal.PlainTime> {}
export interface PlainYearMonthParams extends MethodParams<typeof Temporal.PlainYearMonth> {}
export interface ZonedDateTimeParams extends MethodParams<typeof Temporal.ZonedDateTime> {}

// Return types of static or instance methods
export interface ZonedDateTimeReturn extends MethodReturn<typeof Temporal.ZonedDateTime> {}
export interface DurationReturn extends MethodReturn<typeof Temporal.Duration> {}
export interface InstantReturn extends MethodReturn<typeof Temporal.Instant> {}
export interface PlainDateReturn extends MethodReturn<typeof Temporal.PlainDate> {}
export interface PlainDateTimeReturn extends MethodReturn<typeof Temporal.PlainDateTime> {}
export interface PlainMonthDayReturn extends MethodReturn<typeof Temporal.PlainMonthDay> {}
export interface PlainTimeReturn extends MethodReturn<typeof Temporal.PlainTime> {}
export interface PlainYearMonthReturn extends MethodReturn<typeof Temporal.PlainYearMonth> {}
export interface ZonedDateTimeReturn extends MethodReturn<typeof Temporal.ZonedDateTime> {}

export interface DateTimeFormatParams extends MethodParams<typeof Intl.DateTimeFormat> {}
export interface DateTimeFormatReturn extends MethodReturn<typeof Intl.DateTimeFormat> {}

type OptionsAmenderFunction = (options: globalThis.Intl.DateTimeFormatOptions) => globalThis.Intl.DateTimeFormatOptions;
export type FormatterOrAmender = globalThis.Intl.DateTimeFormat | OptionsAmenderFunction;

export type Overflow = NonNullable<Temporal.AssignmentOptions['overflow']>;

export type ISODateToFieldsType = 'date' | 'year-month' | 'month-day';

export interface CalendarDateRecord {
  era: string | undefined;
  eraYear: number | undefined;
  year: number;
  month: number;
  monthCode: string;
  day: number;
  dayOfWeek: number;
  dayOfYear: number;
  weekOfYear: { week: number; year: number } | undefined;
  daysInWeek: number;
  daysInMonth: number;
  daysInYear: number;
  monthsInYear: number;
  inLeapYear: boolean;
}

export interface CalendarFieldsRecord {
  era?: string;
  eraYear?: number;
  year?: number;
  month?: number;
  monthCode?: string;
  day?: number;
  hour?: number;
  minute?: number;
  second?: number;
  millisecond?: number;
  microsecond?: number;
  nanosecond?: number;
  offset?: string;
  timeZone?: string;
}
export type CalendarYMD = { year: number; month: number; day: number };
export type MonthDayFromFieldsObject = CalendarFieldsRecord & ({ monthCode: string; day: number } | CalendarYMD);

/** Record representing YMD of an ISO calendar date */
export interface ISODate {
  year: number;
  month: number;
  day: number;
}

export type TimeRecord = Required<Temporal.PlainTimeLike>;

export interface ISODateTime {
  isoDate: ISODate;
  time: TimeRecord;
}

export interface DateDuration {
  years: number;
  months: number;
  weeks: number;
  days: number;
}

export interface InternalDuration {
  date: DateDuration;
  time: TimeDuration;
}

// Signal to TypeScript that not everything should be exported by default
export {};
