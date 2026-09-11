import { Temporal } from '../index';

declare const now: Temporal.PlainDateTime;
declare const time: Temporal.PlainTime;
declare const date: Temporal.PlainDate;
declare const ym: Temporal.PlainYearMonth;
declare const md: Temporal.PlainMonthDay;
declare const zdt: Temporal.ZonedDateTime;
declare const dur: Temporal.Duration;

const calBag = { year: 2020, calendar: 'iso8601' };
const tzBag = { hour: 5, timeZone: 'UTC' };

// Issue #206: Temporal objects must not be passable to with()
// @ts-expect-error Temporal.PlainTime is not a valid with() argument
now.with(time);
// @ts-expect-error Temporal objects are not valid with() arguments
now.with(now);
// @ts-expect-error Temporal objects are not valid with() arguments
now.with(date);
// @ts-expect-error Temporal objects are not valid with() arguments
now.with(zdt);
// @ts-expect-error Temporal.PlainTime is not a valid with() argument
time.with(time);
// @ts-expect-error Temporal objects are not valid with() arguments
date.with(date);
// @ts-expect-error Temporal objects are not valid with() arguments
ym.with(ym);
// @ts-expect-error Temporal objects are not valid with() arguments
md.with(md);
// @ts-expect-error Temporal objects are not valid with() arguments
zdt.with(zdt);
// @ts-expect-error Temporal.PlainTime is not a valid with() argument
zdt.with(time);

// calendar / timeZone must be set with dedicated methods
// @ts-expect-error with() does not accept a calendar field
now.with({ year: 2020, calendar: 'iso8601' });
// @ts-expect-error with() does not accept a calendar field
now.with(calBag);
// @ts-expect-error with() does not accept a timeZone field
zdt.with({ hour: 5, timeZone: 'UTC' });
// @ts-expect-error with() does not accept a timeZone field
zdt.with(tzBag);

// Valid with() property bags and the methods that replace Temporal-object overloads
now.with({ hour: 9, minute: 10 });
now.with({ year: 2020, month: 1, day: 1 });
now.withPlainTime(time);
now.withCalendar('iso8601');
time.with({ minute: 0 });
date.with({ day: 1 });
ym.with({ month: 6 });
md.with({ day: 14 });
zdt.with({ hour: 9, minute: 10 });
zdt.with({ offset: '+00:00' });
zdt.withPlainTime(time);
zdt.withTimeZone('UTC');
dur.with({ hours: 2 });
dur.with(dur);

// from() still accepts Temporal objects
Temporal.PlainDateTime.from(now);
Temporal.PlainDateTime.from(zdt);
Temporal.PlainDate.from(now);
Temporal.PlainTime.from(time);
