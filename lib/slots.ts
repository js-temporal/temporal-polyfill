import { Temporal } from '.';
import bigInt from 'big-integer';

// Instant
export const EPOCHNANOSECONDS = 'slot-epochNanoSeconds';

// TimeZone
export const TIMEZONE_ID = 'slot-timezone-identifier';

// DateTime, Date, Time, YearMonth, MonthDay
export const ISO_YEAR = 'slot-year';
export const ISO_MONTH = 'slot-month';
export const ISO_DAY = 'slot-day';
export const ISO_HOUR = 'slot-hour';
export const ISO_MINUTE = 'slot-minute';
export const ISO_SECOND = 'slot-second';
export const ISO_MILLISECOND = 'slot-millisecond';
export const ISO_MICROSECOND = 'slot-microsecond';
export const ISO_NANOSECOND = 'slot-nanosecond';
export const CALENDAR = 'slot-calendar';
// Date, YearMonth, and MonthDay all have the same slots, disambiguation needed:
export const DATE_BRAND = 'slot-date-brand';
export const YEAR_MONTH_BRAND = 'slot-year-month-brand';
export const MONTH_DAY_BRAND = 'slot-month-day-brand';

// ZonedDateTime
export const INSTANT = 'slot-cached-instant';
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

// Calendar
export const CALENDAR_ID = 'slot-calendar-identifier';

interface Slots {
  // Instant
  [EPOCHNANOSECONDS]: bigInt.BigInteger; // number? JSBI?

  // TimeZone
  [TIMEZONE_ID]: string;

  // DateTime, Date, Time, YearMonth, MonthDay
  [ISO_YEAR]: number;
  [ISO_MONTH]: number;
  [ISO_DAY]: number;
  [ISO_HOUR]: number;
  [ISO_MINUTE]: number;
  [ISO_SECOND]: number;
  [ISO_MILLISECOND]: number;
  [ISO_MICROSECOND]: number;
  [ISO_NANOSECOND]: number;
  [CALENDAR]: Temporal.Calendar;

  // Date, YearMonth, MonthDay common slots
  [DATE_BRAND]: unknown;
  [YEAR_MONTH_BRAND]: unknown;
  [MONTH_DAY_BRAND]: unknown;

  // ZonedDateTime
  [INSTANT]: Temporal.Instant;
  [TIME_ZONE]: Temporal.TimeZone;

  // Duration
  [YEARS]: number;
  [MONTHS]: number;
  [WEEKS]: number;
  [DAYS]: number;
  [HOURS]: number;
  [MINUTES]: number;
  [SECONDS]: number;
  [MILLISECONDS]: number;
  [MICROSECONDS]: number;
  [NANOSECONDS]: number;

  // Calendar
  [CALENDAR_ID]: string;
}

const slots = new WeakMap();
export function CreateSlots(container): void {
  slots.set(container, Object.create(null));
}
function GetSlots(container) {
  return slots.get(container);
}
export function HasSlot(container, ...ids) {
  if (!container || 'object' !== typeof container) return false;
  const myslots = GetSlots(container);
  return !!myslots && ids.reduce((all, id) => all && id in myslots, true);
}
export function GetSlot<KeyT extends keyof Slots>(container, id: KeyT): Slots[KeyT] {
  return GetSlots(container)[id];
}
export function SetSlot<KeyT extends keyof Slots>(container: unknown, id: KeyT, value: Slots[KeyT]): void {
  GetSlots(container)[id] = value;
}
