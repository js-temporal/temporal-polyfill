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
  | Temporal.Calendar
  | Temporal.Duration
  | Temporal.Instant
  | Temporal.PlainDate
  | Temporal.PlainDateTime
  | Temporal.PlainMonthDay
  | Temporal.PlainTime
  | Temporal.PlainYearMonth
  | Temporal.TimeZone
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

export type CalendarSlot = string | Temporal.CalendarProtocol;
export type TimeZoneSlot = string | Temporal.TimeZoneProtocol;

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

export type AnyTemporalKey = Exclude<Keys<AnyTemporalLikeType>, symbol>;

export type FieldKey = Exclude<AnyTemporalKey, Keys<Temporal.DurationLike>>;

// The properties below are all the names of Temporal properties that can be set with `with`.
// `timeZone` and `calendar` are not on the list because they have special methods to set them.

// Used in PrimitiveFieldsOf
type PrimitivePropertyNames =
  | 'year'
  | 'month'
  | 'monthCode'
  | 'day'
  | 'hour'
  | 'minute'
  | 'second'
  | 'millisecond'
  | 'microsecond'
  | 'nanosecond'
  | 'years'
  | 'months'
  | 'weeks'
  | 'days'
  | 'hours'
  | 'minutes'
  | 'seconds'
  | 'milliseconds'
  | 'microseconds'
  | 'nanoseconds'
  | 'era'
  | 'eraYear'
  | 'offset';

export type PrimitiveFieldsOf<T extends AnyTemporalLikeType> = Pick<T, keyof T & PrimitivePropertyNames>;

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
export interface CalendarParams extends MethodParams<typeof Temporal.Calendar> {}
export interface DurationParams extends MethodParams<typeof Temporal.Duration> {}
export interface InstantParams extends MethodParams<typeof Temporal.Instant> {}
export interface PlainDateParams extends MethodParams<typeof Temporal.PlainDate> {}
export interface PlainDateTimeParams extends MethodParams<typeof Temporal.PlainDateTime> {}
export interface PlainMonthDayParams extends MethodParams<typeof Temporal.PlainMonthDay> {}
export interface PlainTimeParams extends MethodParams<typeof Temporal.PlainTime> {}
export interface PlainYearMonthParams extends MethodParams<typeof Temporal.PlainYearMonth> {}
export interface TimeZoneParams extends MethodParams<typeof Temporal.TimeZone> {}
export interface ZonedDateTimeParams extends MethodParams<typeof Temporal.ZonedDateTime> {}

// Return types of static or instance methods
export interface ZonedDateTimeReturn extends MethodReturn<typeof Temporal.ZonedDateTime> {}
export interface CalendarReturn extends MethodReturn<typeof Temporal.Calendar> {}
export interface DurationReturn extends MethodReturn<typeof Temporal.Duration> {}
export interface InstantReturn extends MethodReturn<typeof Temporal.Instant> {}
export interface PlainDateReturn extends MethodReturn<typeof Temporal.PlainDate> {}
export interface PlainDateTimeReturn extends MethodReturn<typeof Temporal.PlainDateTime> {}
export interface PlainMonthDayReturn extends MethodReturn<typeof Temporal.PlainMonthDay> {}
export interface PlainTimeReturn extends MethodReturn<typeof Temporal.PlainTime> {}
export interface PlainYearMonthReturn extends MethodReturn<typeof Temporal.PlainYearMonth> {}
export interface TimeZoneReturn extends MethodReturn<typeof Temporal.TimeZone> {}
export interface ZonedDateTimeReturn extends MethodReturn<typeof Temporal.ZonedDateTime> {}

export interface CalendarProtocolParams extends InterfaceParams<Temporal.CalendarProtocol> {}
// UNUSED, BUT MAY USE LATER
// export interface TimeZoneProtocolParams extends InterfaceParams<Temporal.TimeZoneProtocol> {}
// export interface TimeZoneProtocolReturn extends InterfaceReturn<Temporal.TimeZoneProtocol> {}
// export interface CalendarProtocolReturn extends InterfaceReturn<Temporal.CalendarProtocol> {}

export interface DateTimeFormatParams extends MethodParams<typeof Intl.DateTimeFormat> {}
export interface DateTimeFormatReturn extends MethodReturn<typeof Intl.DateTimeFormat> {}

type OptionsAmenderFunction = (options: Intl.DateTimeFormatOptions) => globalThis.Intl.DateTimeFormatOptions;
export type FormatterOrAmender = globalThis.Intl.DateTimeFormat | OptionsAmenderFunction;

export interface ISODateTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
  microsecond: number;
  nanosecond: number;
}

export interface InternalDuration {
  years: number;
  months: number;
  weeks: number;
  days: number;
  norm: TimeDuration;
}

// Signal to TypeScript that not everything should be exported by default
export {};
