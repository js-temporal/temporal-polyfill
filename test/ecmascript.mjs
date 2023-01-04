import Demitasse from '@pipobscure/demitasse';
const { describe, it, report } = Demitasse;

import Pretty from '@pipobscure/demitasse-pretty';
const { reporter } = Pretty;

import { strict as assert } from 'assert';
const { deepEqual, throws } = assert;

import * as ES from '../lib/ecmascript';
import { GetSlot, TIMEZONE_ID } from '../lib/slots';
import { TimeZone } from '../lib/timezone';

describe('ECMAScript', () => {
  describe('GetIANATimeZoneDateTimeParts', () => {
    describe('epoch', () => {
      test(0n, GetSlot(TimeZone.from('America/Los_Angeles'), TIMEZONE_ID), {
        year: 1969,
        month: 12,
        day: 31,
        hour: 16,
        minute: 0,
        second: 0,
        millisecond: 0,
        microsecond: 0,
        nanosecond: 0
      });
      test(0n, GetSlot(TimeZone.from('America/New_York'), TIMEZONE_ID), {
        year: 1969,
        month: 12,
        day: 31,
        hour: 19,
        minute: 0,
        second: 0,
        millisecond: 0,
        microsecond: 0,
        nanosecond: 0
      });
      test(0n, GetSlot(TimeZone.from('Europe/London'), TIMEZONE_ID), {
        year: 1970,
        month: 1,
        day: 1,
        hour: 1,
        minute: 0,
        second: 0,
        millisecond: 0,
        microsecond: 0,
        nanosecond: 0
      });
      test(0n, GetSlot(TimeZone.from('Europe/Berlin'), TIMEZONE_ID), {
        year: 1970,
        month: 1,
        day: 1,
        hour: 1,
        minute: 0,
        second: 0,
        millisecond: 0,
        microsecond: 0,
        nanosecond: 0
      });
      test(0n, GetSlot(TimeZone.from('Europe/Moscow'), TIMEZONE_ID), {
        year: 1970,
        month: 1,
        day: 1,
        hour: 3,
        minute: 0,
        second: 0,
        millisecond: 0,
        microsecond: 0,
        nanosecond: 0
      });
      test(0n, GetSlot(TimeZone.from('Asia/Tokyo'), TIMEZONE_ID), {
        year: 1970,
        month: 1,
        day: 1,
        hour: 9,
        minute: 0,
        second: 0,
        millisecond: 0,
        microsecond: 0,
        nanosecond: 0
      });
    });
    describe('epoch-1', () => {
      test(-1n, GetSlot(TimeZone.from('America/Los_Angeles'), TIMEZONE_ID), {
        year: 1969,
        month: 12,
        day: 31,
        hour: 15,
        minute: 59,
        second: 59,
        millisecond: 999,
        microsecond: 999,
        nanosecond: 999
      });
      test(-1n, GetSlot(TimeZone.from('America/New_York'), TIMEZONE_ID), {
        year: 1969,
        month: 12,
        day: 31,
        hour: 18,
        minute: 59,
        second: 59,
        millisecond: 999,
        microsecond: 999,
        nanosecond: 999
      });
      test(-1n, GetSlot(TimeZone.from('Europe/London'), TIMEZONE_ID), {
        year: 1970,
        month: 1,
        day: 1,
        hour: 0,
        minute: 59,
        second: 59,
        millisecond: 999,
        microsecond: 999,
        nanosecond: 999
      });
      test(-1n, GetSlot(TimeZone.from('Europe/Berlin'), TIMEZONE_ID), {
        year: 1970,
        month: 1,
        day: 1,
        hour: 0,
        minute: 59,
        second: 59,
        millisecond: 999,
        microsecond: 999,
        nanosecond: 999
      });
      test(-1n, GetSlot(TimeZone.from('Europe/Moscow'), TIMEZONE_ID), {
        year: 1970,
        month: 1,
        day: 1,
        hour: 2,
        minute: 59,
        second: 59,
        millisecond: 999,
        microsecond: 999,
        nanosecond: 999
      });
      test(-1n, GetSlot(TimeZone.from('Asia/Tokyo'), TIMEZONE_ID), {
        year: 1970,
        month: 1,
        day: 1,
        hour: 8,
        minute: 59,
        second: 59,
        millisecond: 999,
        microsecond: 999,
        nanosecond: 999
      });
    });
    describe('epoch+1', () => {
      test(1n, GetSlot(TimeZone.from('America/Los_Angeles'), TIMEZONE_ID), {
        year: 1969,
        month: 12,
        day: 31,
        hour: 16,
        minute: 0,
        second: 0,
        millisecond: 0,
        microsecond: 0,
        nanosecond: 1
      });
      test(1n, GetSlot(TimeZone.from('America/New_York'), TIMEZONE_ID), {
        year: 1969,
        month: 12,
        day: 31,
        hour: 19,
        minute: 0,
        second: 0,
        millisecond: 0,
        microsecond: 0,
        nanosecond: 1
      });
      test(1n, GetSlot(TimeZone.from('Europe/London'), TIMEZONE_ID), {
        year: 1970,
        month: 1,
        day: 1,
        hour: 1,
        minute: 0,
        second: 0,
        millisecond: 0,
        microsecond: 0,
        nanosecond: 1
      });
      test(1n, GetSlot(TimeZone.from('Europe/Berlin'), TIMEZONE_ID), {
        year: 1970,
        month: 1,
        day: 1,
        hour: 1,
        minute: 0,
        second: 0,
        millisecond: 0,
        microsecond: 0,
        nanosecond: 1
      });
      test(1n, GetSlot(TimeZone.from('Europe/Moscow'), TIMEZONE_ID), {
        year: 1970,
        month: 1,
        day: 1,
        hour: 3,
        minute: 0,
        second: 0,
        millisecond: 0,
        microsecond: 0,
        nanosecond: 1
      });
      test(1n, GetSlot(TimeZone.from('Asia/Tokyo'), TIMEZONE_ID), {
        year: 1970,
        month: 1,
        day: 1,
        hour: 9,
        minute: 0,
        second: 0,
        millisecond: 0,
        microsecond: 0,
        nanosecond: 1
      });
    });
    describe('epoch-6300000000001', () => {
      test(-6300000000001n, GetSlot(TimeZone.from('America/Los_Angeles'), TIMEZONE_ID), {
        year: 1969,
        month: 12,
        day: 31,
        hour: 14,
        minute: 14,
        second: 59,
        millisecond: 999,
        microsecond: 999,
        nanosecond: 999
      });
      test(-6300000000001n, GetSlot(TimeZone.from('America/New_York'), TIMEZONE_ID), {
        year: 1969,
        month: 12,
        day: 31,
        hour: 17,
        minute: 14,
        second: 59,
        millisecond: 999,
        microsecond: 999,
        nanosecond: 999
      });
      test(-6300000000001n, GetSlot(TimeZone.from('Europe/London'), TIMEZONE_ID), {
        year: 1969,
        month: 12,
        day: 31,
        hour: 23,
        minute: 14,
        second: 59,
        millisecond: 999,
        microsecond: 999,
        nanosecond: 999
      });
      test(-6300000000001n, GetSlot(TimeZone.from('Europe/Berlin'), TIMEZONE_ID), {
        year: 1969,
        month: 12,
        day: 31,
        hour: 23,
        minute: 14,
        second: 59,
        millisecond: 999,
        microsecond: 999,
        nanosecond: 999
      });
      test(-6300000000001n, GetSlot(TimeZone.from('Europe/Moscow'), TIMEZONE_ID), {
        year: 1970,
        month: 1,
        day: 1,
        hour: 1,
        minute: 14,
        second: 59,
        millisecond: 999,
        microsecond: 999,
        nanosecond: 999
      });
      test(-6300000000001n, GetSlot(TimeZone.from('Asia/Tokyo'), TIMEZONE_ID), {
        year: 1970,
        month: 1,
        day: 1,
        hour: 7,
        minute: 14,
        second: 59,
        millisecond: 999,
        microsecond: 999,
        nanosecond: 999
      });
    });
    describe('epoch+6300000000001', () => {
      test(6300000000001n, GetSlot(TimeZone.from('America/Los_Angeles'), TIMEZONE_ID), {
        year: 1969,
        month: 12,
        day: 31,
        hour: 17,
        minute: 45,
        second: 0,
        millisecond: 0,
        microsecond: 0,
        nanosecond: 1
      });
      test(6300000000001n, GetSlot(TimeZone.from('America/New_York'), TIMEZONE_ID), {
        year: 1969,
        month: 12,
        day: 31,
        hour: 20,
        minute: 45,
        second: 0,
        millisecond: 0,
        microsecond: 0,
        nanosecond: 1
      });
      test(6300000000001n, GetSlot(TimeZone.from('Europe/London'), TIMEZONE_ID), {
        year: 1970,
        month: 1,
        day: 1,
        hour: 2,
        minute: 45,
        second: 0,
        millisecond: 0,
        microsecond: 0,
        nanosecond: 1
      });
      test(6300000000001n, GetSlot(TimeZone.from('Europe/Berlin'), TIMEZONE_ID), {
        year: 1970,
        month: 1,
        day: 1,
        hour: 2,
        minute: 45,
        second: 0,
        millisecond: 0,
        microsecond: 0,
        nanosecond: 1
      });
      test(6300000000001n, GetSlot(TimeZone.from('Europe/Moscow'), TIMEZONE_ID), {
        year: 1970,
        month: 1,
        day: 1,
        hour: 4,
        minute: 45,
        second: 0,
        millisecond: 0,
        microsecond: 0,
        nanosecond: 1
      });
      test(6300000000001n, GetSlot(TimeZone.from('Asia/Tokyo'), TIMEZONE_ID), {
        year: 1970,
        month: 1,
        day: 1,
        hour: 10,
        minute: 45,
        second: 0,
        millisecond: 0,
        microsecond: 0,
        nanosecond: 1
      });
    });
    describe('dst', () => {
      test(1553993999999999999n, GetSlot(TimeZone.from('Europe/London'), TIMEZONE_ID), {
        year: 2019,
        month: 3,
        day: 31,
        hour: 0,
        minute: 59,
        second: 59,
        millisecond: 999,
        microsecond: 999,
        nanosecond: 999
      });
      test(1553994000000000000n, GetSlot(TimeZone.from('Europe/London'), TIMEZONE_ID), {
        year: 2019,
        month: 3,
        day: 31,
        hour: 2,
        minute: 0,
        second: 0,
        millisecond: 0,
        microsecond: 0,
        nanosecond: 0
      });
    });

    function test(nanos, zone, expected) {
      // Internally, we represent BigInt as JSBI instances. JSBI instances are
      // not interchangeable with native BigInt, so we must convert them first.
      // Normally, this would have been done upstream by another part of the
      // Temporal APIs, but since we are directly calling into the ES function
      // we must convert in the test instead.
      const nanosAsBigIntInternal = ES.ToBigInt(nanos);
      it(`${nanos} @ ${zone}`, () => deepEqual(ES.GetIANATimeZoneDateTimeParts(nanosAsBigIntInternal, zone), expected));
    }
  });

  describe('GetFormatterParts', () => {
    // https://github.com/tc39/proposal-temporal/issues/575
    test(1589670000000, GetSlot(TimeZone.from('Europe/London'), TIMEZONE_ID), {
      year: 2020,
      month: 5,
      day: 17,
      hour: 0,
      minute: 0,
      second: 0
    });

    function test(nanos, zone, expected) {
      it(`${nanos} @ ${zone}`, () => deepEqual(ES.GetFormatterParts(zone, nanos), expected));
    }
  });

  describe('parseFromEnUsFormat', () => {
    describe('succeeds', () => {
      // newer Firefox
      test('9/16/2021 A, 16:09:00', { year: 2021, month: 9, day: 16, hour: 16, minute: 9, second: 0 });

      // other browsers
      test('9 16, 2021 AD, 16:09:00', { year: 2021, month: 9, day: 16, hour: 16, minute: 9, second: 0 });

      // verify BC years
      test('1 15, 501 BC, 16:07:45', { year: -500, month: 1, day: 15, hour: 16, minute: 7, second: 45 });

      // verify hour 24
      test('1 1, 2000 AD, 24:00:00', { year: 2000, month: 1, day: 1, hour: 0, minute: 0, second: 0 });

      function test(dateTimeString, expected) {
        it(dateTimeString, () => deepEqual(ES.parseFromEnUsFormat(dateTimeString), expected));
      }
    });

    describe('throws', () => {
      test('');
      test('1234');
      test('1 2 3 4 5 6');
      test('1 2 3 4 5 6 7');
      test('this is not a date');
      test('one two three four five six seven');

      function test(dateTimeString) {
        it(dateTimeString, () => throws(() => ES.parseFromEnUsFormat(dateTimeString)));
      }
    });
  });

  describe('GetOptionsObject', () => {
    it('Options parameter can only be an object or undefined', () => {
      [null, 1, 'hello', true, Symbol('1'), 1n].forEach((options) =>
        throws(() => ES.GetOptionsObject(options), TypeError)
      );
    });
  });
});

import { normalize } from 'path';
if (normalize(import.meta.url.slice(8)) === normalize(process.argv[1])) {
  report(reporter).then((failed) => process.exit(failed ? 1 : 0));
}
