export function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`assertion failure: ${message}`);
}

export function assertNotReached(message?: string): never {
  const reason = message ? ` because ${message}` : '';
  throw new Error(`assertion failure: code should not be reached${reason}`);
}
