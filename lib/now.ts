import * as ES from './ecmascript';
import type { Temporal } from '..';

function SystemDateTime(timeZone: string) {
  return ES.GetISODateTimeFor(timeZone, ES.SystemUTCEpochNanoSeconds());
}

const instant: (typeof Temporal.Now)['instant'] = () => {
  return ES.CreateTemporalInstant(ES.SystemUTCEpochNanoSeconds());
};
const plainDateTimeISO: (typeof Temporal.Now)['plainDateTimeISO'] = (temporalTimeZoneLike = ES.DefaultTimeZone()) => {
  const timeZone = ES.ToTemporalTimeZoneIdentifier(temporalTimeZoneLike);
  const isoDateTime = SystemDateTime(timeZone);
  return ES.CreateTemporalDateTime(isoDateTime, 'iso8601');
};
const zonedDateTimeISO: (typeof Temporal.Now)['zonedDateTimeISO'] = (temporalTimeZoneLike = ES.DefaultTimeZone()) => {
  const timeZone = ES.ToTemporalTimeZoneIdentifier(temporalTimeZoneLike);
  return ES.CreateTemporalZonedDateTime(ES.SystemUTCEpochNanoSeconds(), timeZone, 'iso8601');
};
const plainDateISO: (typeof Temporal.Now)['plainDateISO'] = (temporalTimeZoneLike = ES.DefaultTimeZone()) => {
  const timeZone = ES.ToTemporalTimeZoneIdentifier(temporalTimeZoneLike);
  const isoDateTime = SystemDateTime(timeZone);
  return ES.CreateTemporalDate(isoDateTime.isoDate, 'iso8601');
};
const plainTimeISO: (typeof Temporal.Now)['plainTimeISO'] = (temporalTimeZoneLike = ES.DefaultTimeZone()) => {
  const timeZone = ES.ToTemporalTimeZoneIdentifier(temporalTimeZoneLike);
  const isoDateTime = SystemDateTime(timeZone);
  return ES.CreateTemporalTime(isoDateTime.time);
};
const timeZoneId: (typeof Temporal.Now)['timeZoneId'] = () => {
  return ES.DefaultTimeZone();
};

export const Now: typeof Temporal.Now = {
  instant,
  plainDateTimeISO,
  plainDateISO,
  plainTimeISO,
  timeZoneId,
  zonedDateTimeISO,
  [Symbol.toStringTag]: 'Temporal.Now'
};
Object.defineProperty(Now, Symbol.toStringTag, {
  value: 'Temporal.Now',
  writable: false,
  enumerable: false,
  configurable: true
});
