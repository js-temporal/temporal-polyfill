import { Instant } from './instant';

import bigInt from 'big-integer';

export function toTemporalInstant(this: Date) {
  // Observable access to valueOf is not correct here, but unavoidable
  const epochNanoseconds = bigInt(+this).multiply(1e6);
  return new Instant(bigIntIfAvailable(epochNanoseconds));
}

function bigIntIfAvailable(wrapper) {
  return typeof globalThis.BigInt === 'undefined' ? wrapper : wrapper.value;
}
