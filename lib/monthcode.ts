import { ToPrimitiveRequireString } from './primitive';

const digitsForMonthNumber = Array.from({ length: 100 }, (_, i) => (i < 10 ? `0${i}` : `${i}`));

export function ParseMonthCode(argument: unknown) {
  const value = ToPrimitiveRequireString(argument);
  const digits = value.slice(1, 3);
  const monthNumber = digits.length === 2 ? +digits : -1; // -1 ensures failure
  const isLeapMonth = value.length === 4;
  if (
    !(monthNumber >= 0) ||
    digits !== digitsForMonthNumber[monthNumber] ||
    value[0] !== 'M' ||
    (isLeapMonth ? value[3] !== 'L' : value.length !== 3 || monthNumber === 0)
  ) {
    throw new RangeError(`bad month code ${value}; must match M01-M99 or M00L-M99L`);
  }
  return { monthNumber, isLeapMonth };
}

export function CreateMonthCode(monthNumber: number, isLeapMonth: boolean) {
  const numberPart = `${monthNumber}`.padStart(2, '0');
  return isLeapMonth ? `M${numberPart}L` : `M${numberPart}`;
}
