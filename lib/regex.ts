const offsetIdentifierNoCapture = /(?:[+-](?:[01][0-9]|2[0-3])(?::?[0-5][0-9])?)/;
const tzComponent = /[A-Za-z._][A-Za-z._0-9+-]*/;
export const timeZoneID = new RegExp(
  `(?:${offsetIdentifierNoCapture.source}|(?:${tzComponent.source})(?:\\/(?:${tzComponent.source}))*)`
);

const yearpart = /(?:[+-]\d{6}|\d{4})/;
const monthpart = /(?:0[1-9]|1[0-2])/;
const daypart = /(?:0[1-9]|[12]\d|3[01])/;
// COMPAT: Note spec polyfill uses duplicate named capture groups here
const datesplit = new RegExp(
  [
    `(?<yearpart>${yearpart.source})`,
    `(?:-(?<monthpartSep>${monthpart.source})-`,
    `(?<daypartSep>${daypart.source})|`,
    `(?<monthpartNoSep>${monthpart.source})(?<daypartNoSep>${daypart.source}))`
  ].join('')
);
const sep = /:/;
const hourminute = new RegExp(`(?<hour>\\d{2})(?:(?:${sep.source})?(?<minute>\\d{2}))?`);
const timesecond = new RegExp('(?<second>\\d{2})');
const fraction = new RegExp('(?:[.,](?<fraction>\\d{1,9}))');
const secondspart = new RegExp(`${sep.source}?(?:${timesecond.source})(?:${fraction.source})?`);
const timesplit = new RegExp(`(?:${hourminute.source})(?:${secondspart.source})?`);
const sign = /[+-]/;
const hour = /[01][0-9]|2[0-3]/;
const minute = /[0-5][0-9]/;
const second = minute;
const optionalMinSecWithSep = new RegExp(
  [
    `(?:${sep.source})(?<offsetMinuteSep>${minute.source})`,
    `(?:${sep.source}(?<offsetSecondSep>${second.source})(?:[.,](?<offsetSubsecondsSep>\\d{1,9})?)?)?`
  ].join('')
);
const optionalMinSecNoSep = new RegExp(
  [
    `(?<offsetMinuteNoSep>${minute.source})`,
    `(?<offsetSecondNoSep>${second.source}(?:[.,](?<offsetSubsecondsNoSep>\\d{1,9})?)?)?`
  ].join('')
);
const optionalMinSec = new RegExp(`(?:${optionalMinSecWithSep.source})|(?:${optionalMinSecNoSep.source})`);
export const offsetWithParts = new RegExp(
  `^(?<offsetSign>${sign.source})(?<offsetHour>${hour.source})(?:${optionalMinSec.source})?$`
);
export const offset = new RegExp(`(?<offset>(?:${sign.source})(?:${hour.source})(?:${optionalMinSec.source})?)`);
const offsetpart = new RegExp(`(?<z>[zZ])|${offset.source}?`);
export const offsetIdentifier = /([+-])([01][0-9]|2[0-3])(?::?([0-5][0-9])?)?/;
export const annotation = /\[(!)?([a-z_][a-z0-9_-]*)=([A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)\]/g;

export const zoneddatetime = new RegExp(
  [
    `^${datesplit.source}`,
    `(?:(?:[tT]|\\s+)${timesplit.source}(?:${offsetpart.source})?)?`,
    `(?:\\[!?(?<timeZoneID>${timeZoneID.source})\\])?`,
    `(?<annotation>(?:${annotation.source})*)$`
  ].join('')
);

export const time = new RegExp(
  [
    `^[tT]?${timesplit.source}`,
    `(?:${offsetpart.source})?`,
    `(?:\\[!?((?<timeZoneID>${timeZoneID.source}))\\])?`,
    `(?<annotation>(?:${annotation.source})*)$`
  ].join('')
);

// The short forms of YearMonth and MonthDay are only for the ISO calendar, but
// annotations are still allowed, and will throw if the calendar annotation is
// not ISO.
// Non-ISO calendar YearMonth and MonthDay have to parse as a Temporal.PlainDate,
// with the reference fields.
// YYYYMM forbidden by ISO 8601 because ambiguous with YYMMDD, but allowed by
// RFC 3339 and we don't allow 2-digit years, so we allow it.
// Not ambiguous with HHMMSS because that requires a 'T' prefix
// UTC offsets are not allowed, because they are not allowed with any date-only
// format; also, YYYY-MM-UU is ambiguous with YYYY-MM-DD
export const yearmonth = new RegExp(
  `^(${yearpart.source})-?(${monthpart.source})(?:\\[!?${timeZoneID.source}\\])?((?:${annotation.source})*)$`
);
export const monthday = new RegExp(
  `^(?:--)?(${monthpart.source})-?(${daypart.source})(?:\\[!?${timeZoneID.source}\\])?((?:${annotation.source})*)$`
);

const numberWithOptionalFraction = /(\d+)(?:[.,](\d{1,9}))?/;

const durationDate = /(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?/;
const durationTime = new RegExp(
  [
    `(?:${numberWithOptionalFraction.source}H)?`,
    `(?:${numberWithOptionalFraction.source}M)?`,
    `(?:${numberWithOptionalFraction.source}S)?`
  ].join('')
);
export const duration = new RegExp(`^([+-])?P${durationDate.source}(?:T(?!$)${durationTime.source})?$`, 'i');
