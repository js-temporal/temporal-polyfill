import { DatePrototypeValueOf, ReflectApply } from './primordials';

import { Instant } from './instant';

import JSBI from 'jsbi';
import { MILLION } from './bigintmath';

export function toTemporalInstant(this: Date) {
  const epochNanoseconds = JSBI.multiply(JSBI.BigInt(ReflectApply(DatePrototypeValueOf, this, [])), MILLION);
  return new Instant(epochNanoseconds);
}
