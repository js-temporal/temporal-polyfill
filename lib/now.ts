import * as ES from './ecmascript';
import { GetIntrinsic } from './intrinsicclass';
import type { Temporal } from '..';

const instant: typeof Temporal.Now['instant'] = () => {
  const Instant = GetIntrinsic('%Temporal.Instant%');
  return new Instant(ES.SystemUTCEpochNanoSeconds());
};
const plainDateTime: typeof Temporal.Now['plainDateTime'] = (
  calendarLike,
  temporalTimeZoneLike = ES.DefaultTimeZone()
) => {
  const tZ = ES.ToTemporalTimeZoneSlotValue(temporalTimeZoneLike);
  const calendar = ES.ToTemporalCalendarSlotValue(calendarLike);
  const inst = instant();
  return ES.GetPlainDateTimeFor(tZ, inst, calendar);
};
const plainDateTimeISO: typeof Temporal.Now['plainDateTimeISO'] = (temporalTimeZoneLike = ES.DefaultTimeZone()) => {
  const tZ = ES.ToTemporalTimeZoneSlotValue(temporalTimeZoneLike);
  const inst = instant();
  return ES.GetPlainDateTimeFor(tZ, inst, 'iso8601');
};
const zonedDateTime: typeof Temporal.Now['zonedDateTime'] = (
  calendarLike,
  temporalTimeZoneLike = ES.DefaultTimeZone()
) => {
  const tZ = ES.ToTemporalTimeZoneSlotValue(temporalTimeZoneLike);
  const calendar = ES.ToTemporalCalendarSlotValue(calendarLike);
  return ES.CreateTemporalZonedDateTime(ES.SystemUTCEpochNanoSeconds(), tZ, calendar);
};
const zonedDateTimeISO: typeof Temporal.Now['zonedDateTimeISO'] = (temporalTimeZoneLike = ES.DefaultTimeZone()) => {
  return zonedDateTime('iso8601', temporalTimeZoneLike);
};
const plainDate: typeof Temporal.Now['plainDate'] = (calendarLike, temporalTimeZoneLike = ES.DefaultTimeZone()) => {
  return ES.TemporalDateTimeToDate(plainDateTime(calendarLike, temporalTimeZoneLike));
};
const plainDateISO: typeof Temporal.Now['plainDateISO'] = (temporalTimeZoneLike = ES.DefaultTimeZone()) => {
  return ES.TemporalDateTimeToDate(plainDateTimeISO(temporalTimeZoneLike));
};
const plainTimeISO: typeof Temporal.Now['plainTimeISO'] = (temporalTimeZoneLike = ES.DefaultTimeZone()) => {
  return ES.TemporalDateTimeToTime(plainDateTimeISO(temporalTimeZoneLike));
};
const timeZoneId: typeof Temporal.Now['timeZoneId'] = () => {
  return ES.DefaultTimeZone();
};

export const Now: typeof Temporal.Now = {
  instant,
  plainDateTime,
  plainDateTimeISO,
  plainDate,
  plainDateISO,
  plainTimeISO,
  timeZoneId,
  zonedDateTime,
  zonedDateTimeISO,
  [Symbol.toStringTag]: 'Temporal.Now'
};
Object.defineProperty(Now, Symbol.toStringTag, {
  value: 'Temporal.Now',
  writable: false,
  enumerable: false,
  configurable: true
});
