// This entry point treats Temporal as a library, and does not polyfill it onto
// the global object.
// This is in order to avoid breaking the web in the future, if the polyfill
// gains wide adoption before the API is finalized. We do not want checks such
// as `if (typeof Temporal === 'undefined')` in the wild, until browsers start
// shipping the finalized API.

import * as Temporal from './temporal';
import * as Intl from './intl';
import { toTemporalInstant } from './legacydate';

// Work around https://github.com/babel/babel/issues/2025.
const types = [
  Temporal.Instant,
  Temporal.Calendar,
  Temporal.PlainDate,
  Temporal.PlainDateTime,
  Temporal.Duration,
  Temporal.PlainMonthDay,
  // Temporal.Now, // plain object (not a constructor), so no `prototype`
  Temporal.PlainTime,
  Temporal.TimeZone,
  Temporal.PlainYearMonth,
  Temporal.ZonedDateTime
];
for (const type of types) {
  const descriptor = Object.getOwnPropertyDescriptor(type, 'prototype') as PropertyDescriptor;
  if (descriptor.configurable || descriptor.enumerable || descriptor.writable) {
    descriptor.configurable = false;
    descriptor.enumerable = false;
    descriptor.writable = false;
    Object.defineProperty(type, 'prototype', descriptor);
  }
}

export { Temporal, Intl, toTemporalInstant };
