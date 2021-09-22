import { DEBUG } from './debug';
import { ES } from './ecmascript';
import { GetIntrinsic, MakeIntrinsicClass, DefineIntrinsic } from './intrinsicclass';
import {
  TIMEZONE_ID,
  EPOCHNANOSECONDS,
  ISO_YEAR,
  ISO_MONTH,
  ISO_DAY,
  ISO_HOUR,
  ISO_MINUTE,
  ISO_SECOND,
  ISO_MILLISECOND,
  ISO_MICROSECOND,
  ISO_NANOSECOND,
  CreateSlots,
  GetSlot,
  SetSlot
} from './slots';
import { Temporal } from '..';

export class TimeZone implements Temporal.TimeZone {
  constructor(timeZoneIdentifier) {
    // Note: if the argument is not passed, GetCanonicalTimeZoneIdentifier(undefined) will throw.
    //       This check exists only to improve the error message.
    if (arguments.length < 1) {
      throw new RangeError('missing argument: identifier is required');
    }

    timeZoneIdentifier = ES.GetCanonicalTimeZoneIdentifier(timeZoneIdentifier);
    CreateSlots(this);
    SetSlot(this, TIMEZONE_ID, timeZoneIdentifier);

    if (DEBUG) {
      Object.defineProperty(this, '_repr_', {
        value: `${this[Symbol.toStringTag]} <${timeZoneIdentifier}>`,
        writable: false,
        enumerable: false,
        configurable: false
      });
    }
  }
  get id() {
    return ES.ToString(this);
  }
  getOffsetNanosecondsFor(instant) {
    if (!ES.IsTemporalTimeZone(this)) throw new TypeError('invalid receiver');
    instant = ES.ToTemporalInstant(instant);
    const id = GetSlot(this, TIMEZONE_ID);

    const offsetNs = ES.ParseOffsetString(id);
    if (offsetNs !== null) return offsetNs;

    return ES.GetIANATimeZoneOffsetNanoseconds(GetSlot(instant, EPOCHNANOSECONDS), id);
  }
  getOffsetStringFor(instant) {
    if (!ES.IsTemporalTimeZone(this)) throw new TypeError('invalid receiver');
    instant = ES.ToTemporalInstant(instant);
    return ES.BuiltinTimeZoneGetOffsetStringFor(this, instant);
  }
  getPlainDateTimeFor(instant, calendar = ES.GetISO8601Calendar()) {
    instant = ES.ToTemporalInstant(instant);
    calendar = ES.ToTemporalCalendar(calendar);
    return ES.BuiltinTimeZoneGetPlainDateTimeFor(this, instant, calendar);
  }
  getInstantFor(dateTime, options = undefined) {
    if (!ES.IsTemporalTimeZone(this)) throw new TypeError('invalid receiver');
    dateTime = ES.ToTemporalDateTime(dateTime);
    options = ES.GetOptionsObject(options);
    const disambiguation = ES.ToTemporalDisambiguation(options);
    return ES.BuiltinTimeZoneGetInstantFor(this, dateTime, disambiguation);
  }
  getPossibleInstantsFor(dateTime) {
    if (!ES.IsTemporalTimeZone(this)) throw new TypeError('invalid receiver');
    dateTime = ES.ToTemporalDateTime(dateTime);
    const Instant = GetIntrinsic('%Temporal.Instant%');
    const id = GetSlot(this, TIMEZONE_ID);

    const offsetNs = ES.ParseOffsetString(id);
    if (offsetNs !== null) {
      const epochNs = ES.GetEpochFromISOParts(
        GetSlot(dateTime, ISO_YEAR),
        GetSlot(dateTime, ISO_MONTH),
        GetSlot(dateTime, ISO_DAY),
        GetSlot(dateTime, ISO_HOUR),
        GetSlot(dateTime, ISO_MINUTE),
        GetSlot(dateTime, ISO_SECOND),
        GetSlot(dateTime, ISO_MILLISECOND),
        GetSlot(dateTime, ISO_MICROSECOND),
        GetSlot(dateTime, ISO_NANOSECOND)
      );
      if (epochNs === null) throw new RangeError('DateTime outside of supported range');
      return [new Instant(epochNs.minus(offsetNs))];
    }

    const possibleEpochNs = ES.GetIANATimeZoneEpochValue(
      id,
      GetSlot(dateTime, ISO_YEAR),
      GetSlot(dateTime, ISO_MONTH),
      GetSlot(dateTime, ISO_DAY),
      GetSlot(dateTime, ISO_HOUR),
      GetSlot(dateTime, ISO_MINUTE),
      GetSlot(dateTime, ISO_SECOND),
      GetSlot(dateTime, ISO_MILLISECOND),
      GetSlot(dateTime, ISO_MICROSECOND),
      GetSlot(dateTime, ISO_NANOSECOND)
    );
    return possibleEpochNs.map((ns) => new Instant(ns));
  }
  getNextTransition(startingPoint) {
    if (!ES.IsTemporalTimeZone(this)) throw new TypeError('invalid receiver');
    startingPoint = ES.ToTemporalInstant(startingPoint);
    const id = GetSlot(this, TIMEZONE_ID);

    // Offset time zones or UTC have no transitions
    if (ES.ParseOffsetString(id) !== null || id === 'UTC') {
      return null;
    }

    let epochNanoseconds = GetSlot(startingPoint, EPOCHNANOSECONDS);
    const Instant = GetIntrinsic('%Temporal.Instant%');
    epochNanoseconds = ES.GetIANATimeZoneNextTransition(epochNanoseconds, id);
    return epochNanoseconds === null ? null : new Instant(epochNanoseconds);
  }
  getPreviousTransition(startingPoint) {
    if (!ES.IsTemporalTimeZone(this)) throw new TypeError('invalid receiver');
    startingPoint = ES.ToTemporalInstant(startingPoint);
    const id = GetSlot(this, TIMEZONE_ID);

    // Offset time zones or UTC have no transitions
    if (ES.ParseOffsetString(id) !== null || id === 'UTC') {
      return null;
    }

    let epochNanoseconds = GetSlot(startingPoint, EPOCHNANOSECONDS);
    const Instant = GetIntrinsic('%Temporal.Instant%');
    epochNanoseconds = ES.GetIANATimeZonePreviousTransition(epochNanoseconds, id);
    return epochNanoseconds === null ? null : new Instant(epochNanoseconds);
  }
  toString() {
    if (!ES.IsTemporalTimeZone(this)) throw new TypeError('invalid receiver');
    return String(GetSlot(this, TIMEZONE_ID));
  }
  toJSON() {
    return ES.ToString(this);
  }
  static from(item) {
    return ES.ToTemporalTimeZone(item);
  }
  [Symbol.toStringTag]!: 'Temporal.TimeZone';
}

MakeIntrinsicClass(TimeZone, 'Temporal.TimeZone');
DefineIntrinsic('Temporal.TimeZone.prototype.getOffsetNanosecondsFor', TimeZone.prototype.getOffsetNanosecondsFor);
