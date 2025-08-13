type Primitive = boolean | string | number | symbol | bigint | null | undefined;
type Primitivable = { [Symbol.toPrimitive]?(hint: 'string' | 'number' | 'default'): Primitive };

function RejectNonStringPrimitive(input: unknown): asserts input is object {
  if (input === null || (typeof input !== 'object' && typeof input !== 'function')) {
    throw new TypeError('month code must be a string');
  }
}

// Inlined copy of ES.ToPrimitive with preferredType = String and only accepting
// String output, to avoid circular dependency issues
function ToPrimitiveRequireString(input: unknown): string {
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

export function ParseMonthCode(argument: unknown) {
  const value = ToPrimitiveRequireString(argument);
  if (
    value.length < 3 ||
    value.length > 4 ||
    value[0] !== 'M' ||
    '0123456789'.indexOf(value[1]) === -1 ||
    '0123456789'.indexOf(value[2]) === -1 ||
    (value[1] + value[2] === '00' && value[3] !== 'L') ||
    (value[3] !== 'L' && value[3] !== undefined)
  ) {
    throw new RangeError(`bad month code ${value}; must match M01-M99 or M00L-M99L`);
  }
  const isLeapMonth = value.length === 4;
  const monthNumber = +value.slice(1, 3);
  return { monthNumber, isLeapMonth };
}

export function CreateMonthCode(monthNumber: number, isLeapMonth: boolean) {
  const numberPart = `${monthNumber}`.padStart(2, '0');
  return isLeapMonth ? `M${numberPart}L` : `M${numberPart}`;
}
