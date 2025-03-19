// Ambient declaration file to bridge the gap until Intl.DurationFormat is
// supported in TypeScript's own type declarations. Note that it is for internal
// use, meaning that it describes the DurationFormat interface _without_ support
// for Temporal.Duration objects.

declare namespace Intl {
  type DurationCalendarUnitStyle = 'long' | 'short' | 'narrow';
  type DurationDigitalUnitStyle = 'long' | 'short' | 'narrow' | 'numeric' | '2-digit';
  type DurationFractionalUnitStyle = 'long' | 'short' | 'narrow' | 'numeric';
  type DurationDisplay = 'auto' | 'always';

  interface DurationFormatOptions {
    localeMatcher?: 'best fit' | 'basic' | undefined;
    numberingSystem?: string | undefined;
    style?: 'long' | 'short' | 'narrow' | 'digital' | undefined;
    years?: DurationCalendarUnitStyle | undefined;
    yearsDisplay?: DurationDisplay | undefined;
    months?: DurationCalendarUnitStyle | undefined;
    monthsDisplay?: DurationDisplay | undefined;
    weeks?: DurationCalendarUnitStyle | undefined;
    weeksDisplay?: DurationDisplay | undefined;
    days?: DurationCalendarUnitStyle | undefined;
    daysDisplay?: DurationDisplay | undefined;
    hours?: DurationDigitalUnitStyle | undefined;
    hoursDisplay?: DurationDisplay | undefined;
    minutes?: DurationDigitalUnitStyle | undefined;
    minutesDisplay?: DurationDisplay | undefined;
    seconds?: DurationDigitalUnitStyle | undefined;
    secondsDisplay?: DurationDisplay | undefined;
    milliseconds?: DurationFractionalUnitStyle | undefined;
    millisecondsDisplay?: DurationDisplay | undefined;
    microseconds?: DurationFractionalUnitStyle | undefined;
    microsecondsDisplay?: DurationDisplay | undefined;
    nanoseconds?: DurationFractionalUnitStyle | undefined;
    nanosecondsDisplay?: DurationDisplay | undefined;
    fractionalDigits?: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | undefined;
  }

  interface ResolvedDurationFormatOptions {
    locale: string;
    numberingSystem: string;
    style: 'long' | 'short' | 'narrow' | 'digital';
    years: DurationCalendarUnitStyle;
    yearsDisplay: DurationDisplay;
    months: DurationCalendarUnitStyle;
    monthsDisplay: DurationDisplay;
    weeks: DurationCalendarUnitStyle;
    weeksDisplay: DurationDisplay;
    days: DurationCalendarUnitStyle;
    daysDisplay: DurationDisplay;
    hours: DurationDigitalUnitStyle;
    hoursDisplay: DurationDisplay;
    minutes: DurationDigitalUnitStyle;
    minutesDisplay: DurationDisplay;
    seconds: DurationDigitalUnitStyle;
    secondsDisplay: DurationDisplay;
    milliseconds: DurationFractionalUnitStyle;
    millisecondsDisplay: DurationDisplay;
    microseconds: DurationFractionalUnitStyle;
    microsecondsDisplay: DurationDisplay;
    nanoseconds: DurationFractionalUnitStyle;
    nanosecondsDisplay: DurationDisplay;
    fractionalDigits: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | undefined;
  }

  interface DurationLike {
    years?: number;
    months?: number;
    weeks?: number;
    days?: number;
    hours?: number;
    minutes?: number;
    seconds?: number;
    milliseconds?: number;
    microseconds?: number;
    nanoseconds?: number;
  }

  interface DurationFormatPart {
    type: string;
    value: string;
  }

  class DurationFormat {
    constructor(locales?: LocalesArgument, options?: DurationFormatOptions);

    static supportedLocalesOf(locales?: LocalesArgument, options?: DurationFormatOptions): LocalesArgument;

    format(duration: DurationLike | string): string;
    formatToParts(duration: DurationLike | string): DurationFormatPart[];
    resolvedOptions(): ResolvedDurationFormatOptions;
  }
}
