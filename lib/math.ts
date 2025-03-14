import type JSBI from 'jsbi';
import type { Temporal } from '..';

const MathAbs = Math.abs;
const MathLog10 = Math.log10;
const MathSign = Math.sign;
const MathTrunc = Math.trunc;
const NumberParseInt = Number.parseInt;
const NumberPrototypeToPrecision = Number.prototype.toPrecision;
const StringPrototypePadStart = String.prototype.padStart;
const StringPrototypeRepeat = String.prototype.repeat;
const StringPrototypeSlice = String.prototype.slice;
const ReflectApply = Reflect.apply;

// Computes trunc(x / 10**p) and x % 10**p, returning { div, mod }, with
// precision loss only once in the quotient, by string manipulation. If the
// quotient and remainder are safe integers, then they are exact. x must be an
// integer. p must be a non-negative integer. Both div and mod have the sign of
// x.
export function TruncatingDivModByPowerOf10(xParam: number, p: number) {
  let x = xParam;
  if (x === 0) return { div: x, mod: x }; // preserves signed zero

  const sign = MathSign(x);
  x = MathAbs(x);

  const xDigits = MathTrunc(1 + MathLog10(x));
  if (p >= xDigits) return { div: sign * 0, mod: sign * x };
  if (p === 0) return { div: sign * x, mod: sign * 0 };

  // would perform nearest rounding if x was not an integer:
  const xStr = ReflectApply(NumberPrototypeToPrecision, x, [xDigits]);
  const div = sign * NumberParseInt(ReflectApply(StringPrototypeSlice, xStr, [0, xDigits - p]), 10);
  const mod = sign * NumberParseInt(ReflectApply(StringPrototypeSlice, xStr, [xDigits - p]), 10);

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

  const sign = MathSign(x) || MathSign(z);
  x = MathAbs(x);
  z = MathAbs(z);

  const xStr = ReflectApply(NumberPrototypeToPrecision, x, [MathTrunc(1 + MathLog10(x))]);

  if (z === 0) return sign * NumberParseInt(xStr + ReflectApply(StringPrototypeRepeat, '0', [p]), 10);

  const zStr = ReflectApply(NumberPrototypeToPrecision, z, [MathTrunc(1 + MathLog10(z))]);

  const resStr = xStr + ReflectApply(StringPrototypePadStart, zStr, [p, '0']);
  return sign * NumberParseInt(resStr, 10);
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
// RoundNumberToIncrement and RoundNormalizedTimeDurationToIncrement
export function ApplyUnsignedRoundingMode<T extends number | JSBI>(
  r1: T,
  r2: T,
  cmp: number,
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
