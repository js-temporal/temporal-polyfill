import * as ES from './ecmascript';
import { GetIntrinsic } from './intrinsicclass';
import { TimeZoneMethodRecord } from './methodrecord';
import type { Temporal } from '..';

const instant: (typeof Temporal.Now)['instant'] = () => {
  const Instant = GetIntrinsic('%Temporal.Instant%');
  return new Instant(ES.SystemUTCEpochNanoSeconds());
};
const plainDateTimeISO: (typeof Temporal.Now)['plainDateTimeISO'] = (temporalTimeZoneLike = ES.DefaultTimeZone()) => {
  const timeZone = ES.ToTemporalTimeZoneSlotValue(temporalTimeZoneLike);
  const inst = instant();
  const timeZoneRec = new TimeZoneMethodRecord(timeZone, ['getOffsetNanosecondsFor']);
  return ES.GetPlainDateTimeFor(timeZoneRec, inst, 'iso8601');
};
const zonedDateTimeISO: (typeof Temporal.Now)['zonedDateTimeISO'] = (temporalTimeZoneLike = ES.DefaultTimeZone()) => {
  const timeZone = ES.ToTemporalTimeZoneSlotValue(temporalTimeZoneLike);
  return ES.CreateTemporalZonedDateTime(ES.SystemUTCEpochNanoSeconds(), timeZone, 'iso8601');
};
const plainDateISO: (typeof Temporal.Now)['plainDateISO'] = (temporalTimeZoneLike = ES.DefaultTimeZone()) => {
  return ES.TemporalDateTimeToDate(plainDateTimeISO(temporalTimeZoneLike));
};
const plainTimeISO: (typeof Temporal.Now)['plainTimeISO'] = (temporalTimeZoneLike = ES.DefaultTimeZone()) => {
  return ES.TemporalDateTimeToTime(plainDateTimeISO(temporalTimeZoneLike));
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
