type Primitive = boolean | string | number | symbol | bigint | null | undefined;
type Primitivable = { [Symbol.toPrimitive]?(hint: 'string' | 'number' | 'default'): Primitive };

function RejectNonStringPrimitive(input: unknown): asserts input is object {
  if (input === null || (typeof input !== 'object' && typeof input !== 'function')) {
    throw new TypeError('month code must be a string');
  }
}

// Inlined copy of ES.ToPrimitive with preferredType = String and only accepting
// String output, to avoid circular dependency issues
export function ToPrimitiveRequireString(input: unknown): string {
  if (typeof input === 'string') return input;
  RejectNonStringPrimitive(input);

  const toPrimitive = (input as Primitivable)[Symbol.toPrimitive];
  if (toPrimitive) {
    const result = toPrimitive.call(input, 'string');
    if (typeof result === 'string') return result;
    throw new TypeError('month code must be a string');
  }
  const toString = input.toString;
  if (typeof toString === 'function') {
    const result = toString.call(input);
    if (typeof result === 'string') return result;
    RejectNonStringPrimitive(result);
  }
  const valueOf = input.valueOf;
  const result = valueOf.call(input);
  if (typeof result === 'string') return result;
  throw new TypeError('month code must be a string');
}
