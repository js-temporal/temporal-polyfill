import { ObjectDefineProperty, SymbolToStringTag } from './primordials';

import * as ES from './ecmascript';
import { GetIntrinsic } from './intrinsicclass';
import { GetSlot, ISO_DATE_TIME } from './slots';
import type { Temporal } from '..';

const instant: (typeof Temporal.Now)['instant'] = () => {
  const Instant = GetIntrinsic('%Temporal.Instant%');
  return new Instant(ES.SystemUTCEpochNanoSeconds());
};
const plainDateTimeISO: (typeof Temporal.Now)['plainDateTimeISO'] = (temporalTimeZoneLike = ES.DefaultTimeZone()) => {
  const timeZone = ES.ToTemporalTimeZoneIdentifier(temporalTimeZoneLike);
  const isoDateTime = ES.GetISODateTimeFor(timeZone, ES.SystemUTCEpochNanoSeconds());
  return ES.CreateTemporalDateTime(isoDateTime, 'iso8601');
};
const zonedDateTimeISO: (typeof Temporal.Now)['zonedDateTimeISO'] = (temporalTimeZoneLike = ES.DefaultTimeZone()) => {
  const timeZone = ES.ToTemporalTimeZoneIdentifier(temporalTimeZoneLike);
  return ES.CreateTemporalZonedDateTime(ES.SystemUTCEpochNanoSeconds(), timeZone, 'iso8601');
};
const plainDateISO: (typeof Temporal.Now)['plainDateISO'] = (temporalTimeZoneLike = ES.DefaultTimeZone()) => {
  return ES.CreateTemporalDate(GetSlot(plainDateTimeISO(temporalTimeZoneLike), ISO_DATE_TIME).isoDate, 'iso8601');
};
const plainTimeISO: (typeof Temporal.Now)['plainTimeISO'] = (temporalTimeZoneLike = ES.DefaultTimeZone()) => {
  return ES.CreateTemporalTime(GetSlot(plainDateTimeISO(temporalTimeZoneLike), ISO_DATE_TIME).time);
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
ObjectDefineProperty(Now, SymbolToStringTag, {
  value: 'Temporal.Now',
  writable: false,
  enumerable: false,
  configurable: true
});
