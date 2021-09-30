import { Temporal } from '.';

import { DEBUG } from './debug';

type TemporalIntrinsics = Omit<typeof Temporal, 'Now'>;
type TemporalIntrinsicRegistrations = {
  [key in keyof TemporalIntrinsics as `Temporal.${key}`]: TemporalIntrinsics[key];
};
type TemporalIntrinsicPrototypeRegistrations = {
  [key in keyof TemporalIntrinsics as `Temporal.${key}.prototype`]: TemporalIntrinsics[key]['prototype'];
};
type TemporalIntrinsicRegisteredKeys = {
  [key in keyof TemporalIntrinsicRegistrations as `%${key}%`]: TemporalIntrinsicRegistrations[key];
};

interface StandaloneIntrinsics {
  'Temporal.Calendar.from': typeof Temporal.Calendar.from;
  'Temporal.TimeZone.prototype.getOffsetNanosecondsFor': typeof Temporal.TimeZone.prototype.getOffsetNanosecondsFor;
}
type RegisteredStandaloneIntrinsics = { [key in keyof StandaloneIntrinsics as `%${key}%`]: StandaloneIntrinsics[key] };
const INTRINSICS: Partial<TemporalIntrinsicRegisteredKeys & RegisteredStandaloneIntrinsics> = {};

type customFormatFunction<T> = (
  this: T,
  depth: number,
  options: { stylize: (value: unknown, type: 'number' | 'special') => string }
) => string;
const customUtilInspectFormatters: Partial<{
  [key in keyof TemporalIntrinsicRegistrations]: customFormatFunction<TemporalIntrinsicRegistrations[key]>;
}> = {
  ['Temporal.Duration'](depth, options) {
    const descr = options.stylize(`${this[Symbol.toStringTag]} <${this}>`, 'special');
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
    ]) {
      if (this[prop] !== 0) entries.push(`  ${prop}: ${options.stylize(this[prop], 'number')}`);
    }
    return descr + ' {\n' + entries.join(',\n') + '\n}';
  }
};

function defaultUtilInspectFormatter(this: any, depth, options) {
  return options.stylize(`${this[Symbol.toStringTag]} <${this}>`, 'special');
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
    const desc = Object.getOwnPropertyDescriptor(Class, prop);
    if (!desc.configurable || !desc.enumerable) continue;
    desc.enumerable = false;
    Object.defineProperty(Class, prop, desc);
  }
  for (const prop of Object.getOwnPropertyNames(Class.prototype)) {
    const desc = Object.getOwnPropertyDescriptor(Class.prototype, prop);
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
  | keyof StandaloneIntrinsics;
export function DefineIntrinsic<KeyT extends keyof TemporalIntrinsicRegistrations>(
  name: KeyT,
  value: TemporalIntrinsicRegistrations[KeyT]
);
export function DefineIntrinsic<KeyT extends keyof TemporalIntrinsicPrototypeRegistrations>(
  name: KeyT,
  value: TemporalIntrinsicPrototypeRegistrations[KeyT]
);
export function DefineIntrinsic<KeyT extends keyof StandaloneIntrinsics>(name: KeyT, value: StandaloneIntrinsics[KeyT]);
export function DefineIntrinsic<KeyT>(name: KeyT, value: never);
export function DefineIntrinsic<KeyT extends IntrinsicDefinitionKeys>(name: KeyT, value: unknown) {
  const key = `%${name}%`;
  if (INTRINSICS[key] !== undefined) throw new Error(`intrinsic ${name} already exists`);
  INTRINSICS[key] = value;
}
export function GetIntrinsic<KeyT extends keyof typeof INTRINSICS>(intrinsic: KeyT): typeof INTRINSICS[KeyT] {
  return INTRINSICS[intrinsic];
}
