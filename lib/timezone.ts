import { DEBUG } from './debug';
import * as ES from './ecmascript';
import { DefineIntrinsic, GetIntrinsic, MakeIntrinsicClass } from './intrinsicclass';
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
import JSBI from 'jsbi';
import type { Temporal } from '..';
import type { TimeZoneParams as Params, TimeZoneReturn as Return } from './internaltypes';

export class TimeZone implements Temporal.TimeZone {
  constructor(identifier: string) {
    // Note: if the argument is not passed, GetCanonicalTimeZoneIdentifier(undefined) will throw.
    //       This check exists only to improve the error message.
    if (arguments.length < 1) {
      throw new RangeError('missing argument: identifier is required');
    }
    let stringIdentifier = ES.ToString(identifier);
    const parseResult = ES.ParseTimeZoneIdentifier(identifier);
    if (parseResult.offsetNanoseconds !== undefined) {
      stringIdentifier = ES.FormatOffsetTimeZoneIdentifier(parseResult.offsetNanoseconds);
    } else {
      const record = ES.GetAvailableNamedTimeZoneIdentifier(stringIdentifier);
      if (!record) throw new RangeError(`Invalid time zone identifier: ${stringIdentifier}`);
      stringIdentifier = record.primaryIdentifier;
    }
    CreateSlots(this);
    SetSlot(this, TIMEZONE_ID, stringIdentifier);

    if (DEBUG) {
      Object.defineProperty(this, '_repr_', {
        value: `${this[Symbol.toStringTag]} <${stringIdentifier}>`,
        writable: false,
        enumerable: false,
        configurable: false
      });
    }
  }
  get id(): Return['id'] {
    if (!ES.IsTemporalTimeZone(this)) throw new TypeError('invalid receiver');
    return GetSlot(this, TIMEZONE_ID);
  }
  getOffsetNanosecondsFor(instantParam: Params['getOffsetNanosecondsFor'][0]): Return['getOffsetNanosecondsFor'] {
    if (!ES.IsTemporalTimeZone(this)) throw new TypeError('invalid receiver');
    const instant = ES.ToTemporalInstant(instantParam);
    const id = GetSlot(this, TIMEZONE_ID);

    const offsetNanoseconds = ES.ParseTimeZoneIdentifier(id).offsetNanoseconds;
    if (offsetNanoseconds !== undefined) return offsetNanoseconds;

    return ES.GetNamedTimeZoneOffsetNanoseconds(id, GetSlot(instant, EPOCHNANOSECONDS));
  }
  getOffsetStringFor(instantParam: Params['getOffsetStringFor'][0]): Return['getOffsetStringFor'] {
    if (!ES.IsTemporalTimeZone(this)) throw new TypeError('invalid receiver');
    const instant = ES.ToTemporalInstant(instantParam);
    return ES.GetOffsetStringFor(this, instant);
  }
  getPlainDateTimeFor(
    instantParam: Params['getPlainDateTimeFor'][0],
    calendarParam: Params['getPlainDateTimeFor'][1] = 'iso8601'
  ): Return['getPlainDateTimeFor'] {
    if (!ES.IsTemporalTimeZone(this)) throw new TypeError('invalid receiver');
    const instant = ES.ToTemporalInstant(instantParam);
    const calendar = ES.ToTemporalCalendarSlotValue(calendarParam);
    return ES.GetPlainDateTimeFor(this, instant, calendar);
  }
  getInstantFor(
    dateTimeParam: Params['getInstantFor'][0],
    optionsParam: Params['getInstantFor'][1] = undefined
  ): Return['getInstantFor'] {
    if (!ES.IsTemporalTimeZone(this)) throw new TypeError('invalid receiver');
    const dateTime = ES.ToTemporalDateTime(dateTimeParam);
    const options = ES.GetOptionsObject(optionsParam);
    const disambiguation = ES.ToTemporalDisambiguation(options);
    return ES.GetInstantFor(this, dateTime, disambiguation);
  }
  getPossibleInstantsFor(dateTimeParam: Params['getPossibleInstantsFor'][0]): Return['getPossibleInstantsFor'] {
    if (!ES.IsTemporalTimeZone(this)) throw new TypeError('invalid receiver');
    const dateTime = ES.ToTemporalDateTime(dateTimeParam);
    const Instant = GetIntrinsic('%Temporal.Instant%');
    const id = GetSlot(this, TIMEZONE_ID);

    const offsetNanoseconds = ES.ParseTimeZoneIdentifier(id).offsetNanoseconds;
    if (offsetNanoseconds !== undefined) {
      const epochNs = ES.GetUTCEpochNanoseconds(
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
      return [new Instant(JSBI.subtract(epochNs, JSBI.BigInt(offsetNanoseconds)))];
    }

    const possibleEpochNs = ES.GetNamedTimeZoneEpochNanoseconds(
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
  getNextTransition(startingPointParam: Params['getNextTransition'][0]): Return['getNextTransition'] {
    if (!ES.IsTemporalTimeZone(this)) throw new TypeError('invalid receiver');
    const startingPoint = ES.ToTemporalInstant(startingPointParam);
    const id = GetSlot(this, TIMEZONE_ID);

    // Offset time zones or UTC have no transitions
    if (ES.IsOffsetTimeZoneIdentifier(id) || id === 'UTC') {
      return null;
    }

    let epochNanoseconds: JSBI | null = GetSlot(startingPoint, EPOCHNANOSECONDS);
    const Instant = GetIntrinsic('%Temporal.Instant%');
    epochNanoseconds = ES.GetNamedTimeZoneNextTransition(id, epochNanoseconds);
    return epochNanoseconds === null ? null : new Instant(epochNanoseconds);
  }
  getPreviousTransition(startingPointParam: Params['getPreviousTransition'][0]): Return['getPreviousTransition'] {
    if (!ES.IsTemporalTimeZone(this)) throw new TypeError('invalid receiver');
    const startingPoint = ES.ToTemporalInstant(startingPointParam);
    const id = GetSlot(this, TIMEZONE_ID);

    // Offset time zones or UTC have no transitions
    if (ES.IsOffsetTimeZoneIdentifier(id) || id === 'UTC') {
      return null;
    }

    let epochNanoseconds: JSBI | null = GetSlot(startingPoint, EPOCHNANOSECONDS);
    const Instant = GetIntrinsic('%Temporal.Instant%');
    epochNanoseconds = ES.GetNamedTimeZonePreviousTransition(id, epochNanoseconds);
    return epochNanoseconds === null ? null : new Instant(epochNanoseconds);
  }
  toString(): string {
    if (!ES.IsTemporalTimeZone(this)) throw new TypeError('invalid receiver');
    return GetSlot(this, TIMEZONE_ID);
  }
  toJSON(): Return['toJSON'] {
    if (!ES.IsTemporalTimeZone(this)) throw new TypeError('invalid receiver');
    return GetSlot(this, TIMEZONE_ID);
  }
  static from(item: Params['from'][0]): Return['from'] {
    const timeZoneSlotValue = ES.ToTemporalTimeZoneSlotValue(item);
    return ES.ToTemporalTimeZoneObject(timeZoneSlotValue);
  }
  [Symbol.toStringTag]!: 'Temporal.TimeZone';
}

MakeIntrinsicClass(TimeZone, 'Temporal.TimeZone');
DefineIntrinsic('Temporal.TimeZone.prototype.getOffsetNanosecondsFor', TimeZone.prototype.getOffsetNanosecondsFor);
DefineIntrinsic('Temporal.TimeZone.prototype.getPossibleInstantsFor', TimeZone.prototype.getPossibleInstantsFor);
