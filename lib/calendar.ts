import { assert } from './assert';
import * as ES from './ecmascript';
import { DefineIntrinsic } from './intrinsicclass';
import type { Temporal } from '..';
import type {
  BuiltinCalendarId,
  CalendarDateRecord,
  CalendarFieldsRecord,
  CalendarYMD,
  DateDuration,
  FieldKey,
  ISODate,
  ISODateToFieldsType,
  MonthDayFromFieldsObject,
  Overflow,
  Resolve
} from './internaltypes';
import { CreateMonthCode, ParseMonthCode } from './monthcode';

const midnightTimeRecord = ES.MidnightTimeRecord();

function arrayFromSet<T>(src: Set<T>): T[] {
  return [...src];
}

function calendarDateWeekOfYear(id: BuiltinCalendarId, isoDate: ISODate): { week: number; year: number } | undefined {
  // Supports only ISO8601 calendar; can be updated to add support for other calendars.
  // Returns undefined for calendars without a well-defined week calendar system.
  // eslint-disable-next-line max-len
  // Also see: https://github.com/unicode-org/icu/blob/ab72ab1d4a3c3f9beeb7d92b0c7817ca93dfdb04/icu4c/source/i18n/calendar.cpp#L1606
  if (id !== 'iso8601') return undefined;
  const calendar = impl[id];
  let yow = isoDate.year;
  const { dayOfWeek, dayOfYear, daysInYear } = calendar.isoToDate(isoDate, {
    dayOfWeek: true,
    dayOfYear: true,
    daysInYear: true
  });
  const fdow = calendar.getFirstDayOfWeek();
  const mdow = calendar.getMinimalDaysInFirstWeek();
  ES.uncheckedAssertNarrowedType<number>(fdow, 'guaranteed to exist for iso8601');
  ES.uncheckedAssertNarrowedType<number>(mdow, 'guaranteed to exist for iso8601');

  // For both the input date and the first day of its calendar year, calculate the day of week
  // relative to first day of week in the relevant calendar (e.g., in iso8601, relative to Monday).
  let relDow = (dayOfWeek + 7 - fdow) % 7;
  // Assuming the year length is less than 7000 days.
  let relDowJan1 = (dayOfWeek - dayOfYear + 7001 - fdow) % 7;

  let woy = Math.floor((dayOfYear - 1 + relDowJan1) / 7);
  if (7 - relDowJan1 >= mdow) {
    ++woy;
  }

  // Adjust for weeks at the year end that overlap into the previous or next calendar year.
  if (woy == 0) {
    // Check for last week of previous year; if true, handle the case for
    // first week of next year
    const prevYearCalendar = calendar.isoToDate(calendar.dateAdd(isoDate, { years: -1 }, 'constrain'), {
      daysInYear: true
    });
    let prevDoy = dayOfYear + prevYearCalendar.daysInYear;
    woy = weekNumber(fdow, mdow, prevDoy, dayOfWeek);
    yow--;
  } else {
    // For it to be week 1 of the next year, dayOfYear must be >= lastDoy - 5
    //          L-5                  L
    // doy: 359 360 361 362 363 364 365 001
    // dow:      1   2   3   4   5   6   7
    let lastDoy = daysInYear;
    if (dayOfYear >= lastDoy - 5) {
      let lastRelDow = (relDow + lastDoy - dayOfYear) % 7;
      if (lastRelDow < 0) {
        lastRelDow += 7;
      }
      if (6 - lastRelDow >= mdow && dayOfYear + 7 - relDow > lastDoy) {
        woy = 1;
        yow++;
      }
    }
  }
  return { week: woy, year: yow };
}

function ISODateSurpasses(
  sign: -1 | 0 | 1,
  baseDate: ISODate,
  isoDate2: ISODate,
  years: number,
  months: number,
  weeks: number,
  days: number
) {
  const yearMonth = ES.BalanceISOYearMonth(baseDate.year + years, baseDate.month + months);
  let y1 = yearMonth.year;
  let m1 = yearMonth.month;
  let d1 = baseDate.day;
  if (weeks !== 0 || days !== 0) {
    const regulatedDate = ES.RegulateISODate(y1, m1, d1, 'constrain');
    ({
      year: y1,
      month: m1,
      day: d1
    } = ES.BalanceISODate(regulatedDate.year, regulatedDate.month, regulatedDate.day + 7 * weeks + days));
  }
  if (y1 !== isoDate2.year) {
    if (sign * (y1 - isoDate2.year) > 0) return true;
  } else if (m1 !== isoDate2.month) {
    if (sign * (m1 - isoDate2.month) > 0) return true;
  } else if (d1 !== isoDate2.day) {
    if (sign * (d1 - isoDate2.day) > 0) return true;
  }
  return false;
}

type ResolveFieldsReturn<Type extends ISODateToFieldsType> = Resolve<
  CalendarFieldsRecord & {
    year: Type extends 'date' ? number : never;
    month: number;
    monthCode: string;
    day: number;
  }
>;

function addDaysISO(isoDate: ISODate, days: number): ISODate {
  return ES.BalanceISODate(isoDate.year, isoDate.month, isoDate.day + days);
}

/**
 * Shape of internal implementation of each built-in calendar. Note that
 * parameter types are simpler than CalendarProtocol because the `Calendar`
 * class performs validation and parameter normalization before handing control
 * over to CalendarImpl.
 *
 * There are two instances of this interface: one for the ISO calendar and
 * another that handles logic that's the same across all non-ISO calendars. The
 * latter is cloned for each non-ISO calendar at the end of this file.
 */
export interface CalendarImpl {
  isoToDate<
    Request extends Partial<Record<keyof CalendarDateRecord, true>>,
    T extends {
      [Field in keyof CalendarDateRecord]: Request extends { [K in Field]: true } ? CalendarDateRecord[Field] : never;
    }
  >(
    isoDate: ISODate,
    requestedFields: Request
  ): T;
  getFirstDayOfWeek(): number | undefined;
  getMinimalDaysInFirstWeek(): number | undefined;
  resolveFields<Type extends ISODateToFieldsType>(
    fields: CalendarFieldsRecord,
    type: Type
  ): asserts fields is ResolveFieldsReturn<Type>;
  dateToISO(fields: ResolveFieldsReturn<'date'>, overflow: Overflow): ISODate;
  monthDayToISOReferenceDate(fields: ResolveFieldsReturn<'month-day'>, overflow: Overflow): ISODate;
  dateAdd(date: ISODate, duration: Partial<DateDuration>, overflow: Overflow): ISODate;
  dateUntil(one: ISODate, two: ISODate, largestUnit: 'year' | 'month' | 'week' | 'day'): DateDuration;
  extraFields(fields: FieldKey[]): FieldKey[];
  fieldKeysToIgnore(keys: FieldKey[]): FieldKey[];
}

type CalendarImplementations = {
  [k in BuiltinCalendarId]: CalendarImpl;
};

/**
 * Implementations for each calendar.
 * Registration for each of these calendars happens throughout this file. The ISO and non-ISO calendars are registered
 * separately - look for 'iso8601' for the ISO calendar registration, and all non-ISO calendar registrations happens
 * at the bottom of the file.
 */
const impl: CalendarImplementations = {} as unknown as CalendarImplementations;

/**
 * Implementation for the ISO 8601 calendar. This is the only calendar that's
 * guaranteed to be supported by all ECMAScript implementations, including those
 * without Intl (ECMA-402) support.
 */
impl['iso8601'] = {
  resolveFields(fields, type) {
    if ((type === 'date' || type === 'year-month') && fields.year === undefined) {
      throw new TypeError('year is required');
    }
    if ((type === 'date' || type === 'month-day') && fields.day === undefined) {
      throw new TypeError('day is required');
    }
    Object.assign(fields, resolveNonLunisolarMonth(fields, 'iso8601'));
  },
  dateToISO(fields, overflow) {
    return ES.RegulateISODate(fields.year, fields.month, fields.day, overflow);
  },
  monthDayToISOReferenceDate(fields, overflow) {
    const referenceISOYear = 1972;
    const { month, day } = ES.RegulateISODate(fields.year ?? referenceISOYear, fields.month, fields.day, overflow);
    return { month, day, year: referenceISOYear };
  },
  extraFields() {
    return [];
  },
  fieldKeysToIgnore(keys) {
    const result = new Set<FieldKey>();
    for (let ix = 0; ix < keys.length; ix++) {
      const key = keys[ix];
      result.add(key);
      if (key === 'month') {
        result.add('monthCode');
      } else if (key === 'monthCode') {
        result.add('month');
      }
    }
    return arrayFromSet(result);
  },
  dateAdd(isoDate, { years = 0, months = 0, weeks = 0, days = 0 }, overflow) {
    let { year, month, day } = isoDate;
    year += years;
    month += months;
    ({ year, month } = ES.BalanceISOYearMonth(year, month));
    ({ year, month, day } = ES.RegulateISODate(year, month, day, overflow));
    day += days + 7 * weeks;
    return ES.BalanceISODate(year, month, day);
  },
  dateUntil(one, two, largestUnit) {
    const sign = -ES.CompareISODate(one, two);
    if (sign === 0) return { years: 0, months: 0, weeks: 0, days: 0 };
    ES.uncheckedAssertNarrowedType<-1 | 1>(sign, "the - operator's return type is number");

    let years = 0;
    let months = 0;
    if (largestUnit === 'year' || largestUnit === 'month') {
      // We can skip right to the neighbourhood of the correct number of years,
      // it'll be at least one less than two.year - one.year (unless it's zero)
      let candidateYears = two.year - one.year;
      if (candidateYears !== 0) candidateYears -= sign;
      // loops at most twice
      while (!ISODateSurpasses(sign, one, two, candidateYears, 0, 0, 0)) {
        years = candidateYears;
        candidateYears += sign;
      }

      let candidateMonths = sign;
      // loops at most 12 times
      while (!ISODateSurpasses(sign, one, two, years, candidateMonths, 0, 0)) {
        months = candidateMonths;
        candidateMonths += sign;
      }

      if (largestUnit === 'month') {
        months += years * 12;
        years = 0;
      }
    }

    const intermediate = ES.BalanceISOYearMonth(one.year + years, one.month + months);
    const constrained = ES.ConstrainISODate(intermediate.year, intermediate.month, one.day);

    let weeks = 0;
    let days =
      ES.ISODateToEpochDays(two.year, two.month - 1, two.day) -
      ES.ISODateToEpochDays(constrained.year, constrained.month - 1, constrained.day);

    if (largestUnit === 'week') {
      weeks = Math.trunc(days / 7);
      days %= 7;
    }

    return { years, months, weeks, days };
  },
  isoToDate<
    Request extends Partial<Record<keyof CalendarDateRecord, true>>,
    T extends {
      [Field in keyof CalendarDateRecord]: Request extends { [K in Field]: true } ? CalendarDateRecord[Field] : never;
    }
  >({ year, month, day }: ISODate, requestedFields: Request): T {
    // requestedFields parameter is not part of the spec text. It's an
    // illustration of one way implementations may choose to optimize this
    // operation.
    const date: Partial<CalendarDateRecord> = {
      era: undefined,
      eraYear: undefined,
      year,
      month,
      day,
      daysInWeek: 7,
      monthsInYear: 12
    };
    if (requestedFields.monthCode) date.monthCode = CreateMonthCode(month, false);
    if (requestedFields.dayOfWeek) {
      // https://en.wikipedia.org/wiki/Determination_of_the_day_of_the_week#Disparate_variation
      const shiftedMonth = month + (month < 3 ? 10 : -2);
      const shiftedYear = year - (month < 3 ? 1 : 0);

      const century = Math.floor(shiftedYear / 100);
      const yearInCentury = shiftedYear - century * 100;

      const monthTerm = Math.floor(2.6 * shiftedMonth - 0.2);
      const yearTerm = yearInCentury + Math.floor(yearInCentury / 4);
      const centuryTerm = Math.floor(century / 4) - 2 * century;

      const dow = (day + monthTerm + yearTerm + centuryTerm) % 7;

      date.dayOfWeek = dow + (dow <= 0 ? 7 : 0);
    }
    if (requestedFields.dayOfYear) {
      let days = day;
      for (let m = month - 1; m > 0; m--) {
        days += ES.ISODaysInMonth(year, m);
      }
      date.dayOfYear = days;
    }
    if (requestedFields.weekOfYear) date.weekOfYear = calendarDateWeekOfYear('iso8601', { year, month, day });
    if (requestedFields.daysInMonth) date.daysInMonth = ES.ISODaysInMonth(year, month);
    if (requestedFields.daysInYear || requestedFields.inLeapYear) {
      date.inLeapYear = ES.LeapYear(year);
      date.daysInYear = date.inLeapYear ? 366 : 365;
    }
    return date as T;
  },
  getFirstDayOfWeek() {
    return 1;
  },
  getMinimalDaysInFirstWeek() {
    return 4;
  }
};

// Some ES implementations don't include ECMA-402. For this reason, it's helpful
// to ensure a clean separation between the ISO calendar implementation which is
// a part of ECMA-262 and the non-ISO calendar implementation which requires
// ECMA-402.
//
// To ensure this separation, the implementation is split. A `CalendarImpl`
// interface defines the common operations between both ISO and non-ISO
// calendars.

/**
 * This type is passed through from CalendarImpl#dateFromFields().
 * `monthExtra` is additional information used internally to identify lunisolar leap months.
 */
type CalendarDateFields = CalendarFieldsRecord & { monthExtra?: string };

/**
 * This is a "fully populated" calendar date record. It's only lacking
 * `era`/`eraYear` (which may not be present in all calendars) and `monthExtra`
 * which is only used in some cases.
 */
type FullCalendarDate = {
  era?: string;
  eraYear?: number;
  year: number;
  month: number;
  monthCode: string;
  day: number;
  monthExtra?: string;
};

// The types below are various subsets of calendar dates
type CalendarYM = { year: number; month: number };
type CalendarYearOnly = { year: number };
type EraAndEraYear = { era: string; eraYear: number };

type CycleInfo = {
  years: number;
  months: number;
};
type MonthCodeInfo = {
  additionalMonths: string[];
  cycleInfo?: CycleInfo;
};

const monthCodeInfo: Partial<Record<BuiltinCalendarId, MonthCodeInfo>> = {
  chinese: {
    additionalMonths: ['M01L', 'M02L', 'M03L', 'M04L', 'M05L', 'M06L', 'M07L', 'M08L', 'M09L', 'M10L', 'M11L', 'M12L']
  },
  coptic: {
    additionalMonths: ['M13'],
    cycleInfo: { years: 1, months: 13 }
  },
  dangi: {
    additionalMonths: ['M01L', 'M02L', 'M03L', 'M04L', 'M05L', 'M06L', 'M07L', 'M08L', 'M09L', 'M10L', 'M11L', 'M12L']
  },
  ethioaa: {
    additionalMonths: ['M13'],
    cycleInfo: { years: 1, months: 13 }
  },
  ethiopic: {
    additionalMonths: ['M13'],
    cycleInfo: { years: 1, months: 13 }
  },
  hebrew: {
    additionalMonths: ['M05L'],
    // Metonic cycle: 7 leap years every 19 years
    cycleInfo: { years: 19, months: 19 * 12 + 7 }
  }
};

function IsValidMonthCodeForCalendar(calendar: BuiltinCalendarId, monthCode: string) {
  const { monthNumber, isLeapMonth } = ParseMonthCode(monthCode);
  if (!isLeapMonth && monthNumber >= 1 && monthNumber <= 12) return true;
  return monthCodeInfo[calendar]?.additionalMonths.includes(monthCode) ?? false;
}

/**
 * Safely merge a month, monthCode pair into an integer month.
 * If both are present, make sure they match.
 * This logic doesn't work for lunisolar calendars!
 * */
function resolveNonLunisolarMonth<T extends { monthCode?: string; month?: number }>(
  calendarDate: T,
  calendar: BuiltinCalendarId,
  overflow: Overflow | undefined = undefined
) {
  let { month, monthCode } = calendarDate;
  if (monthCode === undefined) {
    if (month === undefined) throw new TypeError('Either month or monthCode are required');
    // The ISO calendar uses the default (undefined) value because it does
    // constrain/reject after this method returns. Non-ISO calendars, however,
    // rely on this function to constrain/reject out-of-range `month` values.
    const monthsPerYear = 12 + (monthCodeInfo[calendar]?.additionalMonths.length ?? 0);
    if (overflow === 'reject') ES.RejectToRange(month, 1, monthsPerYear);
    if (overflow === 'constrain') month = ES.ConstrainToRange(month, 1, monthsPerYear);
    monthCode = CreateMonthCode(month, false);
  } else {
    if (!IsValidMonthCodeForCalendar(calendar, monthCode)) {
      throw new RangeError(`Invalid monthCode: ${monthCode} does not exist in calendar ${calendar}`);
    }
    const { monthNumber } = ParseMonthCode(monthCode);
    if (month !== undefined && month !== monthNumber) {
      throw new RangeError(`monthCode ${monthCode} and month ${month} must match if both are present`);
    }
    month = monthNumber;
  }
  return { ...calendarDate, month, monthCode };
}

function weekNumber(firstDayOfWeek: number, minimalDaysInFirstWeek: number, desiredDay: number, dayOfWeek: number) {
  let periodStartDayOfWeek = (dayOfWeek - firstDayOfWeek - desiredDay + 1) % 7;
  if (periodStartDayOfWeek < 0) periodStartDayOfWeek += 7;
  let weekNo = Math.floor((desiredDay + periodStartDayOfWeek - 1) / 7);
  if (7 - periodStartDayOfWeek >= minimalDaysInFirstWeek) {
    ++weekNo;
  }
  return weekNo;
}

const eraInfoEntries: Partial<Record<BuiltinCalendarId, [string, { aliases?: string[] }][]>> = {
  buddhist: Object.entries({
    be: {}
  }),
  coptic: Object.entries({
    am: {}
  }),
  ethioaa: Object.entries({
    aa: { aliases: ['mundi'] }
  }),
  ethiopic: Object.entries({
    am: { aliases: ['incar'] },
    aa: { aliases: ['mundi'] }
  }),
  gregory: Object.entries({
    ce: { aliases: ['ad'] },
    bce: { aliases: ['bc'] }
  }),
  hebrew: Object.entries({
    am: {}
  }),
  indian: Object.entries({
    shaka: {}
  }),
  'islamic-civil': Object.entries({
    ah: {},
    bh: {}
  }),
  'islamic-tbla': Object.entries({
    ah: {},
    bh: {}
  }),
  'islamic-umalqura': Object.entries({
    ah: {},
    bh: {}
  }),
  japanese: Object.entries({
    reiwa: {},
    heisei: {},
    showa: {},
    taisho: {},
    meiji: {},
    ce: { aliases: ['ad'] },
    bce: { aliases: ['bc'] }
  }),
  persian: Object.entries({
    ap: {}
  }),
  roc: Object.entries({
    roc: { aliases: ['minguo'] },
    broc: { aliases: ['before-roc', 'minguo-qian'] }
  })
} as const;

function CalendarSupportsEra(calendar: BuiltinCalendarId) {
  return Object.prototype.hasOwnProperty.call(eraInfoEntries, calendar);
}

function CanonicalizeEraInCalendar(calendar: BuiltinCalendarId, era: string) {
  const entries = eraInfoEntries[calendar];
  ES.assertExists(entries);
  for (let ix = 0; ix < entries.length; ix++) {
    const canonicalName = entries[ix][0];
    if (era === canonicalName) return era;
    const info = entries[ix][1];
    if (info.aliases && info.aliases.includes(era)) return canonicalName;
  }
  return undefined;
}

/**
 * This prototype implementation of non-ISO calendars makes many repeated calls
 * to Intl APIs which may be slow (e.g. >0.2ms). This trivial cache will speed
 * up these repeat accesses. Each cache instance is associated (via a WeakMap)
 * to a specific ISO Date Record object, which speeds up multiple calendar calls
 * on Temporal objects with the same ISO Date Record instance.  No invalidation
 * or pruning is necessary because each object's cache is thrown away when the
 * object is GC-ed.
 */
class OneObjectCache {
  id: BuiltinCalendarId;
  map = new Map();
  calls = 0;
  // now = OneObjectCache.monotonicTimestamp();
  hits = 0;
  misses = 0;

  // static monotonicTimestamp() {
  //   return performance?.now() ?? Date.now();
  // }

  constructor(id: BuiltinCalendarId, cacheToClone?: OneObjectCache) {
    this.id = id;
    if (cacheToClone !== undefined) {
      assert(cacheToClone.id === this.id, 'should not clone cache from a different calendar');
      let i = 0;
      for (const entry of cacheToClone.map.entries()) {
        if (++i > OneObjectCache.MAX_CACHE_ENTRIES) break;
        this.map.set(...entry);
      }
    }
  }
  get(key: number) {
    const result = this.map.get(key);
    if (result) {
      this.hits++;
      this.report();
    }
    this.calls++;
    return result;
  }
  set(key: number, value: unknown) {
    this.map.set(key, value);
    this.misses++;
    this.report();
  }
  report() {
    // if (this.calls === 0) return;
    // const ms = OneObjectCache.monotonicTimestamp() - this.now;
    // const hitRate = ((100 * this.hits) / this.calls).toFixed(0);
    // const t = `${ms.toFixed(2)}ms`;
    // // eslint-disable-next-line no-console
    // console.log(`${this.calls} calls in ${t}. Hits: ${this.hits} (${hitRate}%). Misses: ${this.misses}.`);
  }
  setObject(obj: ISODate) {
    if (OneObjectCache.objectMap.get(obj)) throw new RangeError('object already cached');
    OneObjectCache.objectMap.set(obj, this);
    this.report();
  }
  // Cache keys are int32
  // int32 msb fedcba9876543210fedcba9876543210 lsb
  //           uyyyyyyyyyyyyyyyyyyyymmmmdddddff
  // u = unused (1 bit)
  // y = year + 280804 (20 bits; max is 564387)
  // m = month (4 bits; max is 13)
  // d = day (5 bits; max is 31)
  // f = flags (indicates type of key, and overflow for calendar-to-ISO type)
  //     00 = Chinese/Dangi month list
  //     01 = ISO-to-calendar
  //     10 = calendar-to-ISO, overflow constrain
  //     11 = calendar-to-ISO, overflow reject
  static privKey(year: number, month: number, day: number, flags: number) {
    // -280804 is the earliest year number in any supported calendar (in this
    // case, Hijri calendars)
    const unsignedYear = year + 280804;
    return (unsignedYear << 11) | (month << 7) | (day << 2) | flags;
  }
  static generateCalendarToISOKey({ year, month, day }: CalendarYMD, overflow: Overflow) {
    const flags = overflow === 'constrain' ? 0b10 : 0b11;
    return this.privKey(year, month, day, flags);
  }
  static generateISOToCalendarKey({ year, month, day }: ISODate) {
    return this.privKey(year, month, day, 1);
  }
  static generateMonthListKey(year: number) {
    return this.privKey(year, 0, 0, 0);
  }

  static objectMap = new WeakMap();
  static MAX_CACHE_ENTRIES = 1000;

  /**
   * Returns a WeakMap-backed cache that's used to store expensive results
   * that are associated with a particular Temporal object instance.
   *
   * @param id - calendar ID for the cache
   * @param obj - object to associate with the cache
   */
  static getCacheForObject(id: BuiltinCalendarId, obj: ISODate) {
    let cache = OneObjectCache.objectMap.get(obj);
    if (!cache) {
      cache = new OneObjectCache(id);
      OneObjectCache.objectMap.set(obj, cache);
    }
    return cache;
  }
}

function toUtcIsoDateString(isoYear: number, isoMonth: number, isoDay: number) {
  const yearString = ES.ISOYearString(isoYear);
  const monthString = ES.ISODateTimePartString(isoMonth);
  const dayString = ES.ISODateTimePartString(isoDay);
  return `${yearString}-${monthString}-${dayString}T00:00Z`;
}

function simpleDateDiff(one: CalendarYMD, two: CalendarYMD) {
  return {
    years: one.year - two.year,
    months: one.month - two.month,
    days: one.day - two.day
  };
}

/**
 * Implementation helper that's common to all non-ISO calendars
 */
abstract class HelperBase {
  constructor(eraData: InputEra[] | null) {
    if (eraData !== null) {
      const { eras, anchorEra } = adjustEras(eraData);
      this.eras = eras;
      this.anchorEra = anchorEra;
    }
  }
  abstract id: BuiltinCalendarId;
  abstract monthsInYear(calendarDate: CalendarYearOnly, cache?: OneObjectCache): number;
  abstract maximumMonthLength(calendarDate?: CalendarYM): number;
  abstract minimumMonthLength(calendarDate?: CalendarYM): number;
  abstract maxLengthOfMonthCodeInAnyYear(monthCode: string): number;
  abstract estimateIsoDate(calendarDate: CalendarYMD): ISODate;
  abstract inLeapYear(calendarDate: CalendarYearOnly, cache?: OneObjectCache): boolean;
  abstract calendarType: 'solar' | 'lunar' | 'lunisolar';
  reviseIntlEra?(calendarDate: EraAndEraYear, isoDate: ISODate): EraAndEraYear;
  eras: Era[] = [];
  anchorEra: Era = {
    // dummy era for calendars without eras
    code: '',
    genericName: '',
    anchorEpoch: { year: 0, month: 1, day: 1 },
    isoEpoch: { year: 0, month: 1, day: 1 }
  };
  checkIcuBugs?(isoDate: ISODate): void;
  private formatter?: globalThis.Intl.DateTimeFormat;
  getFormatter() {
    // `new Intl.DateTimeFormat()` is amazingly slow and chews up RAM. Per
    // https://bugs.chromium.org/p/v8/issues/detail?id=6528#c4, we cache one
    // DateTimeFormat instance per calendar. Caching is lazy so we only pay for
    // calendars that are used. Note that the HelperBase class is extended to
    // create each calendar's implementation before any cache is created, so
    // each calendar gets its own separate cached formatter.
    if (typeof this.formatter === 'undefined') {
      this.formatter = new Intl.DateTimeFormat(`en-US-u-ca-${this.id}`, {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric',
        era: 'short',
        timeZone: 'UTC'
      });
    }
    return this.formatter;
  }
  getCalendarParts(isoString: string) {
    let dateTimeFormat = this.getFormatter();
    let legacyDate = new Date(isoString);

    // PlainDate's minimum date -271821-04-19 is one day beyond legacy Date's
    // minimum -271821-04-20, because of accommodating all Instants in all time
    // zones. If we have -271821-04-19, instead format -271821-04-20 in a time
    // zone that pushes the result into the previous day. This is a slow path
    // because we create a new Intl.DateTimeFormat.
    if (isoString === '-271821-04-19T00:00Z') {
      const options = dateTimeFormat.resolvedOptions();
      dateTimeFormat = new Intl.DateTimeFormat(options.locale, {
        ...(options as Intl.DateTimeFormatOptions),
        timeZone: 'Etc/GMT+1'
      });
      legacyDate = new Date('-271821-04-20T00:00Z');
    }

    try {
      return dateTimeFormat.formatToParts(legacyDate);
    } catch (e) {
      if (e instanceof RangeError) throw new RangeError(`Invalid ISO date: ${isoString}`);
      throw e;
    }
  }
  isoToCalendarDate(isoDate: ISODate, cache: OneObjectCache): FullCalendarDate {
    const { year: isoYear, month: isoMonth, day: isoDay } = isoDate;
    const key = OneObjectCache.generateISOToCalendarKey(isoDate);
    const cached = cache.get(key);
    if (cached) return cached;

    const isoString = toUtcIsoDateString(isoYear, isoMonth, isoDay);
    const parts = this.getCalendarParts(isoString);
    const hasEra = CalendarSupportsEra(this.id);
    const result: Partial<FullCalendarDate> = {};
    for (let i = 0; i < parts.length; i++) {
      const { type, value } = parts[i];
      // TODO: remove this type annotation when `relatedYear` gets into TS lib types
      if (type === 'year' || type === ('relatedYear' as Intl.DateTimeFormatPartTypes)) {
        if (hasEra) {
          result.eraYear = +value;
        } else {
          result.year = +value;
        }
      }
      if (type === 'month') {
        // Newer ICU data has some formats with "Mo11" / "Mo9bis" for Chinese
        // and Dangi months
        const matches = /^(?:Mo)?([0-9]*)(.*?)$/.exec(value);
        if (!matches || matches.length != 3 || (!matches[1] && !matches[2])) {
          throw new RangeError(`Unexpected month: ${value}`);
        }
        // If the month has no numeric part (should only see this for the Hebrew
        // calendar with newer FF / Chromium versions; see
        // https://bugzilla.mozilla.org/show_bug.cgi?id=1751833) then set a
        // placeholder month index of `1` and rely on the derived class to
        // calculate the correct month index from the month name stored in
        // `monthExtra`.
        result.month = matches[1] ? +matches[1] : 1;
        if (result.month < 1) {
          throw new RangeError(
            `Invalid month ${value} from ${isoString}[u-ca-${this.id}]` +
              ' (probably due to https://bugs.chromium.org/p/v8/issues/detail?id=10527)'
          );
        }
        if (result.month > 13) {
          throw new RangeError(
            `Invalid month ${value} from ${isoString}[u-ca-${this.id}]` +
              ' (probably due to https://bugs.chromium.org/p/v8/issues/detail?id=10529)'
          );
        }

        // The ICU formats for the Hebrew calendar no longer support a numeric
        // month format. So we'll rely on the derived class to interpret it.
        // `monthExtra` is also used on the Chinese calendar to handle a suffix
        // "bis" indicating a leap month.
        if (matches[2]) result.monthExtra = matches[2];
      }
      if (type === 'day') result.day = +value;
      if (hasEra && type === 'era' && value != null && value !== '') {
        // The convention for Temporal era values is lowercase, so following
        // that convention in this prototype. Punctuation is removed, accented
        // letters are normalized, and spaces are replaced with dashes.
        // E.g.: "ERA0" => "era0", "Before R.O.C." => "before-roc", "En’ō" => "eno"
        // The call to normalize() and the replacement regex deals with era
        // names that contain non-ASCII characters like Japanese eras. Also
        // ignore extra content in parentheses like JPN era date ranges.
        result.era = value
          .split(' (')[0]
          .normalize('NFD')
          .replace(/[^-0-9 \p{L}]/gu, '')
          .replace(/ /g, '-')
          .toLowerCase();
      }
    }
    if (hasEra && !result.era) {
      // Work around ICU bug that neglects to provide an era code for negative
      // eraYear in the coptic calendar
      if (this.id !== 'coptic') {
        // If missing from any other calendar, it's an as-yet-unknown bug
        throw new RangeError(`Intl.DateTimeFormat.formatToParts lacks era in ${this.id} calendar.`);
      }
      // eraYear is also reversed, but using the legacy era code will set it
      // right
      result.era = 'era0';
    }
    if (hasEra && result.eraYear === undefined) {
      // Node 12 has outdated ICU data that lacks the `relatedYear` field in the
      // output of Intl.DateTimeFormat.formatToParts.
      throw new RangeError(
        `Intl.DateTimeFormat.formatToParts lacks relatedYear in ${this.id} calendar. Try Node 14+ or modern browsers.`
      );
    }
    // Translate old ICU era codes "ERA0" etc. into canonical era names.
    if (hasEra) {
      const replacement = this.eras.find((e) => result.era === e.genericName);
      if (replacement) result.era = replacement.code;
    }
    // Translate eras that may be handled differently by Temporal vs. by Intl
    // (e.g. Japanese pre-Meiji eras). See https://github.com/tc39/proposal-temporal/issues/526.
    if (this.reviseIntlEra) {
      const { era, eraYear } = this.reviseIntlEra(result as EraAndEraYear, isoDate);
      result.era = era;
      result.eraYear = eraYear;
    }
    if (this.checkIcuBugs) this.checkIcuBugs(isoDate);

    const calendarDate = this.adjustCalendarDate(result, cache, 'constrain', true);
    if (calendarDate.year === undefined) throw new RangeError(`Missing year converting ${JSON.stringify(isoDate)}`);
    if (calendarDate.month === undefined) {
      throw new RangeError(`Missing month converting ${JSON.stringify(isoDate)}`);
    }
    if (calendarDate.day === undefined) throw new RangeError(`Missing day converting ${JSON.stringify(isoDate)}`);
    cache.set(key, calendarDate);
    // Also cache the reverse mapping
    const cacheReverse = (overflow: Overflow) => {
      const keyReverse = OneObjectCache.generateCalendarToISOKey(calendarDate, overflow);
      cache.set(keyReverse, isoDate);
    };
    (['constrain', 'reject'] as const).forEach(cacheReverse);
    return calendarDate;
  }
  validateCalendarDate(calendarDate: Partial<FullCalendarDate>): asserts calendarDate is FullCalendarDate {
    const { month, year, day, eraYear, monthCode, monthExtra } = calendarDate;
    // When there's a suffix (e.g. "5bis" for a leap month in Chinese calendar)
    // the derived class must deal with it.
    if (monthExtra !== undefined) throw new RangeError('Unexpected `monthExtra` value');
    if (year === undefined && eraYear === undefined) throw new TypeError('year or eraYear is required');
    if (month === undefined && monthCode === undefined) throw new TypeError('month or monthCode is required');
    if (day === undefined) throw new RangeError('Missing day');
    if (monthCode !== undefined) {
      if (typeof monthCode !== 'string') {
        throw new RangeError(`monthCode must be a string, not ${typeof monthCode}`);
      }
      const { monthNumber } = ParseMonthCode(monthCode);
      if (monthNumber < 1 || monthNumber > 13) throw new RangeError(`Invalid monthCode: ${monthCode}`);
    }
    if (CalendarSupportsEra(this.id)) {
      if ((calendarDate['era'] === undefined) !== (calendarDate['eraYear'] === undefined)) {
        throw new TypeError('properties era and eraYear must be provided together');
      }
    }
  }
  /** Private helper function */
  eraFromYear(calendarDate: Partial<FullCalendarDate> & { year: number }) {
    const { year } = calendarDate;
    let eraYear;
    const ix = this.eras.findIndex((eParam, i) => {
      let e = eParam;
      if (i === this.eras.length - 1) {
        if (e.skip) {
          // This last era is only present for legacy ICU data. Treat the
          // previous era as the last era.
          e = this.eras[i - 1];
        }
        if (e.reverseOf) {
          // This is a reverse-sign era (like BCE) which must be the oldest
          // era. Count years backwards.
          if (year > 0) throw new RangeError(`Signed year ${year} is invalid for era ${e.code}`);
          eraYear = e.anchorEpoch.year - year;
          return true;
        }
        // last era always gets all "leftover" (older than epoch) years,
        // so no need for a comparison like below.
        eraYear = year - e.anchorEpoch.year + (e.hasYearZero ? 0 : 1);
        return true;
      }
      // FIXME: This cast may not be correct. I think month and day are always
      // present when we get here, but the type system does not prove it
      const comparison = this.compareCalendarDates(calendarDate as CalendarYMD, e.anchorEpoch);
      if (comparison >= 0) {
        eraYear = year - e.anchorEpoch.year + (e.hasYearZero ? 0 : 1);
        return true;
      }
      return false;
    });
    if (ix === -1) throw new RangeError(`Year ${year} was not matched by any era`);
    let matchingEra = this.eras[ix];
    if (matchingEra.skip) matchingEra = this.eras[ix - 1];
    return { eraYear, era: matchingEra.code };
  }
  /** Fill in missing parts of the (year, era, eraYear) tuple */
  completeEraYear<T extends Partial<FullCalendarDate>>(
    calendarDate: T
  ): T & Required<Pick<FullCalendarDate, 'year' | 'era' | 'eraYear'>> {
    let { year, eraYear, era } = calendarDate;
    if (year !== undefined) {
      const matchData = this.eraFromYear(calendarDate as typeof calendarDate & { year: number });
      ({ eraYear, era } = matchData);
      if (calendarDate.era !== undefined && CanonicalizeEraInCalendar(this.id, calendarDate.era) !== era) {
        throw new RangeError(`Input era ${calendarDate.era} doesn't match calculated value ${era}`);
      }
      if (calendarDate.eraYear !== undefined && calendarDate.eraYear !== eraYear) {
        throw new RangeError(`Input eraYear ${calendarDate.eraYear} doesn't match calculated value ${eraYear}`);
      }
    } else if (eraYear !== undefined) {
      ES.assertExists(era);
      const canonicalName = CanonicalizeEraInCalendar(this.id, era);
      const matchingEra = this.eras.find(({ code }) => code === canonicalName);
      if (!matchingEra) throw new RangeError(`Era ${era} (ISO year ${eraYear}) was not matched by any era`);
      if (matchingEra.reverseOf) {
        year = matchingEra.anchorEpoch.year - eraYear;
      } else {
        year = eraYear + matchingEra.anchorEpoch.year - (matchingEra.hasYearZero ? 0 : 1);
      }
      if (calendarDate.year !== undefined && calendarDate.year !== year) {
        throw new RangeError(`Input year ${calendarDate.year} doesn't match calculated value ${year}`);
      }
      // We'll accept dates where the month/day is earlier than the start of
      // the era or after its end as long as it's in the same year. If that
      // happens, we'll adjust the era/eraYear pair to be the correct era for
      // the `year`.
      const adjustedCalendarDate = { year, month: calendarDate.month, day: calendarDate.day };
      ({ eraYear, era } = this.eraFromYear(adjustedCalendarDate));
    }
    // validateCalendarDate already ensured that either year or era+eraYear are
    // present
    ES.assertExists(year);
    ES.assertExists(eraYear);
    ES.assertExists(era);
    return { ...calendarDate, year, eraYear, era };
  }
  /**
   * Allows derived calendars to add additional fields and/or to make
   * adjustments e.g. to set the era based on the date or to revise the month
   * number in lunisolar calendars per
   * https://github.com/tc39/proposal-temporal/issues/1203.
   *
   * The base implementation fills in missing values by assuming the simplest
   * possible calendar:
   * - non-lunisolar calendar (no leap months)
   * */
  adjustCalendarDate(
    calendarDateParam: Partial<FullCalendarDate>,
    // This param is only used by derived classes
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    cache: OneObjectCache | undefined = undefined,
    overflow: Overflow = 'constrain',
    // This param is only used by derived classes
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    fromLegacyDate = false
  ): FullCalendarDate {
    if (this.calendarType === 'lunisolar') throw new RangeError('Override required for lunisolar calendars');
    let calendarDate = calendarDateParam;
    this.validateCalendarDate(calendarDate);
    let { month, monthCode } = calendarDate;
    ({ month, monthCode } = resolveNonLunisolarMonth(calendarDate, this.id, overflow));
    let fullCalendarDate: FullCalendarDate = { ...calendarDate, month, monthCode };
    if (CalendarSupportsEra(this.id)) fullCalendarDate = this.completeEraYear(fullCalendarDate);
    return fullCalendarDate;
  }
  regulateMonthDayNaive(calendarDate: FullCalendarDate, overflow: Overflow, cache: OneObjectCache) {
    const largestMonth = this.monthsInYear(calendarDate, cache);
    let { month, day } = calendarDate;
    if (overflow === 'reject') {
      ES.RejectToRange(month, 1, largestMonth);
      ES.RejectToRange(day, 1, this.maximumMonthLength(calendarDate));
    } else {
      month = ES.ConstrainToRange(month, 1, largestMonth);
      day = ES.ConstrainToRange(day, 1, this.maximumMonthLength({ ...calendarDate, month }));
    }
    return { ...calendarDate, month, day };
  }
  calendarToIsoDate(dateParam: CalendarDateFields, overflow: Overflow = 'constrain', cache: OneObjectCache): ISODate {
    const originalDate = dateParam as Partial<FullCalendarDate>;
    // First, normalize the calendar date to ensure that (year, month, day)
    // are all present, converting monthCode and eraYear if needed.
    let date = this.adjustCalendarDate(dateParam, cache, overflow, false);

    // Fix obviously out-of-bounds values. Values that are valid generally, but
    // not in this particular year, may not be caught here for some calendars.
    // If so, these will be handled lower below.
    date = this.regulateMonthDayNaive(date, overflow, cache);

    const { year, month, day } = date;
    const key = OneObjectCache.generateCalendarToISOKey(date, overflow);
    let cached = cache.get(key);
    if (cached) return cached;
    // If YMD are present in the input but the input has been constrained
    // already, then cache both the original value and the constrained value.
    let keyOriginal;
    if (
      originalDate.year !== undefined &&
      originalDate.month !== undefined &&
      originalDate.day !== undefined &&
      (originalDate.year !== date.year || originalDate.month !== date.month || originalDate.day !== date.day)
    ) {
      keyOriginal = OneObjectCache.generateCalendarToISOKey(originalDate as CalendarYMD, overflow);
      cached = cache.get(keyOriginal);
      if (cached) return cached;
    }

    // First, try to roughly guess the result
    let isoEstimate = this.estimateIsoDate({ year, month, day });
    const calculateSameMonthResult = (diffDays: number) => {
      // If the estimate is in the same year & month as the target, then we can
      // calculate the result exactly and short-circuit any additional logic.
      // This optimization assumes that months are continuous. It would break if
      // a calendar skipped days, like the Julian->Gregorian switchover. But
      // current ICU calendars only skip days (japanese/roc/buddhist) because of
      // a bug (https://bugs.chromium.org/p/chromium/issues/detail?id=1173158)
      // that's currently worked around by a custom calendarToIsoDate
      // implementation in those calendars. So this optimization should be safe
      // for all ICU calendars.
      let testIsoEstimate = addDaysISO(isoEstimate, diffDays);
      if (date.day > this.minimumMonthLength(date)) {
        // There's a chance that the calendar date is out of range. Throw or
        // constrain if so.
        let testCalendarDate = this.isoToCalendarDate(testIsoEstimate, cache);
        while (testCalendarDate.month !== month || testCalendarDate.year !== year) {
          if (overflow === 'reject') {
            throw new RangeError(`day ${day} does not exist in month ${month} of year ${year}`);
          }
          // Back up a day at a time until we're not hanging over the month end
          testIsoEstimate = addDaysISO(testIsoEstimate, -1);
          testCalendarDate = this.isoToCalendarDate(testIsoEstimate, cache);
        }
      }
      return testIsoEstimate;
    };
    let sign = 0;
    let roundtripEstimate = this.isoToCalendarDate(isoEstimate, cache);
    let diff = simpleDateDiff(date, roundtripEstimate);
    if (diff.years !== 0 || diff.months !== 0 || diff.days !== 0) {
      const diffTotalDaysEstimate = diff.years * 365 + diff.months * 30 + diff.days;
      isoEstimate = addDaysISO(isoEstimate, diffTotalDaysEstimate);
      roundtripEstimate = this.isoToCalendarDate(isoEstimate, cache);
      diff = simpleDateDiff(date, roundtripEstimate);
      if (diff.years === 0 && diff.months === 0) {
        isoEstimate = calculateSameMonthResult(diff.days);
      } else {
        sign = this.compareCalendarDates(date, roundtripEstimate);
      }
    }
    // If the initial guess is not in the same month, then bisect the
    // distance to the target, starting with 8 days per step.
    let increment = 8;
    while (sign) {
      isoEstimate = addDaysISO(isoEstimate, sign * increment);
      const oldRoundtripEstimate = roundtripEstimate;
      roundtripEstimate = this.isoToCalendarDate(isoEstimate, cache);
      const oldSign = sign;
      sign = this.compareCalendarDates(date, roundtripEstimate);
      if (sign) {
        diff = simpleDateDiff(date, roundtripEstimate);
        if (diff.years === 0 && diff.months === 0) {
          isoEstimate = calculateSameMonthResult(diff.days);
          // Signal the loop condition that there's a match.
          sign = 0;
        } else if (oldSign && sign !== oldSign) {
          if (increment > 1) {
            // If the estimate overshot the target, try again with a smaller increment
            // in the reverse direction.
            increment /= 2;
          } else {
            // Increment is 1, and neither the previous estimate nor the new
            // estimate is correct. The only way that can happen is if the
            // original date was an invalid value that will be constrained or
            // rejected here.
            if (overflow === 'reject') {
              throw new RangeError(`Can't find ISO date from calendar date: ${JSON.stringify({ ...originalDate })}`);
            } else {
              // To constrain, pick the earliest value
              const order = this.compareCalendarDates(roundtripEstimate, oldRoundtripEstimate);
              // If current value is larger, then back up to the previous value.
              if (order > 0) isoEstimate = addDaysISO(isoEstimate, -1);
              sign = 0;
            }
          }
        }
      }
    }
    cache.set(key, isoEstimate);
    if (keyOriginal) cache.set(keyOriginal, isoEstimate);
    if (
      date.year === undefined ||
      date.month === undefined ||
      date.day === undefined ||
      date.monthCode === undefined ||
      (CalendarSupportsEra(this.id) && (date.era === undefined || date.eraYear === undefined))
    ) {
      throw new RangeError('Unexpected missing property');
    }
    return isoEstimate;
  }
  compareCalendarDates(date1: CalendarYMD, date2: CalendarYMD) {
    if (date1.year !== date2.year) return ES.ComparisonResult(date1.year - date2.year);
    if (date1.month !== date2.month) return ES.ComparisonResult(date1.month - date2.month);
    if (date1.day !== date2.day) return ES.ComparisonResult(date1.day - date2.day);
    return 0;
  }
  /** Ensure that a calendar date actually exists. If not, return the closest earlier date. */
  regulateDate(calendarDate: CalendarYMD, overflow: Overflow = 'constrain', cache: OneObjectCache): FullCalendarDate {
    const isoDate = this.calendarToIsoDate(calendarDate, overflow, cache);
    return this.isoToCalendarDate(isoDate, cache);
  }
  addDaysCalendar(calendarDate: CalendarYMD, days: number, cache: OneObjectCache): FullCalendarDate {
    const isoDate = this.calendarToIsoDate(calendarDate, 'constrain', cache);
    const addedIso = addDaysISO(isoDate, days);
    const addedCalendar = this.isoToCalendarDate(addedIso, cache);
    return addedCalendar;
  }
  addMonthsCalendar(
    calendarDateParam: CalendarYMD,
    months: number,
    overflow: Overflow,
    cache: OneObjectCache
  ): CalendarYMD {
    let calendarDate = calendarDateParam;
    const { day } = calendarDate;
    for (let i = 0, absMonths = Math.abs(months); i < absMonths; i++) {
      const { month } = calendarDate;
      const oldCalendarDate = calendarDate;
      const days =
        months < 0
          ? -Math.max(day, this.daysInPreviousMonth(calendarDate, cache))
          : this.daysInMonth(calendarDate, cache);
      const isoDate = this.calendarToIsoDate(calendarDate, 'constrain', cache);
      let addedIso = addDaysISO(isoDate, days);
      calendarDate = this.isoToCalendarDate(addedIso, cache);

      // Normally, we can advance one month by adding the number of days in the
      // current month. However, if we're at the end of the current month and
      // the next month has fewer days, then we rolled over to the after-next
      // month. Below we detect this condition and back up until we're back in
      // the desired month.
      if (months > 0) {
        const monthsInOldYear = this.monthsInYear(oldCalendarDate, cache);
        while (calendarDate.month - 1 !== month % monthsInOldYear) {
          addedIso = addDaysISO(addedIso, -1);
          calendarDate = this.isoToCalendarDate(addedIso, cache);
        }
      }

      if (calendarDate.day !== day) {
        // try to retain the original day-of-month, if possible
        calendarDate = this.regulateDate({ ...calendarDate, day }, 'constrain', cache);
      }
    }
    if (overflow === 'reject' && calendarDate.day !== day) {
      throw new RangeError(`Day ${day} does not exist in resulting calendar month`);
    }
    return calendarDate;
  }
  addCalendar(
    calendarDate: CalendarYMD & { monthCode: string },
    { years: yearsParam = 0, months: monthsParam = 0, weeks = 0, days = 0 },
    overflow: Overflow,
    cache: OneObjectCache
  ): FullCalendarDate {
    let years = yearsParam;
    let months = monthsParam;
    const { year, day, monthCode } = calendarDate;
    const monthInfo = monthCodeInfo[this.id];
    const cycleInfo = monthInfo ? monthInfo.cycleInfo : { years: 1, months: 12 };
    if (cycleInfo && Math.abs(months) > cycleInfo.months) {
      const cycleCount = Math.trunc(months / cycleInfo.months);
      years += cycleCount * cycleInfo.years;
      months %= cycleInfo.months;
    }
    const addedYears = this.adjustCalendarDate({ year: year + years, monthCode, day }, cache, overflow);
    const addedMonths = this.addMonthsCalendar(addedYears, months, overflow, cache);
    const initialDays = days + weeks * 7;
    const addedDays = this.addDaysCalendar(addedMonths, initialDays, cache);
    return addedDays;
  }
  untilCalendar(
    calendarOne: FullCalendarDate,
    calendarTwo: FullCalendarDate,
    largestUnit: Temporal.DateUnit,
    cache: OneObjectCache
  ): { years: number; months: number; weeks: number; days: number } {
    let days = 0;
    let weeks = 0;
    let months = 0;
    let years = 0;
    switch (largestUnit) {
      case 'day':
        days = this.calendarDaysUntil(calendarOne, calendarTwo, cache);
        break;
      case 'week': {
        const totalDays = this.calendarDaysUntil(calendarOne, calendarTwo, cache);
        days = totalDays % 7;
        weeks = (totalDays - days) / 7;
        break;
      }
      case 'month':
      case 'year': {
        const sign = this.compareCalendarDates(calendarTwo, calendarOne);
        if (!sign) {
          return { years: 0, months: 0, weeks: 0, days: 0 };
        }
        const diffYears = calendarTwo.year - calendarOne.year;
        const diffDays = calendarTwo.day - calendarOne.day;
        const monthInfo = monthCodeInfo[this.id];
        const cycleInfo = monthInfo ? monthInfo.cycleInfo : { years: 1, months: 12 };
        if (diffYears && (largestUnit === 'year' || cycleInfo)) {
          let diffInYearSign = 0;
          if (calendarTwo.monthCode > calendarOne.monthCode) diffInYearSign = 1;
          if (calendarTwo.monthCode < calendarOne.monthCode) diffInYearSign = -1;
          if (!diffInYearSign) diffInYearSign = Math.sign(diffDays);
          const isOneFurtherInYear = diffInYearSign * sign < 0;
          years = isOneFurtherInYear ? diffYears - sign : diffYears;
        }
        // Try to skip ahead as many months as possible for this calendar
        // without adding month by month in a loop
        if (largestUnit === 'month') {
          if (cycleInfo && Math.abs(years) >= cycleInfo.years) {
            const cycleCount = Math.trunc(years / cycleInfo.years);
            months = cycleCount * cycleInfo.months;
          }
          years = 0;
        }
        const intermediate =
          years || months ? this.addCalendar(calendarOne, { years, months }, 'constrain', cache) : calendarOne;
        // Now we have less than one cycle remaining. Add one month at a time
        // until we go over the target, then back up one month and calculate
        // remaining days.
        let current;
        let next: CalendarYMD = intermediate;
        do {
          months += sign;
          current = next;
          next = this.addMonthsCalendar(current, sign, 'constrain', cache);
          if (next.day !== calendarOne.day) {
            // In case the day was constrained down, un-constrain it (even if
            // that's not a real date)
            next = { ...next, day: calendarOne.day };
          }
        } while (this.compareCalendarDates(calendarTwo, next) * sign >= 0);
        months -= sign; // correct for loop above which overshoots by 1
        const remainingDays = this.calendarDaysUntil(current, calendarTwo, cache);
        days = remainingDays;
        break;
      }
    }
    return { years, months, weeks, days };
  }
  daysInMonth(calendarDate: CalendarYMD, cache: OneObjectCache): number {
    // Add enough days to roll over to the next month. One we're in the next
    // month, we can calculate the length of the current month. NOTE: This
    // algorithm assumes that months are continuous. It would break if a
    // calendar skipped days, like the Julian->Gregorian switchover. But current
    // ICU calendars only skip days (japanese/roc/buddhist) because of a bug
    // (https://bugs.chromium.org/p/chromium/issues/detail?id=1173158) that's
    // currently worked around by a custom calendarToIsoDate implementation in
    // those calendars. So this code should be safe for all ICU calendars.
    const { day } = calendarDate;
    const max = this.maximumMonthLength(calendarDate);
    const min = this.minimumMonthLength(calendarDate);
    // easiest case: we already know the month length if min and max are the same.
    if (min === max) return min;

    // Add enough days to get into the next month, without skipping it
    const increment = day <= max - min ? max : min;
    const isoDate = this.calendarToIsoDate(calendarDate, 'constrain', cache);
    const addedIsoDate = addDaysISO(isoDate, increment);
    const addedCalendarDate = this.isoToCalendarDate(addedIsoDate, cache);

    // Now back up to the last day of the original month
    const endOfMonthIso = addDaysISO(addedIsoDate, -addedCalendarDate.day);
    const endOfMonthCalendar = this.isoToCalendarDate(endOfMonthIso, cache);
    return endOfMonthCalendar.day;
  }
  daysInPreviousMonth(calendarDate: CalendarYMD, cache: OneObjectCache): number {
    const { day, month, year } = calendarDate;

    // Check to see if we already know the month length, and return it if so
    const previousMonthYear = month > 1 ? year : year - 1;
    let previousMonthDate = { year: previousMonthYear, month, day: 1 };
    const previousMonth = month > 1 ? month - 1 : this.monthsInYear(previousMonthDate, cache);
    previousMonthDate = { ...previousMonthDate, month: previousMonth };
    const min = this.minimumMonthLength(previousMonthDate);
    const max = this.maximumMonthLength(previousMonthDate);
    if (min === max) return max;

    const isoDate = this.calendarToIsoDate(calendarDate, 'constrain', cache);
    const lastDayOfPreviousMonthIso = addDaysISO(isoDate, -day);
    const lastDayOfPreviousMonthCalendar = this.isoToCalendarDate(lastDayOfPreviousMonthIso, cache);
    return lastDayOfPreviousMonthCalendar.day;
  }
  startOfCalendarYear(calendarDate: CalendarYearOnly): CalendarYMD & { monthCode: string } {
    return { year: calendarDate.year, month: 1, monthCode: 'M01', day: 1 };
  }
  startOfCalendarMonth(calendarDate: CalendarYM): CalendarYMD {
    return { year: calendarDate.year, month: calendarDate.month, day: 1 };
  }
  calendarDaysUntil(calendarOne: CalendarYMD, calendarTwo: CalendarYMD, cache: OneObjectCache): number {
    const oneIso = this.calendarToIsoDate(calendarOne, 'constrain', cache);
    const twoIso = this.calendarToIsoDate(calendarTwo, 'constrain', cache);
    return (
      ES.ISODateToEpochDays(twoIso.year, twoIso.month - 1, twoIso.day) -
      ES.ISODateToEpochDays(oneIso.year, oneIso.month - 1, oneIso.day)
    );
  }
  // See https://github.com/tc39/proposal-temporal/issues/1784
  erasBeginMidYear = false;
  // Override this to shortcut the search space if certain month codes only
  // occur long in the past
  monthDaySearchStartYear(monthCode: string, day: number) {
    void monthCode, day;
    return 1972;
  }
  monthDayFromFields(fields: MonthDayFromFieldsObject, overflow: Overflow, cache: OneObjectCache): ISODate {
    let { era, eraYear, year, month, monthCode, day } = fields;
    const hasEra = CalendarSupportsEra(this.id);
    if (month !== undefined && year === undefined && (!hasEra || era === undefined || eraYear === undefined)) {
      throw new TypeError('when month is present, year (or era and eraYear) are required');
    }
    if (monthCode === undefined || year !== undefined || (hasEra && eraYear !== undefined)) {
      // Apply overflow behaviour to year/month/day, to get correct monthCode/day
      ({ monthCode, day } = this.isoToCalendarDate(this.calendarToIsoDate(fields, overflow, cache), cache));
    }

    let isoYear, isoMonth, isoDay;
    let closestCalendar, closestIso;
    // Look backwards starting from one of the calendar years spanning ISO year
    // 1972, up to 20 calendar years prior, to find a year that has this month
    // and day. Normal months and days will match immediately, but for leap days
    // and leap months we may have to look for a while. For searches longer than
    // 20 years, override the start date in monthDaySearchStartYear.
    const startDateIso = {
      year: this.monthDaySearchStartYear(monthCode, day),
      month: 12,
      day: 31
    };
    const calendarOfStartDateIso = this.isoToCalendarDate(startDateIso, cache);
    // Note: relies on lexicographical ordering of monthCodes
    const calendarYear =
      calendarOfStartDateIso.monthCode > monthCode ||
      (calendarOfStartDateIso.monthCode === monthCode && calendarOfStartDateIso.day >= day)
        ? calendarOfStartDateIso.year
        : calendarOfStartDateIso.year - 1;
    for (let i = 0; i < 20; i++) {
      const testCalendarDate: FullCalendarDate = this.adjustCalendarDate(
        { day, monthCode, year: calendarYear - i },
        cache
      );
      const isoDate = this.calendarToIsoDate(testCalendarDate, 'constrain', cache);
      const roundTripCalendarDate = this.isoToCalendarDate(isoDate, cache);
      ({ year: isoYear, month: isoMonth, day: isoDay } = isoDate);
      if (roundTripCalendarDate.monthCode === monthCode && roundTripCalendarDate.day === day) {
        return { month: isoMonth, day: isoDay, year: isoYear };
      } else if (overflow === 'constrain') {
        // If the requested day is never present in any instance of this month
        // code, and the round trip date is an instance of this month code with
        // the most possible days, we are as close as we can get.
        const maxDayForMonthCode = this.maxLengthOfMonthCodeInAnyYear(roundTripCalendarDate.monthCode);
        if (
          roundTripCalendarDate.monthCode === monthCode &&
          roundTripCalendarDate.day === maxDayForMonthCode &&
          day > maxDayForMonthCode
        ) {
          return { month: isoMonth, day: isoDay, year: isoYear };
        }
        // non-ISO constrain algorithm tries to find the closest date in a matching month
        if (
          closestCalendar === undefined ||
          (roundTripCalendarDate.monthCode === closestCalendar.monthCode &&
            roundTripCalendarDate.day > closestCalendar.day)
        ) {
          closestCalendar = roundTripCalendarDate;
          closestIso = isoDate;
        }
      }
    }
    if (overflow === 'constrain' && closestIso !== undefined) return closestIso;
    throw new RangeError(`No recent ${this.id} year with monthCode ${monthCode} and day ${day}`);
  }
  getFirstDayOfWeek(): number | undefined {
    return undefined;
  }
  getMinimalDaysInFirstWeek(): number | undefined {
    return undefined;
  }
}

interface HebrewMonthInfo {
  [m: string]:
    | {
        leap: undefined;
        regular: number;
      }
    | {
        leap: number;
        regular: undefined;
      }
    | {
        leap: number;
        regular: number;
      };
}
type HebrewMonthCodeInfo = Record<string, number | [number, number]>;

class HebrewHelper extends HelperBase {
  constructor() {
    super([{ code: 'am', isoEpoch: { year: -3760, month: 9, day: 8 } }]);
  }
  id = 'hebrew' as const;
  calendarType = 'lunisolar' as const;
  inLeapYear(calendarDate: CalendarYearOnly) {
    const { year } = calendarDate;
    // FYI: In addition to adding a month in leap years, the Hebrew calendar
    // also has per-year changes to the number of days of Heshvan and Kislev.
    // Given that these can be calculated by counting the number of days in
    // those months, I assume that these DO NOT need to be exposed as
    // Hebrew-only prototype fields or methods.
    let cycleYear = (7 * year + 1) % 19;
    if (cycleYear < 0) cycleYear += 19;
    return cycleYear < 7;
  }
  monthsInYear(calendarDate: CalendarYearOnly) {
    return this.inLeapYear(calendarDate) ? 13 : 12;
  }
  minimumMonthLength(calendarDate: CalendarYM) {
    return this.minMaxMonthLength(calendarDate, 0);
  }
  maximumMonthLength(calendarDate: CalendarYM) {
    return this.minMaxMonthLength(calendarDate, 1);
  }
  minMaxMonthLength(calendarDate: CalendarYM & { monthCode?: string }, minOrMax: 0 | 1) {
    const { month, year } = calendarDate;
    const monthCode = calendarDate.monthCode ?? this.getMonthCode(year, month);
    const daysInMonth = this.monthLengths[monthCode];
    if (daysInMonth === undefined) throw new RangeError(`unmatched Hebrew month: ${month}`);
    return typeof daysInMonth === 'number' ? daysInMonth : daysInMonth[minOrMax];
  }
  maxLengthOfMonthCodeInAnyYear(monthCode: string) {
    const daysInMonth = this.monthLengths[monthCode];
    return typeof daysInMonth === 'number' ? daysInMonth : daysInMonth[1];
  }
  /** Take a guess at what ISO date a particular calendar date corresponds to */
  estimateIsoDate(calendarDate: CalendarYMD) {
    const { year } = calendarDate;
    return { year: year - 3760, month: 1, day: 1 };
  }
  months: HebrewMonthInfo = {
    Tishri: { leap: 1, regular: 1 },
    Heshvan: { leap: 2, regular: 2 },
    Kislev: { leap: 3, regular: 3 },
    Tevet: { leap: 4, regular: 4 },
    Shevat: { leap: 5, regular: 5 },
    Adar: { leap: undefined, regular: 6 },
    'Adar I': { leap: 6, regular: undefined },
    'Adar II': { leap: 7, regular: undefined },
    Nisan: { leap: 8, regular: 7 },
    Iyar: { leap: 9, regular: 8 },
    Sivan: { leap: 10, regular: 9 },
    Tamuz: { leap: 11, regular: 10 },
    Av: { leap: 12, regular: 11 },
    Elul: { leap: 13, regular: 12 }
  };
  monthLengths: HebrewMonthCodeInfo = {
    M01: 30,
    M02: [29, 30],
    M03: [29, 30],
    M04: 29,
    M05: 30,
    M05L: 30,
    M06: 29,
    M07: 30,
    M08: 29,
    M09: 30,
    M10: 29,
    M11: 30,
    M12: 29
  };
  getMonthCode(year: number, month: number) {
    if (this.inLeapYear({ year })) {
      return month === 6 ? CreateMonthCode(5, true) : CreateMonthCode(month < 6 ? month : month - 1, false);
    } else {
      return CreateMonthCode(month, false);
    }
  }
  override adjustCalendarDate(
    calendarDate: Partial<FullCalendarDate> & { day: number },
    cache?: OneObjectCache,
    overflow: Overflow = 'constrain',
    fromLegacyDate = false
  ): FullCalendarDate {
    let { era, eraYear, year, month, monthCode, day, monthExtra } = this.completeEraYear(calendarDate);
    if (fromLegacyDate) {
      // In Pre Node-14 V8, DateTimeFormat.formatToParts `month: 'numeric'`
      // output returns the numeric equivalent of `month` as a string, meaning
      // that `'6'` in a leap year is Adar I, while `'6'` in a non-leap year
      // means Adar. In this case, `month` will already be correct and no action
      // is needed. However, in Node 14 and later formatToParts returns the name
      // of the Hebrew month (e.g. "Tevet"), so we'll need to look up the
      // correct `month` using the string name as a key.
      if (monthExtra) {
        const monthInfo = this.months[monthExtra];
        if (!monthInfo) throw new RangeError(`Unrecognized month from formatToParts: ${monthExtra}`);
        month = this.inLeapYear({ year }) ? monthInfo.leap : monthInfo.regular;
      }
      // Because we're getting data from legacy Date, then `month` will always be present
      monthCode = this.getMonthCode(year, month as number);
      return { year, month: month as number, day, monthCode, era, eraYear };
    } else {
      // When called without input coming from legacy Date output, simply ensure
      // that all fields are present.
      this.validateCalendarDate(calendarDate);
      if (month === undefined) {
        ES.assertExists(monthCode);
        const { monthNumber, isLeapMonth } = ParseMonthCode(monthCode);
        if (isLeapMonth) {
          if (monthNumber !== 5) {
            throw new RangeError(`Hebrew leap month must have monthCode M05L, not ${monthCode}`);
          }
          month = 6;
          if (!this.inLeapYear({ year })) {
            if (overflow === 'reject') {
              throw new RangeError(`Hebrew monthCode M05L is invalid in year ${year} which is not a leap year`);
            } else {
              // constrain to same day of next month (Adar)
              month = 6;
              monthCode = 'M06';
            }
          }
        } else {
          month = monthNumber;
          // if leap month is before this one, the month index is one more than the month code
          if (this.inLeapYear({ year }) && month >= 6) month++;
          const largestMonth = this.monthsInYear({ year });
          if (month < 1 || month > largestMonth) throw new RangeError(`Invalid monthCode: ${monthCode}`);
        }
      } else {
        if (overflow === 'reject') {
          ES.RejectToRange(month, 1, this.monthsInYear({ year }));
          ES.RejectToRange(day, 1, this.maximumMonthLength({ year, month }));
        } else {
          month = ES.ConstrainToRange(month, 1, this.monthsInYear({ year }));
          day = ES.ConstrainToRange(day, 1, this.maximumMonthLength({ year, month }));
        }
        if (monthCode === undefined) {
          monthCode = this.getMonthCode(year, month);
        } else {
          const calculatedMonthCode = this.getMonthCode(year, month);
          if (calculatedMonthCode !== monthCode) {
            throw new RangeError(`monthCode ${monthCode} doesn't correspond to month ${month} in Hebrew year ${year}`);
          }
        }
      }
      return { ...calendarDate, day, month, monthCode, year, era, eraYear };
    }
  }
}

/**
 * For Temporal purposes, the Islamic calendar is simple because it's always the
 * same 12 months in the same order.
 */
abstract class IslamicBaseHelper extends HelperBase {
  constructor(epochDay: number) {
    const eraData = [
      { code: 'ah', isoEpoch: { year: 622, month: 7, day: epochDay } },
      { code: 'bh', reverseOf: 'ah' }
    ];
    super(eraData);
  }
  abstract override id: BuiltinCalendarId;
  calendarType = 'lunar' as const;
  inLeapYear(calendarDate: CalendarYearOnly, cache: OneObjectCache) {
    const startOfYearCalendar = { year: calendarDate.year, month: 1, monthCode: 'M01', day: 1 };
    const startOfNextYearCalendar = { year: calendarDate.year + 1, month: 1, monthCode: 'M01', day: 1 };
    const result = this.calendarDaysUntil(startOfYearCalendar, startOfNextYearCalendar, cache);
    return result === 355;
  }
  monthsInYear(/* calendarYear, cache */) {
    return 12;
  }
  minimumMonthLength(/* calendarDate */) {
    return 29;
  }
  maximumMonthLength(/* calendarDate */) {
    return 30;
  }
  maxLengthOfMonthCodeInAnyYear(/* monthCode */) {
    return 30;
  }
  DAYS_PER_ISLAMIC_YEAR = 354 + 11 / 30;
  DAYS_PER_ISO_YEAR = 365.2425;
  estimateIsoDate(calendarDate: CalendarYMD) {
    const { year } = this.adjustCalendarDate(calendarDate);
    return { year: Math.floor((year * this.DAYS_PER_ISLAMIC_YEAR) / this.DAYS_PER_ISO_YEAR) + 622, month: 1, day: 1 };
  }
}

// There are 4 Islamic calendars with the same implementation in this polyfill.
// They vary only in their ID and epoch start date. They do emit different
// output from the underlying Intl implementation, but our code for each of them
// is identical.
class IslamicUmalquraHelper extends IslamicBaseHelper {
  id = 'islamic-umalqura' as const;
  constructor() {
    super(20);
  }
}
class IslamicTblaHelper extends IslamicBaseHelper {
  id = 'islamic-tbla' as const;
  constructor() {
    super(19);
  }
}
class IslamicCivilHelper extends IslamicBaseHelper {
  id = 'islamic-civil' as const;
  constructor() {
    super(20);
  }
}
class IslamicCcHelper extends IslamicBaseHelper {
  id = 'islamicc' as const;
  constructor() {
    super(20);
  }
}

class PersianHelper extends HelperBase {
  constructor() {
    super([{ code: 'ap', isoEpoch: { year: 622, month: 3, day: 22 } }]);
  }
  id = 'persian' as const;
  calendarType = 'solar' as const;
  inLeapYear(calendarDate: CalendarYearOnly, cache: OneObjectCache) {
    // If the last month has 30 days, it's a leap year.
    return this.daysInMonth({ year: calendarDate.year, month: 12, day: 1 }, cache) === 30;
  }
  monthsInYear(/* calendarYear, cache */) {
    return 12;
  }
  minimumMonthLength(calendarDate: CalendarYM) {
    const { month } = calendarDate;
    if (month === 12) return 29;
    return month <= 6 ? 31 : 30;
  }
  maximumMonthLength(calendarDate: CalendarYM) {
    const { month } = calendarDate;
    if (month === 12) return 30;
    return month <= 6 ? 31 : 30;
  }
  maxLengthOfMonthCodeInAnyYear(monthCode: string) {
    return ParseMonthCode(monthCode).monthNumber <= 6 ? 31 : 30;
  }
  estimateIsoDate(calendarDate: CalendarYMD) {
    const { year } = this.adjustCalendarDate(calendarDate);
    return { year: year + 621, month: 1, day: 1 };
  }
}

interface IndianMonthInfo {
  [month: number]: {
    length: number;
    month: number;
    day: number;
    leap?: {
      length: number;
      month: number;
      day: number;
    };
    nextYear?: true | undefined;
  };
}

class IndianHelper extends HelperBase {
  constructor() {
    super([{ code: 'shaka', isoEpoch: { year: 79, month: 3, day: 23 } }]);
  }
  id = 'indian' as const;
  calendarType = 'solar' as const;
  inLeapYear(calendarDate: CalendarYearOnly) {
    // From https://en.wikipedia.org/wiki/Indian_national_calendar:
    // Years are counted in the Saka era, which starts its year 0 in the year 78
    // of the Common Era. To determine leap years, add 78 to the Saka year – if
    // the result is a leap year in the Gregorian calendar, then the Saka year
    // is a leap year as well.
    return isGregorianLeapYear(calendarDate.year + 78);
  }
  monthsInYear(/* calendarYear, cache */) {
    return 12;
  }
  minimumMonthLength(calendarDate: CalendarYM) {
    return this.getMonthInfo(calendarDate).length;
  }
  maximumMonthLength(calendarDate: CalendarYM) {
    return this.getMonthInfo(calendarDate).length;
  }
  maxLengthOfMonthCodeInAnyYear(monthCode: string) {
    let monthInfo = this.months[ParseMonthCode(monthCode).monthNumber];
    monthInfo = monthInfo.leap ?? monthInfo;
    return monthInfo.length;
  }
  // Indian months always start at the same well-known Gregorian month and
  // day. So this conversion is easy and fast. See
  // https://en.wikipedia.org/wiki/Indian_national_calendar
  months: IndianMonthInfo = {
    1: { length: 30, month: 3, day: 22, leap: { length: 31, month: 3, day: 21 } },
    2: { length: 31, month: 4, day: 21 },
    3: { length: 31, month: 5, day: 22 },
    4: { length: 31, month: 6, day: 22 },
    5: { length: 31, month: 7, day: 23 },
    6: { length: 31, month: 8, day: 23 },
    7: { length: 30, month: 9, day: 23 },
    8: { length: 30, month: 10, day: 23 },
    9: { length: 30, month: 11, day: 22 },
    10: { length: 30, month: 12, day: 22 },
    11: { length: 30, month: 1, nextYear: true, day: 21 },
    12: { length: 30, month: 2, nextYear: true, day: 20 }
  };
  getMonthInfo(calendarDate: CalendarYM) {
    const { month } = calendarDate;
    let monthInfo = this.months[month];
    if (monthInfo === undefined) throw new RangeError(`Invalid month: ${month}`);
    if (this.inLeapYear(calendarDate) && monthInfo.leap) monthInfo = monthInfo.leap;
    return monthInfo;
  }
  estimateIsoDate(calendarDateParam: CalendarYMD) {
    // FYI, this "estimate" is always the exact ISO date, which makes the Indian
    // calendar fast!
    const calendarDate = this.adjustCalendarDate(calendarDateParam);
    const monthInfo = this.getMonthInfo(calendarDate);
    const isoYear = calendarDate.year + 78 + (monthInfo.nextYear ? 1 : 0);
    const isoMonth = monthInfo.month;
    const isoDay = monthInfo.day;
    const isoDate = ES.BalanceISODate(isoYear, isoMonth, isoDay + calendarDate.day - 1);
    return isoDate;
  }
  // https://bugs.chromium.org/p/v8/issues/detail?id=10529 causes Intl's Indian
  // calendar output to fail for all dates before 0001-01-01 ISO.  For example,
  // in Node 12 0000-01-01 is calculated as 6146/12/-583 instead of 10/11/-79 as
  // expected.
  vulnerableToBceBug = !new Date('0000-01-01T00:00Z')
    .toLocaleDateString('en-US-u-ca-indian', { timeZone: 'UTC' })
    .startsWith('10/11/-79');
  override checkIcuBugs(isoDate: ISODate) {
    if (this.vulnerableToBceBug && isoDate.year < 1) {
      throw new RangeError(
        `calendar '${this.id}' is broken for ISO dates before 0001-01-01` +
          ' (see https://bugs.chromium.org/p/v8/issues/detail?id=10529)'
      );
    }
  }
  override reviseIntlEra(calendarDate: EraAndEraYear /*, isoDate: IsoDate */): EraAndEraYear {
    // Some ICU versions have the legacy era code 'saka', the correct one is
    // 'shaka'; return it unconditionally as there is only one era
    return { era: 'shaka', eraYear: calendarDate.eraYear };
  }
}

/**
 * Era metadata defined for each calendar.
 * TODO: instead of optional properties, this should really have rules
 * encoded in the type, e.g. isoEpoch is required unless reverseOf is present.
 *  */
interface InputEra {
  /**
   * Era code, used to populate the 'era' field of Temporal instances.
   * See https://tc39.es/proposal-intl-era-monthcode/#table-eras
   */
  code: string;

  /**
   * Signed calendar year where this era begins.Will be
   * 1 (or 0 for zero-based eras) for the anchor era assuming that `year`
   * numbering starts at the beginning of the anchor era, which is true
   * for all ICU calendars except Japanese. If an era starts mid-year
   * then a calendar month and day are included. Otherwise
   * `{ month: 1, day: 1 }` is assumed.
   */
  anchorEpoch?: CalendarYearOnly | CalendarYMD;

  /** ISO date of the first day of this era */
  isoEpoch?: { year: number; month: number; day: number };

  /**
   * If present, then this era counts years backwards like BC
   * and this property points to the forward era. This must be
   * the last (oldest) era in the array.
   * */
  reverseOf?: string;

  /**
   * If true, the era's years are 0-based. If omitted or false,
   * then the era's years are 1-based.
   * */
  hasYearZero?: boolean;

  /**
   * Override if this era is the anchor. Not normally used because
   * anchor eras are inferred.
   * */
  isAnchor?: boolean;

  /**
   * Override if this era should never be user-facing (for example, removed.)
   */
  skip?: boolean;
}
/**
 * Transformation of the `InputEra` type with all fields filled in by
 * `adjustEras()`
 * */
interface Era {
  /**
   * Era code, used to populate the 'era' field of Temporal instances.
   * See https://tc39.es/proposal-intl-era-monthcode/#table-eras
   */
  code: string;

  /**
   * alternate name of the era used in old versions of ICU data
   * format is `era{n}` where n is the zero-based index of the era
   * with the oldest era being 0.
   * */
  genericName: string;

  /**
   * Signed calendar year where this era begins. Will be 1 (or 0 for zero-based
   * eras) for the anchor era assuming that `year` numbering starts at the
   * beginning of the anchor era, which is true for all ICU calendars except
   * Japanese. For input, the month and day are optional. If an era starts
   * mid-year then a calendar month and day are included.
   * Otherwise `{ month: 1, day: 1 }` is assumed.
   */
  anchorEpoch: CalendarYMD;

  /** ISO date of the first day of this era */
  isoEpoch: ISODate;

  /**
   * If present, then this era counts years backwards like BC
   * and this property points to the forward era. This must be
   * the last (oldest) era in the array.
   * */
  reverseOf?: Era;

  /**
   * If true, the era's years are 0-based. If omitted or false,
   * then the era's years are 1-based.
   * */
  hasYearZero?: boolean;

  /**
   * Override if this era is the anchor. Not normally used because
   * anchor eras are inferred.
   * */
  isAnchor?: boolean;

  /**
   * Override if this era should never be user-facing (for example, removed.)
   */
  skip?: boolean;
}

/**
 * This function adds additional metadata that makes it easier to work with
 * eras. Note that it mutates and normalizes the original era objects, which is
 * OK because this is non-observable, internal-only metadata.
 *
 * The result is an array of eras with the shape defined above.
 * */
function adjustEras(erasParam: InputEra[]): { eras: Era[]; anchorEra: Era } {
  let eras: (InputEra | Era)[] = erasParam;
  if (eras.length === 0) {
    throw new RangeError('Invalid era data: eras are required');
  }
  if (eras.length === 1 && eras[0].reverseOf) {
    throw new RangeError('Invalid era data: anchor era cannot count years backwards');
  }
  if (eras.length === 1 && !eras[0].code) {
    throw new RangeError('Invalid era data: at least one named era is required');
  }
  if (eras.filter((e) => e.reverseOf != null).length > 1) {
    throw new RangeError('Invalid era data: only one era can count years backwards');
  }

  // Find the "anchor era" which is the era used for (era-less) `year`. Reversed
  // eras can never be anchors. The era without an `anchorEpoch` property is the
  // anchor.
  let anchorEra: Era | InputEra | undefined;
  eras.forEach((e) => {
    if (e.isAnchor || (!e.anchorEpoch && !e.reverseOf)) {
      if (anchorEra) throw new RangeError('Invalid era data: cannot have multiple anchor eras');
      anchorEra = e;
      e.anchorEpoch = { year: e.hasYearZero ? 0 : 1 };
    } else if (!e.code) {
      throw new RangeError('If era name is blank, it must be the anchor era');
    }
  });

  // If the era name is undefined, then it's an anchor that doesn't interact
  // with eras at all. For example, Japanese `year` is always the same as ISO
  // `year`.  So this "era" is the anchor era but isn't used for era matching.
  // Strip it from the list that's returned.
  eras = eras.filter((e) => e.code);

  eras.forEach((e) => {
    // Some eras are mirror images of another era e.g. B.C. is the reverse of A.D.
    // Replace the string-valued "reverseOf" property with the actual era object
    // that's reversed.
    const { reverseOf } = e;
    if (reverseOf) {
      const reversedEra = eras.find((era) => era.code === reverseOf);
      if (reversedEra === undefined) {
        throw new RangeError(`Invalid era data: unmatched reverseOf era: ${reverseOf}`);
      }
      e.reverseOf = reversedEra as Era; // genericName property added later
      e.anchorEpoch = reversedEra.anchorEpoch;
      e.isoEpoch = reversedEra.isoEpoch;
    }
    type YMD = {
      year: number;
      month: number;
      day: number;
    };
    if ((e.anchorEpoch as YMD).month === undefined) (e.anchorEpoch as YMD).month = 1;
    if ((e.anchorEpoch as YMD).day === undefined) (e.anchorEpoch as YMD).day = 1;
  });

  // Ensure that the latest epoch is first in the array. This lets us try to
  // match eras in index order, with the last era getting the remaining older
  // years. Any reverse-signed era must be at the end.
  eras.sort((e1, e2) => {
    if (e1.reverseOf) return 1;
    if (e2.reverseOf) return -1;
    if (!e1.isoEpoch || !e2.isoEpoch) throw new RangeError('Invalid era data: missing ISO epoch');
    return e2.isoEpoch.year - e1.isoEpoch.year;
  });

  // If there's a reversed era, then the one before it must be the era that's
  // being reversed.
  const lastEraReversed = eras[eras.length - 1].reverseOf;
  if (lastEraReversed) {
    if (lastEraReversed !== eras[eras.length - 2]) {
      throw new RangeError('Invalid era data: invalid reverse-sign era');
    }
  }

  // Finally, add a "genericName" property in the format "era{n} where `n` is
  // zero-based index, with the oldest era being zero. This format is used by
  // older versions of ICU data.
  eras.forEach((e, i) => {
    (e as Era).genericName = `era${eras.length - 1 - i}`;
  });

  return { eras: eras as Era[], anchorEra: (anchorEra || eras[0]) as Era };
}

function isGregorianLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

/** Base for Gregorian-like calendars with eras. */
abstract class GregorianBaseHelper extends HelperBase {
  id: BuiltinCalendarId;

  constructor(id: BuiltinCalendarId, originalEras: InputEra[]) {
    super(originalEras);
    this.id = id;
  }
  calendarType = 'solar' as const;
  inLeapYear(calendarDate: CalendarYearOnly) {
    // Calendars that don't override this method use the same months and leap
    // years as Gregorian. Once we know the ISO year corresponding to the
    // calendar year, we'll know if it's a leap year or not.
    const { year } = this.estimateIsoDate({ month: 1, day: 1, year: calendarDate.year });
    return isGregorianLeapYear(year);
  }
  monthsInYear(/* calendarDate */) {
    return 12;
  }
  minimumMonthLength(calendarDate: CalendarYM): number {
    const { month } = calendarDate;
    if (month === 2) return this.inLeapYear(calendarDate) ? 29 : 28;
    return [4, 6, 9, 11].indexOf(month) >= 0 ? 30 : 31;
  }
  maximumMonthLength(calendarDate: CalendarYM): number {
    return this.minimumMonthLength(calendarDate);
  }
  maxLengthOfMonthCodeInAnyYear(monthCode: string) {
    const month = ParseMonthCode(monthCode).monthNumber;
    return [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  }
  estimateIsoDate(calendarDateParam: CalendarYMD) {
    const calendarDate = this.adjustCalendarDate(calendarDateParam);
    const { year, month, day } = calendarDate;
    const { anchorEra } = this;
    const isoYearEstimate = year + anchorEra.isoEpoch.year - (anchorEra.hasYearZero ? 0 : 1);
    return ES.RegulateISODate(isoYearEstimate, month, day, 'constrain');
  }
}

/**
 * Some calendars are identical to Gregorian except era and year. For these
 * calendars, we can avoid using Intl.DateTimeFormat and just calculate the
 * year, era, and eraYear. This is faster (because Intl.DateTimeFormat is slow
 * and uses a huge amount of RAM), and it avoids ICU bugs like
 * https://bugs.chromium.org/p/chromium/issues/detail?id=1173158.
 */
abstract class SameMonthDayAsGregorianBaseHelper extends GregorianBaseHelper {
  constructor(id: BuiltinCalendarId, originalEras: InputEra[]) {
    super(id, originalEras);
  }
  override isoToCalendarDate(isoDate: ISODate): FullCalendarDate {
    // Month and day are same as ISO, so bypass Intl.DateTimeFormat and
    // calculate the year, era, and eraYear here.
    const { year: isoYear, month, day } = isoDate;
    const monthCode = CreateMonthCode(month, false);
    const year = isoYear - this.anchorEra.isoEpoch.year + 1;
    return this.completeEraYear({ year, month, monthCode, day });
  }
}
const OrthodoxOps = {
  inLeapYear(calendarDate: CalendarYearOnly) {
    // Leap years happen one year before the Julian leap year. Note that this
    // calendar is based on the Julian calendar which has a leap year every 4
    // years, unlike the Gregorian calendar which doesn't have leap years on
    // years divisible by 100 except years divisible by 400.
    //
    // Note that we're assuming that leap years in before-epoch times match
    // how leap years are defined now. This is probably not accurate but I'm
    // not sure how better to do it.
    const { year } = calendarDate;
    return (year + 1) % 4 === 0;
  },
  monthsInYear(/* calendarDate */) {
    return 13;
  },
  minimumMonthLength(calendarDate: CalendarYM) {
    const { month } = calendarDate;
    // Ethiopian/Coptic calendars have 12 30-day months and an extra 5-6 day 13th month.
    if (month === 13) return this.inLeapYear(calendarDate) ? 6 : 5;
    return 30;
  },
  maximumMonthLength(calendarDate: CalendarYM) {
    return this.minimumMonthLength(calendarDate);
  },
  maxLengthOfMonthCodeInAnyYear(monthCode: string) {
    return monthCode === 'M13' ? 6 : 30;
  }
};
abstract class OrthodoxBaseHelper extends GregorianBaseHelper {
  constructor(id: BuiltinCalendarId, originalEras: InputEra[]) {
    super(id, originalEras);
  }
  override inLeapYear = OrthodoxOps.inLeapYear;
  override monthsInYear = OrthodoxOps.monthsInYear;
  override minimumMonthLength = OrthodoxOps.minimumMonthLength;
  override maximumMonthLength = OrthodoxOps.maximumMonthLength;
  override maxLengthOfMonthCodeInAnyYear = OrthodoxOps.maxLengthOfMonthCodeInAnyYear;
}

// `coptic` and `ethiopic` calendars are very similar to `ethioaa` calendar,
// with the following differences:
// - Coptic uses BCE-like positive numbers for years before its epoch (the other
//   two use negative year numbers before epoch)
// - Coptic has a different epoch date
// - Ethiopic has an additional second era that starts at the same date as the
//   zero era of ethioaa, which is the anchor era
class EthioaaHelper extends OrthodoxBaseHelper {
  constructor() {
    super('ethioaa', [{ code: 'aa', isoEpoch: { year: -5492, month: 7, day: 17 } }]);
  }
}
const copticLegacyEra0 = 'era0';
class CopticHelper extends OrthodoxBaseHelper {
  constructor() {
    super('coptic', [
      // Empty era to accommodate old versions of ICU data having ERA0 and ERA1.
      // Both map to AM
      { code: 'am', isoEpoch: { year: 284, month: 8, day: 29 } },
      { code: copticLegacyEra0, reverseOf: 'am', skip: true }
    ]);
  }
  override reviseIntlEra(calendarDate: EraAndEraYear /*, isoDate: ISODate */) {
    let { era, eraYear } = calendarDate;
    return { era: 'am', eraYear: era === copticLegacyEra0 ? 1 - eraYear : eraYear };
  }
}

class EthiopicHelper extends OrthodoxBaseHelper {
  constructor() {
    super('ethiopic', [
      { code: 'aa', isoEpoch: { year: -5492, month: 7, day: 17 }, anchorEpoch: { year: -5499 } },
      { code: 'am', isoEpoch: { year: 8, month: 8, day: 27 } }
    ]);
  }
}

class RocHelper extends SameMonthDayAsGregorianBaseHelper {
  constructor() {
    super('roc', [
      { code: 'roc', isoEpoch: { year: 1912, month: 1, day: 1 } },
      { code: 'broc', reverseOf: 'roc' }
    ]);
  }
}

class BuddhistHelper extends SameMonthDayAsGregorianBaseHelper {
  constructor() {
    super('buddhist', [{ code: 'be', isoEpoch: { year: -542, month: 1, day: 1 } }]);
  }
}

class GregoryHelper extends SameMonthDayAsGregorianBaseHelper {
  constructor() {
    super('gregory', [
      { code: 'ce', isoEpoch: { year: 1, month: 1, day: 1 } },
      { code: 'bce', reverseOf: 'ce' }
    ]);
  }
  override reviseIntlEra(calendarDate: EraAndEraYear /*, isoDate: IsoDate */): EraAndEraYear {
    let { era, eraYear } = calendarDate;
    // Firefox 96 introduced a bug where the `'short'` format of the era
    // option mistakenly returns the one-letter (narrow) format instead. The
    // code below handles either the correct or Firefox-buggy format. See
    // https://bugzilla.mozilla.org/show_bug.cgi?id=1752253
    if (era === 'b') era = 'bce';
    if (era === 'a') era = 'ce';
    return { era, eraYear };
  }
}

// NOTE: Only the 5 modern eras (Meiji and later) are included. For dates
// before Meiji 1, the `ce` and `bce` eras are used. Challenges with pre-Meiji
// eras include:
// - Start/end dates of older eras are not precisely defined, which is
//   challenging given Temporal's need for precision
// - Some era dates and/or names are disputed by historians
// - As historical research proceeds, new eras are discovered and existing era
//   dates are modified, leading to considerable churn which is not good for
//   Temporal use.
//  - The earliest era (in 645 CE) may not end up being the earliest depending
//    on future historical scholarship
//  - Before Meiji, Japan used a lunar (or lunisolar?) calendar but AFAIK
//    that's not reflected in the ICU implementation.
//
// For more discussion: https://github.com/tc39/proposal-temporal/issues/526.
//
// Here's a full list of CLDR/ICU eras:
// https://github.com/unicode-org/icu/blob/master/icu4c/source/data/locales/root.txt#L1582-L1818
// https://github.com/unicode-org/cldr/blob/master/common/supplemental/supplementalData.xml#L4310-L4546
//
// NOTE: Japan started using the Gregorian calendar in 6 Meiji, replacing a
// lunisolar calendar. So the day before January 1 of 6 Meiji (1873) was not
// December 31, but December 2, of 5 Meiji (1872). The existing Ecma-402
// Japanese calendar doesn't seem to take this into account, so neither do we:
// > args = ['en-ca-u-ca-japanese', { era: 'short' }]
// > new Date('1873-01-01T12:00').toLocaleString(...args)
// '1 1, 6 Meiji, 12:00:00 PM'
// > new Date('1872-12-31T12:00').toLocaleString(...args)
// '12 31, 5 Meiji, 12:00:00 PM'
class JapaneseHelper extends SameMonthDayAsGregorianBaseHelper {
  constructor() {
    super('japanese', [
      // The Japanese calendar `year` is just the ISO year, because (unlike other
      // ICU calendars) there's no obvious "default era", we use the ISO year.
      { code: 'reiwa', isoEpoch: { year: 2019, month: 5, day: 1 }, anchorEpoch: { year: 2019, month: 5, day: 1 } },
      { code: 'heisei', isoEpoch: { year: 1989, month: 1, day: 8 }, anchorEpoch: { year: 1989, month: 1, day: 8 } },
      { code: 'showa', isoEpoch: { year: 1926, month: 12, day: 25 }, anchorEpoch: { year: 1926, month: 12, day: 25 } },
      { code: 'taisho', isoEpoch: { year: 1912, month: 7, day: 30 }, anchorEpoch: { year: 1912, month: 7, day: 30 } },
      { code: 'meiji', isoEpoch: { year: 1868, month: 9, day: 8 }, anchorEpoch: { year: 1868, month: 9, day: 8 } },
      { code: 'ce', isoEpoch: { year: 1, month: 1, day: 1 } },
      { code: 'bce', reverseOf: 'ce' }
    ]);
  }

  override erasBeginMidYear = true;

  override reviseIntlEra(calendarDate: EraAndEraYear, isoDate: ISODate): EraAndEraYear {
    const { era, eraYear } = calendarDate;
    const { year: isoYear } = isoDate;
    if (this.eras.find((e) => e.code === era)) return { era, eraYear };
    return isoYear < 1 ? { era: 'bce', eraYear: 1 - isoYear } : { era: 'ce', eraYear: isoYear };
  }
}

type ChineseMonthInfo = { monthCode: string; daysInMonth: number }[] & {
  monthsInYear: number;
} & {
  [key: string]: number;
};
type ChineseDraftMonthInfo = { monthCode: string; daysInMonth?: number }[] & {
  monthsInYear?: number;
} & {
  [key: string]: number;
};

abstract class ChineseBaseHelper extends HelperBase {
  constructor() {
    super(null);
  }
  abstract override id: BuiltinCalendarId;
  calendarType = 'lunisolar' as const;
  inLeapYear(calendarDate: CalendarYearOnly, cache: OneObjectCache) {
    return this.getMonthList(calendarDate.year, cache).monthsInYear === 13;
  }
  monthsInYear(calendarDate: CalendarYearOnly, cache: OneObjectCache) {
    return this.getMonthList(calendarDate.year, cache).monthsInYear;
  }
  override daysInMonth(calendarDate: CalendarYM, cache: OneObjectCache) {
    const { month, year } = calendarDate;
    const matchingMonthEntry = this.getMonthList(year, cache)[month];
    if (matchingMonthEntry === undefined) {
      throw new RangeError(`Invalid month ${month} in ${this.id} year ${year}`);
    }
    return matchingMonthEntry.daysInMonth;
  }
  override daysInPreviousMonth(calendarDate: CalendarYM, cache: OneObjectCache) {
    const { month, year } = calendarDate;

    const previousMonthYear = month > 1 ? year : year - 1;
    const previousMonthDate = { year: previousMonthYear, month, day: 1 };
    const previousMonth = month > 1 ? month - 1 : this.monthsInYear(previousMonthDate, cache);

    return this.daysInMonth({ year: previousMonthYear, month: previousMonth }, cache);
  }
  minimumMonthLength(/* calendarDate */) {
    return 29;
  }
  maximumMonthLength(/* calendarDate */) {
    return 30;
  }
  maxLengthOfMonthCodeInAnyYear(monthCode: string) {
    // See note below about ICU4C vs ICU4X. It is possible this override should
    // always return 30.
    return ['M01L', 'M09L', 'M10L', 'M11L', 'M12L'].includes(monthCode) ? 29 : 30;
  }
  override monthDaySearchStartYear(monthCode: string, day: number) {
    // Note that ICU4C actually has _no_ years in which leap months M01L and
    // M09L through M12L have 30 days. The values marked with (*) here are years
    // in which the leap month occurs with 29 days. ICU4C disagrees with ICU4X
    // here and it is not clear which is correct.
    const monthMap: Record<string, [number, number]> = {
      M01L: [1651, 1651], // *
      M02L: [1947, 1765],
      M03L: [1966, 1955],
      M04L: [1963, 1944],
      M05L: [1971, 1952],
      M06L: [1960, 1941],
      M07L: [1968, 1938],
      M08L: [1957, 1718],
      M09L: [1832, 1832], // *
      M10L: [1870, 1870], // *
      M11L: [1814, 1814], // *
      M12L: [1890, 1890] // *
    };
    const years = monthMap[monthCode] ?? [1972, 1972];
    return day < 30 ? years[0] : years[1];
  }
  getMonthList(calendarYear: number, cache: OneObjectCache): ChineseMonthInfo {
    if (calendarYear === undefined) {
      throw new TypeError('Missing year');
    }
    const key = OneObjectCache.generateMonthListKey(calendarYear);
    const cached = cache.get(key);
    if (cached) return cached;

    // Reuse the same local object for calendar-specific results, starting with
    // a date close to Chinese New Year. Feb 17 will either be in the new year
    // or near the end of the previous year's final month.
    let daysPastJan31 = 17;
    const calendarFields: { day: number; monthString: string; relatedYear: number | undefined } = {
      day: 0,
      monthString: '',
      relatedYear: undefined
    };
    const dateTimeFormat = this.getFormatter();
    const updateCalendarFields = () => {
      // Abuse GetUTCEpochMilliseconds for automatic rebalancing.
      const isoNumbers = { year: calendarYear, month: 2, day: daysPastJan31 };
      const ms = ES.GetUTCEpochMilliseconds(isoNumbers, midnightTimeRecord);
      const fieldEntries = dateTimeFormat.formatToParts(ms);
      for (let i = 0; i < fieldEntries.length; i++) {
        const { type, value } = fieldEntries[i];
        // day and year should be decimal strings, but month values like "5bis" are not number-coercible.
        // TODO: remove this type annotation when `relatedYear` gets into TS lib types
        if (type === 'day' || type === ('relatedYear' as Intl.DateTimeFormatPartTypes)) {
          calendarFields[type as 'day' | 'relatedYear'] = +value;
        } else if (type === 'month') {
          if (value.startsWith('Mo')) {
            calendarFields.monthString = value.slice(2);
          } else {
            calendarFields.monthString = value;
          }
        }
      }
      if (calendarFields.relatedYear === undefined) {
        // Node 12 has outdated ICU data that lacks the `relatedYear` field in the
        // output of Intl.DateTimeFormat.formatToParts.
        throw new RangeError(
          `Intl.DateTimeFormat.formatToParts lacks relatedYear in ${this.id} calendar. Try Node 14+ or modern browsers.`
        );
      }
      return calendarFields;
    };

    // Ensure that we're in the first month.
    updateCalendarFields();
    if (calendarFields.monthString !== '1') {
      daysPastJan31 += 29;
      updateCalendarFields();
    }

    // Now back up to near the start of the first month, but not so near that
    // off-by-one issues matter.
    daysPastJan31 -= calendarFields.day - 5;

    const monthList = [] as unknown as ChineseDraftMonthInfo;
    let monthIndex = 1;
    let oldDay: number | undefined;
    for (;;) {
      const { day, monthString, relatedYear } = updateCalendarFields();
      if (monthIndex === 1) assert(monthString === '1', `we didn't back up to the beginning of year ${calendarYear}`);
      const isLeapMonth = monthString.endsWith('bis');
      const monthCode = CreateMonthCode(+(isLeapMonth ? monthString.slice(0, -3) : monthString), isLeapMonth);
      if (oldDay) {
        monthList[monthIndex - 1].daysInMonth = oldDay + 30 - day;
      }
      oldDay = day;

      if (relatedYear !== calendarYear) break;

      monthList[monthIndex] = { monthCode };
      monthList[monthCode] = monthIndex++;

      // Move to the next month. Because months are sometimes 29 days, the day of the
      // calendar month will move forward slowly but not enough to flip over to a new
      // month before the loop ends at 12-13 months.
      daysPastJan31 += 30;
    }
    monthList.monthsInYear = monthIndex - 1; // subtract 1, it was incremented after the loop

    cache.set(key, monthList);
    return monthList as ChineseMonthInfo;
  }
  estimateIsoDate(calendarDate: CalendarYMD) {
    const { year, month } = calendarDate;
    return { year, month: month >= 12 ? 12 : month + 1, day: 1 };
  }
  override adjustCalendarDate(
    calendarDate: Partial<FullCalendarDate>,
    cache: OneObjectCache,
    overflow: Overflow = 'constrain',
    fromLegacyDate = false
  ): FullCalendarDate {
    let { year, month, monthExtra, day, monthCode } = calendarDate;
    if (year === undefined) throw new TypeError('Missing property: year');
    if (fromLegacyDate) {
      // Legacy Date output returns a string that's an integer with an optional
      // "bis" suffix used only by the Chinese/Dangi calendar to indicate a leap
      // month. Below we'll normalize the output.
      if (monthExtra && monthExtra !== 'bis') throw new RangeError(`Unexpected leap month suffix: ${monthExtra}`);
      const monthCode = CreateMonthCode(month as number, monthExtra !== undefined);
      const months = this.getMonthList(year, cache);
      month = months[monthCode];
      if (month === undefined) {
        throw new RangeError(`Unmatched month ${month}${monthExtra || ''} in ${this.id} year ${year}`);
      }
      return { year, month, day: day as number, monthCode };
    } else {
      // When called without input coming from legacy Date output,
      // simply ensure that all fields are present.
      this.validateCalendarDate(calendarDate);
      if (month === undefined) {
        ES.assertExists(monthCode);
        const months = this.getMonthList(year, cache);
        const { monthNumber, isLeapMonth } = ParseMonthCode(monthCode);
        month = months[monthCode];
        // If this leap month isn't present in this year, constrain to the same
        // day of the previous month.
        if (month === undefined && isLeapMonth && overflow === 'constrain') {
          const adjustedMonthCode = CreateMonthCode(monthNumber, false);
          month = months[adjustedMonthCode];
          monthCode = adjustedMonthCode;
        }
        if (month === undefined) {
          throw new RangeError(`Unmatched month ${monthCode} in ${this.id} year ${year}`);
        }
      } else if (monthCode === undefined) {
        const months = this.getMonthList(year, cache);
        const largestMonth = months.monthsInYear;
        if (overflow === 'reject') {
          ES.RejectToRange(month, 1, largestMonth);
          ES.RejectToRange(day as number, 1, this.maximumMonthLength());
        } else {
          month = ES.ConstrainToRange(month, 1, largestMonth);
          day = ES.ConstrainToRange(day, 1, this.maximumMonthLength());
        }
        monthCode = months[month].monthCode;
        if (monthCode === undefined) {
          throw new RangeError(`Invalid month ${month} in ${this.id} year ${year}`);
        }
      } else {
        // Both month and monthCode are present. Make sure they don't conflict.
        const months = this.getMonthList(year, cache);
        const monthIndex = months[monthCode];
        if (!monthIndex) throw new RangeError(`Unmatched monthCode ${monthCode} in ${this.id} year ${year}`);
        if (month !== monthIndex) {
          throw new RangeError(
            `monthCode ${monthCode} doesn't correspond to month ${month} in ${this.id} year ${year}`
          );
        }
      }
      return { ...calendarDate, year, month, monthCode, day: day as number };
    }
  }
}

class ChineseHelper extends ChineseBaseHelper {
  id = 'chinese' as const;
}

// Dangi (Korean) calendar has same implementation as Chinese
class DangiHelper extends ChineseBaseHelper {
  id = 'dangi' as const;
}

/**
 * Common implementation of all non-ISO calendars.
 * Per-calendar id and logic live the `helper` property attached later.
 * This split allowed an easy separation between code that was similar between
 * ISO and non-ISO implementations vs. code that was very different.
 */
class NonIsoCalendar implements CalendarImpl {
  constructor(private readonly helper: HelperBase) {}
  extraFields(fields: FieldKey[]): FieldKey[] {
    if (CalendarSupportsEra(this.helper.id) && fields.includes('year')) {
      return ['era', 'eraYear'];
    }
    return [];
  }
  resolveFields<Type extends ISODateToFieldsType>(
    fields: CalendarFieldsRecord,
    type: Type
  ): asserts fields is ResolveFieldsReturn<Type> {
    if ((type === 'date' || type === 'year-month') && fields.year === undefined) {
      if (!CalendarSupportsEra(this.helper.id)) {
        throw new TypeError('year is required');
      } else if (fields.era === undefined || fields.eraYear === undefined) {
        throw new TypeError('year (or era and eraYear) are required');
      }
    }
    if ((type === 'date' || type === 'month-day') && fields.day === undefined) {
      throw new TypeError('day is required');
    }
    if (this.helper.calendarType !== 'lunisolar') {
      resolveNonLunisolarMonth(fields, this.helper.id);
    }
  }
  dateToISO(fields: CalendarDateFields, overflow: Overflow) {
    const cache = new OneObjectCache(this.helper.id);
    const result = this.helper.calendarToIsoDate(fields, overflow, cache);
    cache.setObject(result);
    return result;
  }
  monthDayToISOReferenceDate(fields: MonthDayFromFieldsObject, overflow: Overflow) {
    const cache = new OneObjectCache(this.helper.id);
    const result = this.helper.monthDayFromFields(fields, overflow, cache);
    // result.year is a reference year where this month/day exists in this calendar
    cache.setObject(result);
    return result;
  }
  fieldKeysToIgnore(
    keys: Exclude<keyof Temporal.PlainDateLike, 'calendar'>[]
  ): Exclude<keyof Temporal.PlainDateLike, 'calendar'>[] {
    const result = new Set<(typeof keys)[number]>();
    for (let ix = 0; ix < keys.length; ix++) {
      const key = keys[ix];
      result.add(key);
      switch (key) {
        case 'era':
          result.add('eraYear');
          result.add('year');
          break;
        case 'eraYear':
          result.add('era');
          result.add('year');
          break;
        case 'year':
          result.add('era');
          result.add('eraYear');
          break;
        case 'month':
          result.add('monthCode');
          // See https://github.com/tc39/proposal-temporal/issues/1784
          if (this.helper.erasBeginMidYear) {
            result.add('era');
            result.add('eraYear');
          }
          break;
        case 'monthCode':
          result.add('month');
          if (this.helper.erasBeginMidYear) {
            result.add('era');
            result.add('eraYear');
          }
          break;
        case 'day':
          if (this.helper.erasBeginMidYear) {
            result.add('era');
            result.add('eraYear');
          }
          break;
      }
    }
    return arrayFromSet(result);
  }
  dateAdd(isoDate: ISODate, { years, months, weeks, days }: DateDuration, overflow: Overflow) {
    const cache = OneObjectCache.getCacheForObject(this.helper.id, isoDate);
    const calendarDate = this.helper.isoToCalendarDate(isoDate, cache);
    const added = this.helper.addCalendar(calendarDate, { years, months, weeks, days }, overflow, cache);
    const isoAdded = this.helper.calendarToIsoDate(added, 'constrain', cache);
    // The new object's cache starts with the cache of the old object
    if (!OneObjectCache.getCacheForObject(this.helper.id, isoAdded)) {
      const newCache = new OneObjectCache(this.helper.id, cache);
      newCache.setObject(isoAdded);
    }
    return isoAdded;
  }
  dateUntil(one: ISODate, two: ISODate, largestUnit: Temporal.DateUnit) {
    const cacheOne = OneObjectCache.getCacheForObject(this.helper.id, one);
    const cacheTwo = OneObjectCache.getCacheForObject(this.helper.id, two);
    const calendarOne = this.helper.isoToCalendarDate(one, cacheOne);
    const calendarTwo = this.helper.isoToCalendarDate(two, cacheTwo);
    const result = this.helper.untilCalendar(calendarOne, calendarTwo, largestUnit, cacheOne);
    return result;
  }
  isoToDate<
    Request extends Partial<Record<keyof CalendarDateRecord, true>>,
    T extends {
      [Field in keyof CalendarDateRecord]: Request extends { [K in Field]: true } ? CalendarDateRecord[Field] : never;
    }
  >(isoDate: ISODate, requestedFields: Request): T {
    const cache = OneObjectCache.getCacheForObject(this.helper.id, isoDate);
    const calendarDate: Partial<CalendarDateRecord> & FullCalendarDate = this.helper.isoToCalendarDate(isoDate, cache);
    if (requestedFields.dayOfWeek) {
      calendarDate.dayOfWeek = impl['iso8601'].isoToDate(isoDate, { dayOfWeek: true }).dayOfWeek;
    }
    if (requestedFields.dayOfYear) {
      const startOfYear = this.helper.startOfCalendarYear(calendarDate);
      const diffDays = this.helper.calendarDaysUntil(startOfYear, calendarDate, cache);
      calendarDate.dayOfYear = diffDays + 1;
    }
    if (requestedFields.weekOfYear) calendarDate.weekOfYear = calendarDateWeekOfYear(this.helper.id, isoDate);
    calendarDate.daysInWeek = 7;
    if (requestedFields.daysInMonth) calendarDate.daysInMonth = this.helper.daysInMonth(calendarDate, cache);
    if (requestedFields.daysInYear) {
      const startOfYearCalendar = this.helper.startOfCalendarYear(calendarDate);
      const startOfNextYearCalendar = this.helper.addCalendar(startOfYearCalendar, { years: 1 }, 'constrain', cache);
      calendarDate.daysInYear = this.helper.calendarDaysUntil(startOfYearCalendar, startOfNextYearCalendar, cache);
    }
    if (requestedFields.monthsInYear) calendarDate.monthsInYear = this.helper.monthsInYear(calendarDate, cache);
    if (requestedFields.inLeapYear) calendarDate.inLeapYear = this.helper.inLeapYear(calendarDate, cache);
    return calendarDate as T;
  }
  getFirstDayOfWeek(): number | undefined {
    return this.helper.getFirstDayOfWeek();
  }
  getMinimalDaysInFirstWeek(): number | undefined {
    return this.helper.getMinimalDaysInFirstWeek();
  }
}

for (const Helper of [
  HebrewHelper,
  PersianHelper,
  EthiopicHelper,
  EthioaaHelper,
  CopticHelper,
  ChineseHelper,
  DangiHelper,
  RocHelper,
  IndianHelper,
  BuddhistHelper,
  GregoryHelper,
  JapaneseHelper,
  IslamicUmalquraHelper,
  IslamicTblaHelper,
  IslamicCivilHelper,
  IslamicCcHelper
]) {
  const helper = new Helper();
  // Construct a new NonIsoCalendar instance with the given Helper implementation that contains
  // per-calendar logic.
  impl[helper.id] = new NonIsoCalendar(helper);
}

function calendarImpl(calendar: BuiltinCalendarId) {
  return impl[calendar];
}
// Probably not what the intrinsics mechanism was intended for, but view this as
// an export of calendarImpl while avoiding circular dependencies
DefineIntrinsic('calendarImpl', calendarImpl);
