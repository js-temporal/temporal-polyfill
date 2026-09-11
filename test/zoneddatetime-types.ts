import { Temporal } from '..';

// Missing timeZone: runtime throws TypeError (issue #352).
// @ts-expect-error
Temporal.ZonedDateTime.from({ year: 2026, month: 1, day: 1 });

// @ts-expect-error
Temporal.ZonedDateTime.compare({ year: 2026, month: 1, day: 1 }, { year: 2026, month: 1, day: 2, timeZone: 'UTC' });

const zdt = Temporal.ZonedDateTime.from({ year: 2026, month: 1, day: 1, timeZone: 'UTC' });

// @ts-expect-error
zdt.equals({ year: 2026, month: 1, day: 1 });

// @ts-expect-error
zdt.until({ year: 2026, month: 1, day: 1 });

// @ts-expect-error
zdt.since({ year: 2026, month: 1, day: 1 });

// with() uses the receiver's time zone and must not require timeZone.
zdt.with({ hour: 12 });

// Strings, instances, and TimeZoneLike values remain accepted.
Temporal.ZonedDateTime.from('2026-01-01T00:00:00+00:00[UTC]');
Temporal.ZonedDateTime.from(zdt);
Temporal.ZonedDateTime.from({ year: 2026, month: 1, day: 1, timeZone: zdt });

// relativeTo still accepts a plain-date bag (timeZone is not required there).
declare const duration: Temporal.Duration;
duration.round({ smallestUnit: 'hour', relativeTo: { year: 2020, month: 1, day: 1 } });
