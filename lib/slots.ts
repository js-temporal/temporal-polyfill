import type JSBI from 'jsbi';
import type { Temporal } from '..';
import type {
  BuiltinCalendarId,
  AnySlottedType,
  FormatterOrAmender,
  ISODate,
  ISODateTime,
  TimeRecord
} from './internaltypes';
import type { DateTimeFormatImpl } from './intl';

// Instant
export const EPOCHNANOSECONDS = 'slot-epochNanoSeconds';

// DateTime, Date, Time, YearMonth, MonthDay
export const ISO_DATE = 'slot-iso-date';
export const ISO_DATE_TIME = 'slot-iso-date-time';
export const TIME = 'slot-time';
export const CALENDAR = 'slot-calendar';
// Date, YearMonth, and MonthDay all have the same slots, disambiguation needed:
export const DATE_BRAND = 'slot-date-brand';
export const YEAR_MONTH_BRAND = 'slot-year-month-brand';
export const MONTH_DAY_BRAND = 'slot-month-day-brand';

// ZonedDateTime
export const TIME_ZONE = 'slot-time-zone';

// Duration
export const YEARS = 'slot-years';
export const MONTHS = 'slot-months';
export const WEEKS = 'slot-weeks';
export const DAYS = 'slot-days';
export const HOURS = 'slot-hours';
export const MINUTES = 'slot-minutes';
export const SECONDS = 'slot-seconds';
export const MILLISECONDS = 'slot-milliseconds';
export const MICROSECONDS = 'slot-microseconds';
export const NANOSECONDS = 'slot-nanoseconds';

// DateTimeFormatImpl
export const DATE = 'date';
export const YM = 'ym';
export const MD = 'md';
export const TIME_FMT = 'time';
export const DATETIME = 'datetime';
export const INST = 'instant';
export const ORIGINAL = 'original';
export const TZ_CANONICAL = 'timezone-canonical';
export const TZ_ORIGINAL = 'timezone-original';
export const CAL_ID = 'calendar-id';
export const LOCALE = 'locale';
export const OPTIONS = 'options';

interface SlotInfo<ValueType, UsedByType extends AnySlottedType> {
  value: ValueType;
  usedBy: UsedByType;
}

interface SlotInfoRecord {
  [k: string]: SlotInfo<unknown, AnySlottedType>;
}

interface Slots extends SlotInfoRecord {
  // Instant
  [EPOCHNANOSECONDS]: SlotInfo<JSBI, Temporal.Instant | Temporal.ZonedDateTime>; // number? JSBI?

  // DateTime, Date, Time, YearMonth, MonthDay
  [ISO_DATE]: SlotInfo<ISODate, Temporal.PlainDate | Temporal.PlainMonthDay | Temporal.PlainYearMonth>;
  [ISO_DATE_TIME]: SlotInfo<ISODateTime, Temporal.PlainDateTime>;
  [TIME]: SlotInfo<TimeRecord, Temporal.PlainTime>;
  [CALENDAR]: SlotInfo<BuiltinCalendarId, TypesWithCalendarUnits>;

  // Date, YearMonth, MonthDay common slots
  [DATE_BRAND]: SlotInfo<true, Temporal.PlainDate>;
  [YEAR_MONTH_BRAND]: SlotInfo<true, Temporal.PlainYearMonth>;
  [MONTH_DAY_BRAND]: SlotInfo<true, Temporal.PlainMonthDay>;

  // ZonedDateTime
  [TIME_ZONE]: SlotInfo<string, Temporal.ZonedDateTime>;

  // Duration
  [YEARS]: SlotInfo<number, Temporal.Duration>;
  [MONTHS]: SlotInfo<number, Temporal.Duration>;
  [WEEKS]: SlotInfo<number, Temporal.Duration>;
  [DAYS]: SlotInfo<number, Temporal.Duration>;
  [HOURS]: SlotInfo<number, Temporal.Duration>;
  [MINUTES]: SlotInfo<number, Temporal.Duration>;
  [SECONDS]: SlotInfo<number, Temporal.Duration>;
  [MILLISECONDS]: SlotInfo<number, Temporal.Duration>;
  [MICROSECONDS]: SlotInfo<number, Temporal.Duration>;
  [NANOSECONDS]: SlotInfo<number, Temporal.Duration>;

  // DateTimeFormatImpl
  [DATE]: SlotInfo<FormatterOrAmender, DateTimeFormatImpl>;
  [YM]: SlotInfo<FormatterOrAmender, DateTimeFormatImpl>;
  [MD]: SlotInfo<FormatterOrAmender, DateTimeFormatImpl>;
  [TIME_FMT]: SlotInfo<FormatterOrAmender, DateTimeFormatImpl>;
  [DATETIME]: SlotInfo<FormatterOrAmender, DateTimeFormatImpl>;
  [INST]: SlotInfo<FormatterOrAmender, DateTimeFormatImpl>;
  [ORIGINAL]: SlotInfo<globalThis.Intl.DateTimeFormat, DateTimeFormatImpl>;
  [TZ_CANONICAL]: SlotInfo<string, DateTimeFormatImpl>;
  [TZ_ORIGINAL]: SlotInfo<string, DateTimeFormatImpl>;
  [CAL_ID]: SlotInfo<globalThis.Intl.ResolvedDateTimeFormatOptions['calendar'], DateTimeFormatImpl>;
  [LOCALE]: SlotInfo<globalThis.Intl.ResolvedDateTimeFormatOptions['locale'], DateTimeFormatImpl>;
  [OPTIONS]: SlotInfo<Intl.DateTimeFormatOptions, DateTimeFormatImpl>;
}

type TypesWithCalendarUnits =
  | Temporal.PlainDateTime
  | Temporal.PlainDate
  | Temporal.PlainYearMonth
  | Temporal.PlainMonthDay
  | Temporal.ZonedDateTime;

interface SlotsToTypes {
  // Instant
  [EPOCHNANOSECONDS]: Temporal.Instant;

  // DateTime, Date, Time, YearMonth, MonthDay
  [ISO_DATE]: Temporal.PlainDate | Temporal.PlainYearMonth | Temporal.PlainMonthDay;
  [ISO_DATE_TIME]: Temporal.PlainDateTime;
  [TIME]: Temporal.PlainTime;
  [CALENDAR]: TypesWithCalendarUnits;

  // Date, YearMonth, MonthDay common slots
  [DATE_BRAND]: Temporal.PlainDate;
  [YEAR_MONTH_BRAND]: Temporal.PlainYearMonth;
  [MONTH_DAY_BRAND]: Temporal.PlainMonthDay;

  // ZonedDateTime
  [TIME_ZONE]: Temporal.ZonedDateTime;

  // Duration
  [YEARS]: Temporal.Duration;
  [MONTHS]: Temporal.Duration;
  [WEEKS]: Temporal.Duration;
  [DAYS]: Temporal.Duration;
  [HOURS]: Temporal.Duration;
  [MINUTES]: Temporal.Duration;
  [SECONDS]: Temporal.Duration;
  [MILLISECONDS]: Temporal.Duration;
  [MICROSECONDS]: Temporal.Duration;
  [NANOSECONDS]: Temporal.Duration;

  // DateTimeFormatImpl
  [DATE]: DateTimeFormatImpl;
  [YM]: DateTimeFormatImpl;
  [MD]: DateTimeFormatImpl;
  [TIME_FMT]: DateTimeFormatImpl;
  [DATETIME]: DateTimeFormatImpl;
  [INST]: DateTimeFormatImpl;
  [ORIGINAL]: DateTimeFormatImpl;
  [TZ_CANONICAL]: DateTimeFormatImpl;
  [TZ_ORIGINAL]: DateTimeFormatImpl;
  [CAL_ID]: DateTimeFormatImpl;
  [LOCALE]: DateTimeFormatImpl;
  [OPTIONS]: DateTimeFormatImpl;
}

type SlotKey = keyof SlotsToTypes;

const globalSlots = new WeakMap<Slots[keyof Slots]['usedBy'], Record<keyof Slots, Slots[keyof Slots]['value']>>();

function _GetSlots(container: Slots[keyof Slots]['usedBy']) {
  return globalSlots.get(container);
}

const GetSlotsSymbol = Symbol.for('@@Temporal__GetSlots');

// expose GetSlots to avoid dual package hazards
(globalThis as any)[GetSlotsSymbol] ||= _GetSlots;

const GetSlots = (globalThis as any)[GetSlotsSymbol] as typeof _GetSlots;

function _CreateSlots(container: Slots[keyof Slots]['usedBy']): void {
  globalSlots.set(container, Object.create(null));
}

const CreateSlotsSymbol = Symbol.for('@@Temporal__CreateSlots');

// expose CreateSlots to avoid dual package hazards
(globalThis as any)[CreateSlotsSymbol] ||= _CreateSlots;

export const CreateSlots = (globalThis as any)[CreateSlotsSymbol] as typeof _CreateSlots;

// TODO: is there a better way than 9 overloads to make HasSlot into a type
// guard that takes a variable number of parameters?
export function HasSlot<ID1 extends SlotKey>(container: unknown, id1: ID1): container is Slots[ID1]['usedBy'];
export function HasSlot<ID1 extends SlotKey, ID2 extends SlotKey>(
  container: unknown,
  id1: ID1,
  id2: ID2
): container is Slots[ID1]['usedBy'] | Slots[ID2]['usedBy'];
export function HasSlot<ID1 extends SlotKey, ID2 extends SlotKey, ID3 extends SlotKey>(
  container: unknown,
  id1: ID1,
  id2: ID2,
  id3: ID3
): container is Slots[ID1]['usedBy'] | Slots[ID2]['usedBy'] | Slots[ID3]['usedBy'];
export function HasSlot<ID1 extends SlotKey, ID2 extends SlotKey, ID3 extends SlotKey, ID4 extends SlotKey>(
  container: unknown,
  id1: ID1,
  id2: ID2,
  id3: ID3,
  id4: ID4
): container is Slots[ID1 | ID2 | ID3 | ID4]['usedBy'];
export function HasSlot<
  ID1 extends SlotKey,
  ID2 extends SlotKey,
  ID3 extends SlotKey,
  ID4 extends SlotKey,
  ID5 extends SlotKey
>(
  container: unknown,
  id1: ID1,
  id2: ID2,
  id3: ID3,
  id4: ID4,
  id5: ID5
): container is Slots[ID1 | ID2 | ID3 | ID4 | ID5]['usedBy'];
export function HasSlot<
  ID1 extends SlotKey,
  ID2 extends SlotKey,
  ID3 extends SlotKey,
  ID4 extends SlotKey,
  ID5 extends SlotKey,
  ID6 extends SlotKey
>(
  container: unknown,
  id1: ID1,
  id2: ID2,
  id3: ID3,
  id4: ID4,
  id5: ID5,
  id6: ID6
): container is Slots[ID1 | ID2 | ID3 | ID4 | ID5 | ID6]['usedBy'];
export function HasSlot<
  ID1 extends SlotKey,
  ID2 extends SlotKey,
  ID3 extends SlotKey,
  ID4 extends SlotKey,
  ID5 extends SlotKey,
  ID6 extends SlotKey,
  ID7 extends SlotKey
>(
  container: unknown,
  id1: ID1,
  id2: ID2,
  id3: ID3,
  id4: ID4,
  id5: ID5,
  id6: ID6,
  id7: ID7
): container is Slots[ID1 | ID2 | ID3 | ID4 | ID5 | ID6 | ID7]['usedBy'];
export function HasSlot<
  ID1 extends SlotKey,
  ID2 extends SlotKey,
  ID3 extends SlotKey,
  ID4 extends SlotKey,
  ID5 extends SlotKey,
  ID6 extends SlotKey,
  ID7 extends SlotKey,
  ID8 extends SlotKey
>(
  container: unknown,
  id1: ID1,
  id2: ID2,
  id3: ID3,
  id4: ID4,
  id5: ID5,
  id6: ID6,
  id7: ID7,
  id8: ID8
): container is Slots[ID1 | ID2 | ID3 | ID4 | ID5 | ID6 | ID7 | ID8]['usedBy'];
export function HasSlot<
  ID1 extends SlotKey,
  ID2 extends SlotKey,
  ID3 extends SlotKey,
  ID4 extends SlotKey,
  ID5 extends SlotKey,
  ID6 extends SlotKey,
  ID7 extends SlotKey,
  ID8 extends SlotKey,
  ID9 extends SlotKey
>(
  container: unknown,
  id1: ID1,
  id2: ID2,
  id3: ID3,
  id4: ID4,
  id5: ID5,
  id6: ID6,
  id7: ID7,
  id8: ID8,
  id9: ID9
): container is Slots[ID1 | ID2 | ID3 | ID4 | ID5 | ID6 | ID7 | ID8 | ID9]['usedBy'];
export function HasSlot(container: unknown, ...ids: (keyof Slots)[]): boolean {
  if (!container || 'object' !== typeof container) return false;
  const myslots = GetSlots(container as AnySlottedType);
  return !!myslots && ids.every((id) => id in myslots);
}
export function GetSlot<KeyT extends keyof Slots>(
  container: Slots[typeof id]['usedBy'],
  id: KeyT
): Slots[KeyT]['value'] {
  const value = GetSlots(container)?.[id];
  if (value === undefined) throw new TypeError(`Missing internal slot ${id}`);
  return value;
}
export function SetSlot<KeyT extends SlotKey>(
  container: Slots[KeyT]['usedBy'],
  id: KeyT,
  value: Slots[KeyT]['value']
): void {
  const slots = GetSlots(container);

  if (slots === undefined) throw new TypeError('Missing slots for the given container');

  const existingSlot = slots[id];

  if (existingSlot) throw new TypeError(`${id} already has set`);

  slots[id] = value;
}

export function ResetSlot<KeyT extends SlotKey>(
  container: DateTimeFormatImpl,
  id: KeyT,
  value: Slots[KeyT]['value']
): void {
  const slots = GetSlots(container);

  if (slots === undefined) throw new TypeError('Missing slots for the given container');

  const existingSlot = slots[id];

  if (existingSlot === undefined) throw new TypeError(`tried to reset ${id} which was not set`);

  slots[id] = value;
}
