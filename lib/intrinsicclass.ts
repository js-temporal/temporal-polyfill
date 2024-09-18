import {
  ArrayPrototypeJoin,
  ArrayPrototypePush,
  ObjectDefineProperty,
  ObjectGetOwnPropertyDescriptor,
  ObjectGetOwnPropertyNames,
  ReflectApply,
  SymbolFor,
  SymbolToStringTag
} from './primordials';

import type JSBI from 'jsbi';
import type { Temporal } from '..';
import type { CalendarImpl } from './calendar';
import type { BuiltinCalendarId, ISODate } from './internaltypes';

import { DEBUG } from './debug';

type OmitConstructor<T> = { [P in keyof T as T[P] extends new (...args: any[]) => any ? P : never]: T[P] };

type TemporalIntrinsics = {
  ['Intl.DateTimeFormat']: typeof globalThis.Intl.DateTimeFormat;
  ['Temporal.Duration']: typeof Temporal.Duration;
  ['Temporal.Instant']: OmitConstructor<Temporal.Instant> &
    (new (epochNanoseconds: JSBI) => Temporal.Instant) & { prototype: typeof Temporal.Instant.prototype };
  ['Temporal.PlainDate']: typeof Temporal.PlainDate;
  ['Temporal.PlainDateTime']: typeof Temporal.PlainDateTime;
  ['Temporal.PlainMonthDay']: typeof Temporal.PlainMonthDay;
  ['Temporal.PlainTime']: typeof Temporal.PlainTime;
  ['Temporal.PlainYearMonth']: typeof Temporal.PlainYearMonth;
  ['Temporal.ZonedDateTime']: OmitConstructor<Temporal.ZonedDateTime> &
    (new (epochNanoseconds: JSBI, timeZone: string, calendar?: string) => Temporal.ZonedDateTime) & {
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

type OtherIntrinsics = {
  calendarImpl: (id: BuiltinCalendarId) => CalendarImpl;
  calendarDateWeekOfYear: (id: BuiltinCalendarId, isoDate: ISODate) => { week?: number; year?: number };
};
type OtherIntrinsicKeys = { [key in keyof OtherIntrinsics as `%${key}%`]: OtherIntrinsics[key] };

const INTRINSICS = {} as TemporalIntrinsicRegisteredKeys &
  TemporalIntrinsicPrototypeRegisteredKeys &
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
    const entries: string[] = [];
    const props = [
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
    ] as const;
    for (let i = 0; i < props.length; i++) {
      const prop = props[i];
      if (this[prop] !== 0) {
        ReflectApply(ArrayPrototypePush, entries, [`  ${prop}: ${options.stylize(this[prop], 'number')}`]);
      }
    }
    return descr + ' {\n' + ReflectApply(ArrayPrototypeJoin, entries, [',\n']) + '\n}';
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
  ObjectDefineProperty(Class.prototype, SymbolToStringTag, {
    value: name,
    writable: false,
    enumerable: false,
    configurable: true
  });
  if (DEBUG) {
    ObjectDefineProperty(Class.prototype, SymbolFor('nodejs.util.inspect.custom'), {
      value: customUtilInspectFormatters[name] || defaultUtilInspectFormatter,
      writable: false,
      enumerable: false,
      configurable: true
    });
  }
  const staticNames = ObjectGetOwnPropertyNames(Class);
  for (let i = 0; i < staticNames.length; i++) {
    const prop = staticNames[i];
    // we know that `prop` is present, so the descriptor is never undefined
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const desc = ObjectGetOwnPropertyDescriptor(Class, prop)!;
    if (!desc.configurable || !desc.enumerable) continue;
    desc.enumerable = false;
    Object.defineProperty(Class, prop, desc);
  }
  const protoNames = ObjectGetOwnPropertyNames(Class.prototype);
  for (let i = 0; i < protoNames.length; i++) {
    const prop = protoNames[i];
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
  | keyof OtherIntrinsics;
export function DefineIntrinsic<KeyT extends keyof TemporalIntrinsicRegistrations>(
  name: KeyT,
  value: TemporalIntrinsicRegistrations[KeyT]
): void;
export function DefineIntrinsic<KeyT extends keyof TemporalIntrinsicPrototypeRegistrations>(
  name: KeyT,
  value: TemporalIntrinsicPrototypeRegistrations[KeyT]
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
