import { describe, expect, it } from '@jest/globals';
import { PlainDate, Duration } from '../lib/temporal';

describe('calendar-unit rounding start bound', () => {
  it('ceil does not expand an exact month-boundary difference', () => {
    const result = PlainDate.from('2020-01-15').until('2021-01-15', {
      largestUnit: 'year',
      smallestUnit: 'month',
      roundingMode: 'ceil'
    });
    expect(result.toString()).toBe('P1Y');
  });

  it('floor does not expand an exact negative month-boundary difference', () => {
    const result = PlainDate.from('2021-01-15').until('2020-01-15', {
      largestUnit: 'year',
      smallestUnit: 'month',
      roundingMode: 'floor'
    });
    expect(result.toString()).toBe('-P1Y');
  });

  it('rounding an exact one-year duration to months does not add a month', () => {
    const result = Duration.from({ years: 1 }).round({
      largestUnit: 'year',
      smallestUnit: 'month',
      roundingMode: 'ceil',
      relativeTo: PlainDate.from('2020-01-15')
    });
    expect(result.toString()).toBe('P1Y');
  });
});
