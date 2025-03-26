import type JSBI from 'jsbi';
import type { Temporal } from '..';

// Computes trunc(x / 10**p) and x % 10**p, returning { div, mod }, with
// precision loss only once in the quotient, by string manipulation. If the
// quotient and remainder are safe integers, then they are exact. x must be an
// integer. p must be a non-negative integer. Both div and mod have the sign of
// x.
export function TruncatingDivModByPowerOf10(xParam: number, p: number) {
  let x = xParam;
  if (x === 0) return { div: x, mod: x }; // preserves signed zero

  const sign = Math.sign(x);
  x = Math.abs(x);

  const xDigits = Math.trunc(1 + Math.log10(x));
  if (p >= xDigits) return { div: sign * 0, mod: sign * x };
  if (p === 0) return { div: sign * x, mod: sign * 0 };

  // would perform nearest rounding if x was not an integer:
  const xStr = x.toPrecision(xDigits);
  const div = sign * Number.parseInt(xStr.slice(0, xDigits - p), 10);
  const mod = sign * Number.parseInt(xStr.slice(xDigits - p), 10);

  return { div, mod };
}

// Computes x * 10**p + z with precision loss only at the end, by string
// manipulation. If the result is a safe integer, then it is exact. x must be
// an integer. p must be a non-negative integer. z must have the same sign as
// x and be less than 10**p.
export function FMAPowerOf10(xParam: number, p: number, zParam: number) {
  let x = xParam;
  let z = zParam;
  if (x === 0) return z;

  const sign = Math.sign(x) || Math.sign(z);
  x = Math.abs(x);
  z = Math.abs(z);

  const xStr = x.toPrecision(Math.trunc(1 + Math.log10(x)));

  if (z === 0) return sign * Number.parseInt(xStr + '0'.repeat(p), 10);

  const zStr = z.toPrecision(Math.trunc(1 + Math.log10(z)));

  const resStr = xStr + zStr.padStart(p, '0');
  return sign * Number.parseInt(resStr, 10);
}

type UnsignedRoundingMode = 'half-even' | 'half-infinity' | 'half-zero' | 'infinity' | 'zero';

export function GetUnsignedRoundingMode(
  mode: Temporal.RoundingMode,
  sign: 'positive' | 'negative'
): UnsignedRoundingMode {
  const isNegative = sign === 'negative';
  switch (mode) {
    case 'ceil':
      return isNegative ? 'zero' : 'infinity';
    case 'floor':
      return isNegative ? 'infinity' : 'zero';
    case 'expand':
      return 'infinity';
    case 'trunc':
      return 'zero';
    case 'halfCeil':
      return isNegative ? 'half-zero' : 'half-infinity';
    case 'halfFloor':
      return isNegative ? 'half-infinity' : 'half-zero';
    case 'halfExpand':
      return 'half-infinity';
    case 'halfTrunc':
      return 'half-zero';
    case 'halfEven':
      return 'half-even';
  }
}

// Omits first step from spec algorithm so that it can be used both for
// RoundNumberToIncrement and RoundTimeDurationToIncrement
export function ApplyUnsignedRoundingMode<T extends number | JSBI>(
  r1: T,
  r2: T,
  cmp: -1 | 0 | 1,
  evenCardinality: boolean,
  unsignedRoundingMode: UnsignedRoundingMode
) {
  if (unsignedRoundingMode === 'zero') return r1;
  if (unsignedRoundingMode === 'infinity') return r2;
  if (cmp < 0) return r1;
  if (cmp > 0) return r2;
  if (unsignedRoundingMode === 'half-zero') return r1;
  if (unsignedRoundingMode === 'half-infinity') return r2;
  return evenCardinality ? r1 : r2;
}
