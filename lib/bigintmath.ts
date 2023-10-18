import JSBI from 'jsbi';

export const ZERO = JSBI.BigInt(0);
export const ONE = JSBI.BigInt(1);
export const TWO = JSBI.BigInt(2);
export const TEN = JSBI.BigInt(10);
export const TWENTY_FOUR = JSBI.BigInt(24);
export const SIXTY = JSBI.BigInt(60);
export const THOUSAND = JSBI.BigInt(1e3);
export const MILLION = JSBI.BigInt(1e6);
export const BILLION = JSBI.BigInt(1e9);
const HOUR_SECONDS = 3600;
export const HOUR_NANOS = JSBI.multiply(JSBI.BigInt(HOUR_SECONDS), BILLION);
export const MINUTE_NANOS = JSBI.multiply(SIXTY, BILLION);
export const DAY_NANOS_JSBI = JSBI.multiply(HOUR_NANOS, TWENTY_FOUR);

/** Handle a JSBI or native BigInt. For user input, use ES.ToBigInt instead */
export function ensureJSBI(value: JSBI | bigint) {
  return typeof value === 'bigint' ? JSBI.BigInt(value.toString(10)) : value;
}

export function abs(x: JSBI): JSBI {
  if (JSBI.lessThan(x, ZERO)) return JSBI.unaryMinus(x);
  return x;
}

export function compare(x: JSBI, y: JSBI): -1 | 0 | 1 {
  return JSBI.lessThan(x, y) ? -1 : JSBI.greaterThan(x, y) ? 1 : 0;
}

export function divmod(x: JSBI, y: JSBI): { quotient: JSBI; remainder: JSBI } {
  const quotient = JSBI.divide(x, y);
  const remainder = JSBI.remainder(x, y);
  return { quotient, remainder };
}

export function NonNegativeBigIntDivmod(x: JSBI, y: JSBI) {
  let { quotient, remainder } = divmod(x, y);
  if (JSBI.lessThan(remainder, ZERO)) {
    quotient = JSBI.subtract(quotient, ONE);
    remainder = JSBI.add(remainder, y);
  }
  return { quotient, remainder };
}

export function BigIntFloorDiv(left: JSBI, right: JSBI) {
  const { quotient, remainder } = divmod(left, right);
  if (!JSBI.equal(remainder, ZERO) && !JSBI.lessThan(left, ZERO) != !JSBI.lessThan(right, ZERO)) {
    return JSBI.subtract(quotient, ONE);
  }
  return quotient;
}

/** Divide two JSBIs, and return the result as a Number, including the remainder. */
export function BigIntDivideToNumber(dividend: JSBI, divisor: JSBI) {
  const { quotient, remainder } = divmod(dividend, divisor);
  const result = JSBI.toNumber(quotient) + JSBI.toNumber(remainder) / JSBI.toNumber(divisor);
  return result;
}
