import { Temporal } from '..';
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

export type AnyTemporalType =
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

export type AnyTemporalLikeType =
  | Temporal.DurationLike
  | Temporal.PlainDateLike
  | Temporal.PlainDateTimeLike
  | Temporal.PlainMonthDayLike
  | Temporal.PlainTimeLike
  | Temporal.PlainYearMonthLike
  | Temporal.ZonedDateTimeLike;

// The properties below are all the names of Temporal properties that can be set with `with`.
// `timeZone` and `calendar` are not on the list because they have special methods to set them.
export type PrimitivePropertyNames =
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
