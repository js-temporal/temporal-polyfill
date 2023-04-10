import { Instant } from './instant';

import JSBI from 'jsbi';
import { MILLION } from './ecmascript';

export function toTemporalInstant(this: Date) {
  // Observable access to valueOf is not correct here, but unavoidable
  const epochNanoseconds = JSBI.multiply(JSBI.BigInt(+this), MILLION);
  return new Instant(epochNanoseconds);
}
