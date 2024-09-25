import { Error as ErrorCtor } from './primordials';

export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new ErrorCtor(`assertion failure: ${message}`);
}

export function assertNotReached(message?: string): never {
  const reason = message ? ` because ${message}` : '';
  throw new ErrorCtor(`assertion failure: code should not be reached${reason}`);
}
