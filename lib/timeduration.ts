import JSBI from 'jsbi';

import { assert } from './assert';
import {
  abs,
  BILLION,
  compare,
  DAY_NANOS_JSBI,
  divmod,
  ensureJSBI,
  HOUR_NANOS,
  isEven,
  MILLION,
  MINUTE_NANOS_JSBI,
  ONE,
  TEN,
  THOUSAND,
  TWO,
  ZERO
} from './bigintmath';
import { ApplyUnsignedRoundingMode, GetUnsignedRoundingMode } from './math';
import type { Temporal } from '..';

export class TimeDuration {
  static MAX = JSBI.BigInt('9007199254740991999999999');
  static ZERO = new TimeDuration(ZERO);

  totalNs: JSBI;
  sec: number;
  subsec: number;

  constructor(totalNs: bigint | JSBI) {
    assert(typeof totalNs !== 'number', 'big integer required');
    this.totalNs = ensureJSBI(totalNs);
    assert(JSBI.lessThanOrEqual(abs(this.totalNs), TimeDuration.MAX), 'integer too big');

    this.sec = JSBI.toNumber(JSBI.divide(this.totalNs, BILLION));
    this.subsec = JSBI.toNumber(JSBI.remainder(this.totalNs, BILLION));
    assert(Number.isSafeInteger(this.sec), 'seconds too big');
    assert(Math.abs(this.subsec) <= 999_999_999, 'subseconds too big');
  }

  static validateNew(totalNs: JSBI, operation: string) {
    if (JSBI.greaterThan(abs(totalNs), TimeDuration.MAX)) {
      throw new RangeError(`${operation} of duration time units cannot exceed ${TimeDuration.MAX} s`);
    }
    return new TimeDuration(totalNs);
  }

  static fromEpochNsDiff(epochNs1: JSBI | bigint, epochNs2: JSBI | bigint) {
    const diff = JSBI.subtract(ensureJSBI(epochNs1), ensureJSBI(epochNs2));
    // No extra validate step. Should instead fail assertion if too big
    return new TimeDuration(diff);
  }

  static fromComponents(h: number, min: number, s: number, ms: number, µs: number, ns: number) {
    const totalNs = JSBI.add(
      JSBI.add(
        JSBI.add(
          JSBI.add(
            JSBI.add(JSBI.BigInt(ns), JSBI.multiply(JSBI.BigInt(µs), THOUSAND)),
            JSBI.multiply(JSBI.BigInt(ms), MILLION)
          ),
          JSBI.multiply(JSBI.BigInt(s), BILLION)
        ),
        JSBI.multiply(JSBI.BigInt(min), MINUTE_NANOS_JSBI)
      ),
      JSBI.multiply(JSBI.BigInt(h), HOUR_NANOS)
    );
    return TimeDuration.validateNew(totalNs, 'total');
  }

  abs() {
    return new TimeDuration(abs(this.totalNs));
  }

  add(other: TimeDuration) {
    return TimeDuration.validateNew(JSBI.add(this.totalNs, other.totalNs), 'sum');
  }

  add24HourDays(days: number) {
    assert(Number.isInteger(days), 'days must be an integer');
    return TimeDuration.validateNew(JSBI.add(this.totalNs, JSBI.multiply(JSBI.BigInt(days), DAY_NANOS_JSBI)), 'sum');
  }

  addToEpochNs(epochNs: JSBI | bigint) {
    return JSBI.add(ensureJSBI(epochNs), this.totalNs);
  }

  cmp(other: TimeDuration) {
    return compare(this.totalNs, other.totalNs);
  }

  divmod(n: number) {
    assert(n !== 0, 'division by zero');
    const { quotient, remainder } = divmod(this.totalNs, JSBI.BigInt(n));
    const q = JSBI.toNumber(quotient);
    const r = new TimeDuration(remainder);
    return { quotient: q, remainder: r };
  }

  fdiv(nParam: JSBI | bigint) {
    const n = ensureJSBI(nParam);
    assert(!JSBI.equal(n, ZERO), 'division by zero');
    const nBigInt = JSBI.BigInt(n);
    let { quotient, remainder } = divmod(this.totalNs, nBigInt);

    // Perform long division to calculate the fractional part of the quotient
    // remainder / n with more accuracy than 64-bit floating point division
    const precision = 50;
    const decimalDigits: number[] = [];
    let digit;
    const sign = (JSBI.lessThan(this.totalNs, ZERO) ? -1 : 1) * Math.sign(JSBI.toNumber(n));
    while (!JSBI.equal(remainder, ZERO) && decimalDigits.length < precision) {
      remainder = JSBI.multiply(remainder, TEN);
      ({ quotient: digit, remainder } = divmod(remainder, nBigInt));
      decimalDigits.push(Math.abs(JSBI.toNumber(digit)));
    }
    return sign * Number(abs(quotient).toString() + '.' + decimalDigits.join(''));
  }

  isZero() {
    return JSBI.equal(this.totalNs, ZERO);
  }

  round(incrementParam: JSBI | bigint, mode: Temporal.RoundingMode) {
    const increment = ensureJSBI(incrementParam);
    if (JSBI.equal(increment, ONE)) return this;
    const { quotient, remainder } = divmod(this.totalNs, increment);
    const sign = JSBI.lessThan(this.totalNs, ZERO) ? 'negative' : 'positive';
    const r1 = JSBI.multiply(abs(quotient), increment);
    const r2 = JSBI.add(r1, increment);
    const cmp = compare(abs(JSBI.multiply(remainder, TWO)), increment);
    const unsignedRoundingMode = GetUnsignedRoundingMode(mode, sign);
    const rounded = JSBI.equal(abs(this.totalNs), r1)
      ? r1
      : ApplyUnsignedRoundingMode(r1, r2, cmp, isEven(quotient), unsignedRoundingMode);
    const result = sign === 'positive' ? rounded : JSBI.unaryMinus(rounded);
    return TimeDuration.validateNew(result, 'rounding');
  }

  sign() {
    return this.cmp(new TimeDuration(ZERO));
  }

  subtract(other: TimeDuration) {
    return TimeDuration.validateNew(JSBI.subtract(this.totalNs, other.totalNs), 'difference');
  }
}
