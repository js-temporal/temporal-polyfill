import { expect, it } from '@jest/globals';
import { Temporal } from '../lib/index';

it('allows Temporal.Now to be replaced and restored', () => {
  const original = Object.getOwnPropertyDescriptor(Temporal, 'Now');
  expect(original).toEqual({
    value: Temporal.Now,
    writable: true,
    enumerable: false,
    configurable: true
  });

  const replacement = { instant: () => Temporal.Instant.fromEpochMilliseconds(0) };
  try {
    Object.defineProperty(Temporal, 'Now', { ...original, value: replacement });
    expect(Temporal.Now.instant().epochMilliseconds).toBe(0);
  } finally {
    Object.defineProperty(Temporal, 'Now', original);
  }
  expect(Temporal.Now).toBe(original.value);
});
