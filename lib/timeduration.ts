import JSBI from 'jsbi';

import {
  abs,
  BILLION,
  DAY_NANOS,
  divmod,
  ensureJSBI,
  HOUR_NANOS,
  MILLION,
  MINUTE_NANOS,
  TEN,
  THOUSAND,
  TWO,
  ZERO
} from './bigintmath';
import type { Temporal } from '..';

const MathAbs = Math.abs;
const MathSign = Math.sign;
const NumberIsInteger = Number.isInteger;
const NumberIsSafeInteger = Number.isSafeInteger;

export class TimeDuration {
  static MAX = JSBI.BigInt('9007199254740991999999999');
  static ZERO = new TimeDuration(ZERO);

  totalNs: JSBI;
  sec: number;
  subsec: number;

  constructor(totalNs: bigint | JSBI) {
    this.totalNs = ensureJSBI(totalNs);
    if (JSBI.greaterThan(abs(this.totalNs), TimeDuration.MAX)) throw new Error('assertion failed: integer too big');

    this.sec = JSBI.toNumber(JSBI.divide(this.totalNs, BILLION));
    this.subsec = JSBI.toNumber(JSBI.remainder(this.totalNs, BILLION));
    if (!NumberIsSafeInteger(this.sec)) throw new Error('assertion failed: seconds too big');
    if (MathAbs(this.subsec) > 999_999_999) throw new Error('assertion failed: subseconds too big');
  }

  static #validateNew(totalNs: JSBI, operation: string) {
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

  static normalize(h: number, min: number, s: number, ms: number, µs: number, ns: number) {
    const totalNs = JSBI.add(
      JSBI.add(
        JSBI.add(
          JSBI.add(
            JSBI.add(JSBI.BigInt(ns), JSBI.multiply(JSBI.BigInt(µs), THOUSAND)),
            JSBI.multiply(JSBI.BigInt(ms), MILLION)
          ),
          JSBI.multiply(JSBI.BigInt(s), BILLION)
        ),
        JSBI.multiply(JSBI.BigInt(min), MINUTE_NANOS)
      ),
      JSBI.multiply(JSBI.BigInt(h), HOUR_NANOS)
    );
    return TimeDuration.#validateNew(totalNs, 'total');
  }

  abs() {
    return new TimeDuration(abs(this.totalNs));
  }

  add(other: TimeDuration) {
    return TimeDuration.#validateNew(JSBI.add(this.totalNs, other.totalNs), 'sum');
  }

  add24HourDays(days: number) {
    if (!NumberIsInteger(days)) throw new Error('assertion failed: days is an integer');
    return TimeDuration.#validateNew(JSBI.add(this.totalNs, JSBI.multiply(JSBI.BigInt(days), DAY_NANOS)), 'sum');
  }

  addToEpochNs(epochNs: JSBI | bigint) {
    return JSBI.add(ensureJSBI(epochNs), this.totalNs);
  }

  cmp(other: TimeDuration) {
    return compare(this.totalNs, other.totalNs);
  }

  divmod(n: number) {
    if (n === 0) throw new Error('division by zero');
    const { quotient, remainder } = divmod(this.totalNs, JSBI.BigInt(n));
    const q = JSBI.toNumber(quotient);
    const r = new TimeDuration(remainder);
    return { quotient: q, remainder: r };
  }

  fdiv(n: number) {
    if (n === 0) throw new Error('division by zero');
    const nBigInt = JSBI.BigInt(n);
    let { quotient, remainder } = divmod(this.totalNs, nBigInt);

    // Perform long division to calculate the fractional part of the quotient
    // remainder / n with more accuracy than 64-bit floating point division
    const precision = 50;
    const decimalDigits = [];
    let digit;
    const sign = (JSBI.lessThan(this.totalNs, ZERO) ? -1 : 1) * MathSign(n);
    while (!JSBI.equal(remainder, ZERO) && decimalDigits.length < precision) {
      remainder = JSBI.multiply(remainder, TEN);
      ({ quotient: digit, remainder } = divmod(remainder, nBigInt));
      decimalDigits.push(MathAbs(JSBI.toNumber(digit)));
    }
    return sign * Number(abs(quotient).toString() + '.' + decimalDigits.join(''));
  }

  isZero() {
    return JSBI.equal(this.totalNs, ZERO);
  }

  round(increment: number, mode: Temporal.RoundingMode) {
    if (increment === 1) return this;
    let { quotient, remainder } = divmod(this.totalNs, JSBI.BigInt(increment));
    if (JSBI.equal(remainder, ZERO)) return this;
    const sign = JSBI.lessThan(remainder, ZERO) ? -1 : 1;
    const tiebreaker = abs(JSBI.multiply(remainder, TWO));
    const tie = JSBI.equal(tiebreaker, JSBI.BigInt(increment));
    const expandIsNearer = JSBI.greaterThan(tiebreaker, JSBI.BigInt(increment));
    switch (mode) {
      case 'ceil':
        if (sign > 0) quotient = JSBI.add(quotient, JSBI.BigInt(sign));
        break;
      case 'floor':
        if (sign < 0) quotient = JSBI.add(quotient, JSBI.BigInt(sign));
        break;
      case 'expand':
        // always expand if there is a remainder
        quotient = JSBI.add(quotient, JSBI.BigInt(sign));
        break;
      case 'trunc':
        // no change needed, because divmod is a truncation
        break;
      case 'halfCeil':
        if (expandIsNearer || (tie && sign > 0)) quotient = JSBI.add(quotient, JSBI.BigInt(sign));
        break;
      case 'halfFloor':
        if (expandIsNearer || (tie && sign < 0)) quotient = JSBI.add(quotient, JSBI.BigInt(sign));
        break;
      case 'halfExpand':
        // "half up away from zero"
        if (expandIsNearer || tie) quotient = JSBI.add(quotient, JSBI.BigInt(sign));
        break;
      case 'halfTrunc':
        if (expandIsNearer) quotient = JSBI.add(quotient, JSBI.BigInt(sign));
        break;
      case 'halfEven': {
        if (expandIsNearer || (tie && !JSBI.equal(JSBI.remainder(quotient, TWO), ZERO))) {
          quotient = JSBI.add(quotient, JSBI.BigInt(sign));
        }
        break;
      }
    }
    return TimeDuration.#validateNew(JSBI.multiply(quotient, JSBI.BigInt(increment)), 'rounding');
  }

  sign() {
    return this.cmp(new TimeDuration(ZERO));
  }

  subtract(other: TimeDuration) {
    return TimeDuration.#validateNew(JSBI.subtract(this.totalNs, other.totalNs), 'difference');
  }
}
