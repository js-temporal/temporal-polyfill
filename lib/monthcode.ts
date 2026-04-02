import { ToPrimitiveRequireString } from './primitive';
import { monthCode as MONTH_CODE_REGEX } from './regex';

export function ParseMonthCode(argument: unknown) {
  const value = ToPrimitiveRequireString(argument);
  const match = MONTH_CODE_REGEX.exec(value);
  if (!match) throw new RangeError(`bad month code ${value}; must match M01-M99 or M00L-M99L`);
  return {
    monthNumber: +(match[1] ?? match[3] ?? match[5]),
    isLeapMonth: (match[2] ?? match[4] ?? match[6]) === 'L'
  };
}

export function CreateMonthCode(monthNumber: number, isLeapMonth: boolean) {
  const numberPart = `${monthNumber}`.padStart(2, '0');
  return isLeapMonth ? `M${numberPart}L` : `M${numberPart}`;
}
