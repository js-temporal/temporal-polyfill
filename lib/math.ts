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
