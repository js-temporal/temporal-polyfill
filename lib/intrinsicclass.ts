import type JSBI from 'jsbi';
import type { Temporal } from '..';
import type { CalendarFieldsImplType } from './calendar';

import { DEBUG } from './debug';

type OmitConstructor<T> = { [P in keyof T as T[P] extends new (...args: any[]) => any ? P : never]: T[P] };

type TemporalIntrinsics = {
  ['Intl.DateTimeFormat']: typeof globalThis.Intl.DateTimeFormat;
  ['Temporal.Calendar']: typeof Temporal.Calendar;
  ['Temporal.Duration']: typeof Temporal.Duration;
  ['Temporal.Instant']: OmitConstructor<Temporal.Instant> &
    (new (epochNanoseconds: JSBI) => Temporal.Instant) & { prototype: typeof Temporal.Instant.prototype };
  ['Temporal.PlainDate']: typeof Temporal.PlainDate;
  ['Temporal.PlainDateTime']: typeof Temporal.PlainDateTime;
  ['Temporal.PlainMonthDay']: typeof Temporal.PlainMonthDay;
  ['Temporal.PlainTime']: typeof Temporal.PlainTime;
  ['Temporal.PlainYearMonth']: typeof Temporal.PlainYearMonth;
  ['Temporal.TimeZone']: typeof Temporal.TimeZone;
  ['Temporal.ZonedDateTime']: OmitConstructor<Temporal.ZonedDateTime> &
    (new (
      epochNanoseconds: JSBI,
      timeZone: string | Temporal.TimeZoneProtocol,
      calendar?: string | Temporal.CalendarProtocol
    ) => Temporal.ZonedDateTime) & {
      prototype: typeof Temporal.ZonedDateTime.prototype;
      from: typeof Temporal.ZonedDateTime.from;
      compare: typeof Temporal.ZonedDateTime.compare;
    };
};
type TemporalIntrinsicRegistrations = {
  [key in keyof TemporalIntrinsics]: TemporalIntrinsics[key];
};
type TemporalIntrinsicPrototypeRegistrations = {
  [key in keyof TemporalIntrinsics as `${key}.prototype`]: TemporalIntrinsics[key]['prototype'];
};
type TemporalIntrinsicRegisteredKeys = {
  [key in keyof TemporalIntrinsicRegistrations as `%${key}%`]: TemporalIntrinsicRegistrations[key];
};
type TemporalIntrinsicPrototypeRegisteredKeys = {
  [key in keyof TemporalIntrinsicPrototypeRegistrations as `%${key}%`]: TemporalIntrinsicPrototypeRegistrations[key];
};

type CalendarPrototypeKeys = keyof Omit<Temporal.Calendar, typeof Symbol.toStringTag>;
type TemporalCalendarIntrinsicRegistrations = {
  [key in CalendarPrototypeKeys as `Temporal.Calendar.prototype.${key}`]: Temporal.Calendar[key];
} & {
  'Temporal.Calendar.from': typeof Temporal.Calendar.from;
};
type TemporalCalendarIntrinsicRegisteredKeys = {
  [key in keyof TemporalCalendarIntrinsicRegistrations as `%${key}%`]: TemporalCalendarIntrinsicRegistrations[key];
};

export type TimeZonePrototypeKeys = 'getOffsetNanosecondsFor' | 'getPossibleInstantsFor';
type TemporalTimeZoneIntrinsicRegistrations = {
  [key in TimeZonePrototypeKeys as `Temporal.TimeZone.prototype.${key}`]: Temporal.TimeZone[key];
} & {
  'Temporal.TimeZone.from': typeof Temporal.TimeZone.from;
};
type TemporalTimeZoneIntrinsicRegisteredKeys = {
  [key in keyof TemporalTimeZoneIntrinsicRegistrations as `%${key}%`]: TemporalTimeZoneIntrinsicRegistrations[key];
};

type OtherIntrinsics = {
  calendarFieldsImpl: CalendarFieldsImplType;
};
type OtherIntrinsicKeys = { [key in keyof OtherIntrinsics as `%${key}%`]: OtherIntrinsics[key] };

const INTRINSICS = {} as TemporalIntrinsicRegisteredKeys &
  TemporalIntrinsicPrototypeRegisteredKeys &
  TemporalTimeZoneIntrinsicRegisteredKeys &
  TemporalCalendarIntrinsicRegisteredKeys &
  OtherIntrinsicKeys;

type customFormatFunction<T> = (
  this: T & { _repr_: string }, // _repr_ is present if DEBUG
  depth: number,
  options: { stylize: (value: unknown, type: 'number' | 'special') => string }
) => string;
const customUtilInspectFormatters: Partial<{
  [key in keyof TemporalIntrinsicRegistrations]: customFormatFunction<
    InstanceType<TemporalIntrinsicRegistrations[key]>
  >;
}> = {
  ['Temporal.Duration'](depth, options) {
    const descr = options.stylize(this._repr_, 'special');
    if (depth < 1) return descr;
    const entries = [];
    for (const prop of [
      'years',
      'months',
      'weeks',
      'days',
      'hours',
      'minutes',
      'seconds',
      'milliseconds',
      'microseconds',
      'nanoseconds'
    ] as const) {
      if (this[prop] !== 0) entries.push(`  ${prop}: ${options.stylize(this[prop], 'number')}`);
    }
    return descr + ' {\n' + entries.join(',\n') + '\n}';
  }
};

type InspectFormatterOptions = { stylize: (str: string, styleType: string) => string };
function defaultUtilInspectFormatter(this: any, depth: number, options: InspectFormatterOptions) {
  return options.stylize(this._repr_, 'special');
}

export function MakeIntrinsicClass(
  Class: TemporalIntrinsicRegistrations[typeof name],
  name: keyof TemporalIntrinsicRegistrations
) {
  Object.defineProperty(Class.prototype, Symbol.toStringTag, {
    value: name,
    writable: false,
    enumerable: false,
    configurable: true
  });
  if (DEBUG) {
    Object.defineProperty(Class.prototype, Symbol.for('nodejs.util.inspect.custom'), {
      value: customUtilInspectFormatters[name] || defaultUtilInspectFormatter,
      writable: false,
      enumerable: false,
      configurable: true
    });
  }
  for (const prop of Object.getOwnPropertyNames(Class)) {
    // we know that `prop` is present, so the descriptor is never undefined
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const desc = Object.getOwnPropertyDescriptor(Class, prop)!;
    if (!desc.configurable || !desc.enumerable) continue;
    desc.enumerable = false;
    Object.defineProperty(Class, prop, desc);
  }
  for (const prop of Object.getOwnPropertyNames(Class.prototype)) {
    // we know that `prop` is present, so the descriptor is never undefined
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const desc = Object.getOwnPropertyDescriptor(Class.prototype, prop)!;
    if (!desc.configurable || !desc.enumerable) continue;
    desc.enumerable = false;
    Object.defineProperty(Class.prototype, prop, desc);
  }

  DefineIntrinsic(name, Class);
  DefineIntrinsic(`${name}.prototype`, Class.prototype);
}

type IntrinsicDefinitionKeys =
  | keyof TemporalIntrinsicRegistrations
  | keyof TemporalIntrinsicPrototypeRegistrations
  | keyof TemporalCalendarIntrinsicRegistrations
  | keyof TemporalTimeZoneIntrinsicRegistrations
  | keyof OtherIntrinsics;
export function DefineIntrinsic<KeyT extends keyof TemporalIntrinsicRegistrations>(
  name: KeyT,
  value: TemporalIntrinsicRegistrations[KeyT]
): void;
export function DefineIntrinsic<KeyT extends keyof TemporalIntrinsicPrototypeRegistrations>(
  name: KeyT,
  value: TemporalIntrinsicPrototypeRegistrations[KeyT]
): void;
export function DefineIntrinsic<KeyT extends keyof TemporalCalendarIntrinsicRegistrations>(
  name: KeyT,
  value: TemporalCalendarIntrinsicRegistrations[KeyT]
): void;
export function DefineIntrinsic<KeyT extends keyof TemporalTimeZoneIntrinsicRegistrations>(
  name: KeyT,
  value: TemporalTimeZoneIntrinsicRegistrations[KeyT]
): void;
export function DefineIntrinsic<KeyT extends keyof OtherIntrinsics>(name: KeyT, value: OtherIntrinsics[KeyT]): void;
export function DefineIntrinsic<KeyT>(name: KeyT, value: never): void;
export function DefineIntrinsic<KeyT extends IntrinsicDefinitionKeys>(name: KeyT, value: unknown): void {
  const key: `%${IntrinsicDefinitionKeys}%` = `%${name}%`;
  if (INTRINSICS[key] !== undefined) throw new Error(`intrinsic ${name} already exists`);
  INTRINSICS[key] = value;
}
export function GetIntrinsic<KeyT extends keyof typeof INTRINSICS>(intrinsic: KeyT): (typeof INTRINSICS)[KeyT] {
  return INTRINSICS[intrinsic];
}
