import Demitasse from '@pipobscure/demitasse';
const { describe, it, report } = Demitasse;

import Pretty from '@pipobscure/demitasse-pretty';
const { reporter } = Pretty;

import { strict as assert } from 'assert';
const { equal, throws } = assert;

import { F128 } from '../lib/float128';
import { TimeDuration } from '../lib/timeduration';

function b(bi) {
  return F128.fromString(bi.toString(10));
}

function check(timeDuration, sec, subsec) {
  equal(timeDuration.sec, sec);
  equal(timeDuration.subsec, subsec);
}

describe('Normalized time duration', () => {
  describe('construction', () => {
    it('basic', () => {
      check(new TimeDuration(b(123456789_987654321n)), 123456789, 987654321);
      check(new TimeDuration(b(-987654321_123456789n)), -987654321, -123456789);
    });

    it('either sign with zero in the other component', () => {
      check(new TimeDuration(b(123n)), 0, 123);
      check(new TimeDuration(b(-123n)), 0, -123);
      check(new TimeDuration(b(123_000_000_000n)), 123, 0);
      check(new TimeDuration(b(-123_000_000_000n)), -123, 0);
    });
  });

  describe('construction impossible', () => {
    it('out of range', () => {
      throws(() => new TimeDuration(b(2n ** 53n * 1_000_000_000n)));
      throws(() => new TimeDuration(b(-(2n ** 53n * 1_000_000_000n))));
    });

    it('not an integer', () => {
      throws(() => new TimeDuration(Math.PI));
    });
  });

  describe('fromEpochNsDiff()', () => {
    it('basic', () => {
      check(TimeDuration.fromEpochNsDiff(b(1695930183_043174412n), b(1695930174_412168313n)), 8, 631006099);
      check(TimeDuration.fromEpochNsDiff(b(1695930174_412168313n), b(1695930183_043174412n)), -8, -631006099);
    });

    it('pre-epoch', () => {
      check(TimeDuration.fromEpochNsDiff(b(-80000_987_654_321n), b(-86400_123_456_789n)), 6399, 135802468);
      check(TimeDuration.fromEpochNsDiff(b(-86400_123_456_789n), b(-80000_987_654_321n)), -6399, -135802468);
    });

    it('cross-epoch', () => {
      check(TimeDuration.fromEpochNsDiff(b(1_000_001_000n), b(-2_000_002_000n)), 3, 3000);
      check(TimeDuration.fromEpochNsDiff(b(-2_000_002_000n), b(1_000_001_000n)), -3, -3000);
    });

    it('maximum epoch difference', () => {
      const max = 86400_0000_0000_000_000_000n;
      check(TimeDuration.fromEpochNsDiff(b(max), b(-max)), 172800_0000_0000, 0);
      check(TimeDuration.fromEpochNsDiff(b(-max), b(max)), -172800_0000_0000, 0);
    });
  });

  describe('fromComponents()', () => {
    it('basic', () => {
      check(TimeDuration.fromComponents(1, 1, 1, 1, 1, 1), 3661, 1001001);
      check(TimeDuration.fromComponents(-1, -1, -1, -1, -1, -1), -3661, -1001001);
    });

    it('overflow from one unit to another', () => {
      check(TimeDuration.fromComponents(1, 61, 61, 998, 1000, 1000), 7321, 999001000);
      check(TimeDuration.fromComponents(-1, -61, -61, -998, -1000, -1000), -7321, -999001000);
    });

    it('overflow from subseconds to seconds', () => {
      check(TimeDuration.fromComponents(0, 0, 1, 1000, 0, 0), 2, 0);
      check(TimeDuration.fromComponents(0, 0, -1, -1000, 0, 0), -2, 0);
    });

    it('multiple overflows from subseconds to seconds', () => {
      check(TimeDuration.fromComponents(0, 0, 0, 1234567890, 1234567890, 1234567890), 1235803, 692457890);
      check(TimeDuration.fromComponents(0, 0, 0, -1234567890, -1234567890, -1234567890), -1235803, -692457890);
    });

    it('fails on overflow', () => {
      throws(() => TimeDuration.fromComponents(2501999792984, 0, 0, 0, 0, 0), RangeError);
      throws(() => TimeDuration.fromComponents(-2501999792984, 0, 0, 0, 0, 0), RangeError);
      throws(() => TimeDuration.fromComponents(0, 150119987579017, 0, 0, 0, 0), RangeError);
      throws(() => TimeDuration.fromComponents(0, -150119987579017, 0, 0, 0, 0), RangeError);
      throws(() => TimeDuration.fromComponents(0, 0, 2 ** 53, 0, 0, 0), RangeError);
      throws(() => TimeDuration.fromComponents(0, 0, -(2 ** 53), 0, 0, 0), RangeError);
      throws(() => TimeDuration.fromComponents(0, 0, Number.MAX_SAFE_INTEGER, 1000, 0, 0), RangeError);
      throws(() => TimeDuration.fromComponents(0, 0, -Number.MAX_SAFE_INTEGER, -1000, 0, 0), RangeError);
      throws(() => TimeDuration.fromComponents(0, 0, Number.MAX_SAFE_INTEGER, 0, 1000000, 0), RangeError);
      throws(() => TimeDuration.fromComponents(0, 0, -Number.MAX_SAFE_INTEGER, 0, -1000000, 0), RangeError);
      throws(() => TimeDuration.fromComponents(0, 0, Number.MAX_SAFE_INTEGER, 0, 0, 1000000000), RangeError);
      throws(() => TimeDuration.fromComponents(0, 0, -Number.MAX_SAFE_INTEGER, 0, 0, -1000000000), RangeError);
    });
  });

  describe('abs()', () => {
    it('positive', () => {
      const d = new TimeDuration(b(123_456_654_321n));
      check(d.abs(), 123, 456_654_321);
    });

    it('negative', () => {
      const d = new TimeDuration(b(-123_456_654_321n));
      check(d.abs(), 123, 456_654_321);
    });

    it('zero', () => {
      const d = new TimeDuration(b(0n));
      check(d.abs(), 0, 0);
    });
  });

  describe('add()', () => {
    it('basic', () => {
      const d1 = new TimeDuration(b(123_456_654_321_123_456n));
      const d2 = new TimeDuration(b(654_321_123_456_654_321n));
      check(d1.add(d2), 777_777_777, 777_777_777);
    });

    it('negative', () => {
      const d1 = new TimeDuration(b(-123_456_654_321_123_456n));
      const d2 = new TimeDuration(b(-654_321_123_456_654_321n));
      check(d1.add(d2), -777_777_777, -777_777_777);
    });

    it('signs differ', () => {
      const d1 = new TimeDuration(b(333_333_333_333_333_333n));
      const d2 = new TimeDuration(b(-222_222_222_222_222_222n));
      check(d1.add(d2), 111_111_111, 111_111_111);

      const d3 = new TimeDuration(b(-333_333_333_333_333_333n));
      const d4 = new TimeDuration(b(222_222_222_222_222_222n));
      check(d3.add(d4), -111_111_111, -111_111_111);
    });

    it('cross zero', () => {
      const d1 = new TimeDuration(b(222_222_222_222_222_222n));
      const d2 = new TimeDuration(b(-333_333_333_333_333_333n));
      check(d1.add(d2), -111_111_111, -111_111_111);
    });

    it('overflow from subseconds to seconds', () => {
      const d1 = new TimeDuration(b(999_999_999n));
      const d2 = new TimeDuration(b(2n));
      check(d1.add(d2), 1, 1);
    });

    it('fails on overflow', () => {
      const d1 = new TimeDuration(b(2n ** 52n * 1_000_000_000n));
      throws(() => d1.add(d1), RangeError);
    });
  });

  describe('add24HourDays()', () => {
    it('basic', () => {
      const d = new TimeDuration(b(111_111_111_111_111_111n));
      check(d.add24HourDays(10), 111_975_111, 111_111_111);
    });

    it('negative', () => {
      const d = new TimeDuration(b(-111_111_111_111_111_111n));
      check(d.add24HourDays(-10), -111_975_111, -111_111_111);
    });

    it('signs differ', () => {
      const d1 = new TimeDuration(b(864000_000_000_000n));
      check(d1.add24HourDays(-5), 432000, 0);

      const d2 = new TimeDuration(b(-864000_000_000_000n));
      check(d2.add24HourDays(5), -432000, 0);
    });

    it('cross zero', () => {
      const d1 = new TimeDuration(b(86400_000_000_000n));
      check(d1.add24HourDays(-2), -86400, 0);

      const d2 = new TimeDuration(b(-86400_000_000_000n));
      check(d2.add24HourDays(3), 172800, 0);
    });

    it('overflow from subseconds to seconds', () => {
      const d1 = new TimeDuration(b(-86400_333_333_333n));
      check(d1.add24HourDays(2), 86399, 666_666_667);

      const d2 = new TimeDuration(b(86400_333_333_333n));
      check(d2.add24HourDays(-2), -86399, -666_666_667);
    });

    it('does not accept non-integers', () => {
      const d = new TimeDuration(b(0n));
      throws(() => d.add24HourDays(1.5), Error);
    });

    it('fails on overflow', () => {
      const d = new TimeDuration(b(0n));
      throws(() => d.add24HourDays(104249991375), RangeError);
      throws(() => d.add24HourDays(-104249991375), RangeError);
    });
  });

  describe('round()', () => {
    it('basic', () => {
      const d = new TimeDuration(b(1_234_567_890n));
      check(d.round(1000, 'halfExpand'), 1, 234568000);
    });

    it('increment 1', () => {
      const d = new TimeDuration(b(1_234_567_890n));
      check(d.round(1, 'ceil'), 1, 234567890);
    });

    it('rounds up from subseconds to seconds', () => {
      const d = new TimeDuration(b(1_999_999_999n));
      check(d.round(1e9, 'halfExpand'), 2, 0);
    });

    describe('Rounding modes', () => {
      const increment = 100;
      const testValues = [-150, -100, -80, -50, -30, 0, 30, 50, 80, 100, 150];
      const expectations = {
        ceil: [-100, -100, 0, 0, 0, 0, 100, 100, 100, 100, 200],
        floor: [-200, -100, -100, -100, -100, 0, 0, 0, 0, 100, 100],
        trunc: [-100, -100, 0, 0, 0, 0, 0, 0, 0, 100, 100],
        expand: [-200, -100, -100, -100, -100, 0, 100, 100, 100, 100, 200],
        halfCeil: [-100, -100, -100, 0, 0, 0, 0, 100, 100, 100, 200],
        halfFloor: [-200, -100, -100, -100, 0, 0, 0, 0, 100, 100, 100],
        halfTrunc: [-100, -100, -100, 0, 0, 0, 0, 0, 100, 100, 100],
        halfExpand: [-200, -100, -100, -100, 0, 0, 0, 100, 100, 100, 200],
        halfEven: [-200, -100, -100, 0, 0, 0, 0, 0, 100, 100, 200]
      };
      for (const roundingMode of Object.keys(expectations)) {
        describe(roundingMode, () => {
          testValues.forEach((value, ix) => {
            const expected = expectations[roundingMode][ix];

            it(`rounds ${value} ns to ${expected} ns`, () => {
              const d = new TimeDuration(new F128(value));
              const result = d.round(increment, roundingMode);
              check(result, 0, expected);
            });

            it(`rounds ${value} s to ${expected} s`, () => {
              const d = new TimeDuration(new F128(value * 1e9));
              const result = d.round(increment * 1e9, roundingMode);
              check(result, expected, 0);
            });
          });
        });
      }
    });
  });

  describe('subtract', () => {
    it('basic', () => {
      const d1 = new TimeDuration(b(321_987654321n));
      const d2 = new TimeDuration(b(123_123456789n));
      check(d1.subtract(d2), 198, 864197532);
      check(d2.subtract(d1), -198, -864197532);
    });

    it('signs differ in result', () => {
      const d1 = new TimeDuration(b(3661_001001001n));
      const d2 = new TimeDuration(b(86400_000_000_000n));
      check(d1.subtract(d2), -82738, -998998999);
      check(d2.subtract(d1), 82738, 998998999);
    });
  });
});

import { normalize } from 'path';
if (normalize(import.meta.url.slice(8)) === normalize(process.argv[1])) {
  report(reporter).then((failed) => process.exit(failed ? 1 : 0));
}
