import { Temporal } from '@js-temporal/polyfill';

export function createCurrentZDT() {
  return Temporal.Now.zonedDateTime('iso8601');
}

export function getDurationInHours(zdtLeft, zdtRight) {
  return zdtRight.since(zdtLeft).total({ unit: 'hour' });
}
