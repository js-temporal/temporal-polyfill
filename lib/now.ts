import { ES } from './ecmascript';
import { GetIntrinsic } from './intrinsicclass';
import { Temporal } from '..';

const instant = () => {
  const Instant = GetIntrinsic('%Temporal.Instant%');
  return new Instant(ES.SystemUTCEpochNanoSeconds());
};
const plainDateTime = (calendarLike, temporalTimeZoneLike = timeZone()) => {
  const tZ = ES.ToTemporalTimeZone(temporalTimeZoneLike);
  const calendar = ES.ToTemporalCalendar(calendarLike);
  const inst = instant();
  return ES.BuiltinTimeZoneGetPlainDateTimeFor(tZ, inst, calendar);
};
const plainDateTimeISO = (temporalTimeZoneLike = timeZone()) => {
  const tZ = ES.ToTemporalTimeZone(temporalTimeZoneLike);
  const calendar = ES.GetISO8601Calendar();
  const inst = instant();
  return ES.BuiltinTimeZoneGetPlainDateTimeFor(tZ, inst, calendar);
};
const zonedDateTime = (calendarLike, temporalTimeZoneLike = timeZone()) => {
  const tZ = ES.ToTemporalTimeZone(temporalTimeZoneLike);
  const calendar = ES.ToTemporalCalendar(calendarLike);
  return ES.CreateTemporalZonedDateTime(ES.SystemUTCEpochNanoSeconds(), tZ, calendar);
};
const zonedDateTimeISO = (temporalTimeZoneLike = timeZone()) => {
  return zonedDateTime(ES.GetISO8601Calendar(), temporalTimeZoneLike);
};
const plainDate = (calendarLike, temporalTimeZoneLike = timeZone()) => {
  return ES.TemporalDateTimeToDate(plainDateTime(calendarLike, temporalTimeZoneLike));
};
const plainDateISO = (temporalTimeZoneLike = timeZone()) => {
  return ES.TemporalDateTimeToDate(plainDateTimeISO(temporalTimeZoneLike));
};
const plainTimeISO = (temporalTimeZoneLike = timeZone()) => {
  return ES.TemporalDateTimeToTime(plainDateTimeISO(temporalTimeZoneLike));
};
const timeZone = () => {
  return ES.SystemTimeZone();
};

export const Now: typeof Temporal.Now = {
  instant,
  plainDateTime,
  plainDateTimeISO,
  plainDate,
  plainDateISO,
  plainTimeISO,
  timeZone,
  zonedDateTime,
  zonedDateTimeISO
};
Object.defineProperty(Now, Symbol.toStringTag, {
  value: 'Temporal.Now',
  writable: false,
  enumerable: false,
  configurable: true
});
