import { DatePrototypeValueOf, ReflectApply } from './primordials';

import { Instant } from './instant';

import JSBI from 'jsbi';
import { MILLION } from './bigintmath';

// By default, a plain function can be called as a constructor. A method such as
// Date.prototype.toTemporalInstant should not be able to. We could check
// new.target in the body of toTemporalInstant, but that is not sufficient for
// preventing construction when passing it as the newTarget parameter of
// Reflect.construct. So we create it as a method of an otherwise unused class,
// and monkeypatch it onto Date.prototype.

class LegacyDateImpl {
  toTemporalInstant(this: Date) {
    const epochNanoseconds = JSBI.multiply(JSBI.BigInt(ReflectApply(DatePrototypeValueOf, this, [])), MILLION);
    return new Instant(epochNanoseconds);
  }
}

export const toTemporalInstant = LegacyDateImpl.prototype.toTemporalInstant;
