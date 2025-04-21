import { assert } from './assert';
import { F128 } from './float128';
import { ApplyUnsignedRoundingMode, GetUnsignedRoundingMode } from './math';
import type { Temporal } from '..';

export class TimeDuration {
  static MAX = F128.fromString('9007199254740991999999999');
  static ZERO = new TimeDuration(F128[0]);

  totalNs: F128;
  sec: number;
  subsec: number;

  constructor(totalNs: F128) {
    this.totalNs = totalNs.fadd(0); // normalize -0
    assert(this.totalNs.abs().leq(TimeDuration.MAX), 'integer too big');

    const sec = this.totalNs.fdiv(1e9).trunc();
    this.sec = sec.toNumber() + 0;
    this.subsec = this.totalNs.sub(sec.fmul(1e9)).toNumber() + 0;
    assert(Number.isSafeInteger(this.sec), 'seconds too big');
    assert(Math.abs(this.subsec) <= 999_999_999, 'subseconds too big ' + this.subsec);
  }

  static validateNew(totalNs: F128, operation: string) {
    if (totalNs.abs().gt(TimeDuration.MAX)) {
      throw new RangeError(`${operation} of duration time units cannot exceed ${TimeDuration.MAX} s`);
    }
    return new TimeDuration(totalNs);
  }

  static fromEpochNsDiff(epochNs1: F128, epochNs2: F128) {
    const diff = epochNs1.sub(epochNs2);
    // No extra validate step. Should instead fail assertion if too big
    return new TimeDuration(diff);
  }

  static fromComponents(h: number, min: number, s: number, ms: number, µs: number, ns: number) {
    const totalNs = new F128(ns)
      .add(new F128(µs).fmul(1e3))
      .add(new F128(ms).fmul(1e6))
      .add(new F128(s).fmul(1e9))
      .add(new F128(min).fmul(60e9))
      .add(new F128(h).fmul(3600e9));
    return TimeDuration.validateNew(totalNs, 'total');
  }

  abs() {
    return new TimeDuration(this.totalNs.abs());
  }

  add(other: TimeDuration) {
    return TimeDuration.validateNew(this.totalNs.add(other.totalNs), 'sum');
  }

  add24HourDays(days: number) {
    assert(Number.isInteger(days), 'days must be an integer');
    return TimeDuration.validateNew(this.totalNs.add(new F128(days).fmul(86400e9)), 'sum');
  }

  round(increment: number, mode: Temporal.RoundingMode) {
    if (increment === 1) return this;
    const quotient = this.totalNs.fdiv(increment).trunc();
    const remainder = this.totalNs.sub(quotient.fmul(increment));
    const sign = this.totalNs.sign() === -1 ? 'negative' : 'positive';
    const r1 = quotient.abs().fmul(increment);
    const r2 = r1.fadd(increment);
    const cmp = remainder.fmul(2).abs().cmp(new F128(increment));
    const unsignedRoundingMode = GetUnsignedRoundingMode(mode, sign);
    const rounded = this.totalNs.abs().eq(r1)
      ? r1
      : ApplyUnsignedRoundingMode(r1, r2, cmp, quotient.isEvenInt(), unsignedRoundingMode);
    const result = sign === 'positive' ? rounded : rounded.neg();
    return TimeDuration.validateNew(result, 'rounding');
  }

  subtract(other: TimeDuration) {
    return TimeDuration.validateNew(this.totalNs.sub(other.totalNs), 'difference');
  }
}
