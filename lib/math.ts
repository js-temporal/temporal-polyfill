import type { Temporal } from '..';
import type { F128 } from './float128';

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
export function ApplyUnsignedRoundingMode<T extends number | F128>(
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
