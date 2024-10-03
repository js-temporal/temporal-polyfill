import type { Temporal } from '..';
import type { DateTimeFormatParams, DurationParams } from './internaltypes';

// Constructor Properties of the Global Object
export const { Date, Map, Number, RegExp, Set, String, Symbol, WeakMap } = globalThis;

// Error constructors
export const { Error, RangeError, TypeError } = globalThis;

export const {
  assign: ObjectAssign,
  create: ObjectCreate,
  getOwnPropertyDescriptor: ObjectGetOwnPropertyDescriptor,
  getOwnPropertyNames: ObjectGetOwnPropertyNames,
  defineProperty: ObjectDefineProperty,
  defineProperties: ObjectDefineProperties,
  entries: ObjectEntries,
  keys: ObjectKeys,
  prototype: { hasOwnProperty: ObjectPrototypeHasOwnProperty }
} = Object;

export const {
  prototype: {
    concat: ArrayPrototypeConcat,
    filter: ArrayPrototypeFilter,
    every: ArrayPrototypeEvery,
    find: ArrayPrototypeFind,
    flatMap: ArrayPrototypeFlatMap,
    forEach: ArrayPrototypeForEach,
    includes: ArrayPrototypeIncludes,
    indexOf: ArrayPrototypeIndexOf,
    join: ArrayPrototypeJoin,
    map: ArrayPrototypeMap,
    push: ArrayPrototypePush,
    reduce: ArrayPrototypeReduce,
    sort: ArrayPrototypeSort
  }
} = Array;
export const {
  prototype: { toString: BigIntPrototypeToString }
} = BigInt;
export const {
  now: DateNow,
  prototype: {
    getTime: DatePrototypeGetTime,
    getUTCFullYear: DatePrototypeGetUTCFullYear,
    getUTCMonth: DatePrototypeGetUTCMonth,
    getUTCDate: DatePrototypeGetUTCDate,
    getUTCHours: DatePrototypeGetUTCHours,
    getUTCMinutes: DatePrototypeGetUTCMinutes,
    getUTCSeconds: DatePrototypeGetUTCSeconds,
    getUTCMilliseconds: DatePrototypeGetUTCMilliseconds,
    setUTCFullYear: DatePrototypeSetUTCFullYear,
    setUTCDate: DatePrototypeSetUTCDate,
    setUTCHours: DatePrototypeSetUTCHours,
    toLocaleDateString: DatePrototypeToLocaleDateString,
    valueOf: DatePrototypeValueOf
  },
  UTC: DateUTC
} = Date;
type MaybeDurationFormat = {
  new (locales: DurationParams['toLocaleString'][0], options: DurationParams['toLocaleString'][1]): MaybeDurationFormat;
  format(d: Temporal.Duration): string;
};
export const {
  supportedValuesOf: IntlSupportedValuesOf,
  DateTimeFormat: IntlDateTimeFormat,
  DurationFormat: IntlDurationFormat
} = Intl as typeof Intl & { DurationFormat?: MaybeDurationFormat };
export const { get: IntlDateTimeFormatPrototypeGetFormat } = ObjectGetOwnPropertyDescriptor(
  IntlDateTimeFormat.prototype,
  'format'
) as {
  get<P extends readonly unknown[]>(): (datetime: DateTimeFormatParams['format'][0], ...args: P) => string;
};
export const {
  formatRange: IntlDateTimeFormatPrototypeFormatRange,
  formatRangeToParts: IntlDateTimeFormatPrototypeFormatRangeToParts,
  formatToParts: IntlDateTimeFormatPrototypeFormatToParts,
  resolvedOptions: IntlDateTimeFormatPrototypeResolvedOptions
} = IntlDateTimeFormat?.prototype || ObjectCreate(null);
export const { stringify: JSONStringify } = JSON;
export const {
  prototype: { get: MapPrototypeGet, has: MapPrototypeHas, set: MapPrototypeSet }
} = Map;
export const {
  abs: MathAbs,
  floor: MathFloor,
  log10: MathLog10,
  max: MathMax,
  min: MathMin,
  sign: MathSign,
  trunc: MathTrunc
} = Math;
export const {
  MAX_SAFE_INTEGER: NumberMaxSafeInteger,
  isFinite: NumberIsFinite,
  isInteger: NumberIsInteger,
  isNaN: NumberIsNaN,
  isSafeInteger: NumberIsSafeInteger,
  parseInt: NumberParseInt,
  prototype: { toPrecision: NumberPrototypeToPrecision, toString: NumberPrototypeToString }
} = Number;
export const { apply: ReflectApply, ownKeys: ReflectOwnKeys } = Reflect;
export const {
  prototype: { exec: RegExpPrototypeExec, test: RegExpPrototypeTest }
} = RegExp;
export const {
  prototype: { add: SetPrototypeAdd, has: SetPrototypeHas }
} = Set;
export const {
  fromCharCode: StringFromCharCode,
  prototype: {
    charCodeAt: StringPrototypeCharCodeAt,
    endsWith: StringPrototypeEndsWith,
    indexOf: StringPrototypeIndexOf,
    normalize: StringPrototypeNormalize,
    padStart: StringPrototypePadStart,
    repeat: StringPrototypeRepeat,
    replace: StringPrototypeReplace,
    slice: StringPrototypeSlice,
    split: StringPrototypeSplit,
    startsWith: StringPrototypeStartsWith,
    toLowerCase: StringPrototypeToLowerCase,
    toUpperCase: StringPrototypeToUpperCase
  }
} = String;
export const { for: SymbolFor } = Symbol;
// type cast so as not to lose the well-known symbolness:
export const SymbolToStringTag: typeof Symbol.toStringTag = Symbol.toStringTag;
export const {
  prototype: { get: WeakMapPrototypeGet, set: WeakMapPrototypeSet }
} = WeakMap;

export const { warn } = console;
const performance = globalThis.performance;
export const now = performance && performance.now ? performance.now.bind(performance) : Date.now;
