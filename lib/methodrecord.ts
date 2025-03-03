import { GetIntrinsic } from './intrinsicclass';
import { CALENDAR, GetSlot } from './slots';
import type { Temporal } from '..';
import type { BuiltinCalendarId, CalendarParams } from './internaltypes';
import type { TimeZonePrototypeKeys } from './intrinsicclass';

// Not all calendar protocol methods need to be able to be cached
type CalendarRecordMethodNames =
  | 'dateAdd'
  | 'dateFromFields'
  | 'dateUntil'
  | 'day'
  | 'fields'
  | 'mergeFields'
  | 'monthDayFromFields'
  | 'yearMonthFromFields';

type CalendarRecordInfo = {
  Name: 'Calendar';
  Protocol: Temporal.CalendarProtocol;
  MethodName: CalendarRecordMethodNames;
  IDType: BuiltinCalendarId;
};

type TimeZoneRecordInfo = {
  Name: 'TimeZone';
  Protocol: Temporal.TimeZoneProtocol;
  MethodName: TimeZonePrototypeKeys;
  IDType: string;
};

// We switch off type checking when accessing the cached methods on this object.
// It could be expressed properly in the type system, but we're just going to
// remove this object later down the line in the rebase, so I'm not going to
// spend a lot of effort on it.
class MethodRecord<T extends TimeZoneRecordInfo | CalendarRecordInfo> {
  recordType: T['Name'];
  receiver: T['IDType'] | T['Protocol'];

  constructor(recordType: T['Name'], receiver: string | T['Protocol'], methodNames: T['MethodName'][]) {
    this.recordType = recordType;
    this.receiver = receiver;

    const nMethods = methodNames.length;
    for (let ix = 0; ix < nMethods; ix++) {
      this.lookup(methodNames[ix]);
    }
  }

  isBuiltIn() {
    return typeof this.receiver === 'string';
  }

  hasLookedUp(methodName: T['MethodName']) {
    // @ts-expect-error
    return !!this[`_${methodName}`];
  }

  lookup(methodName: T['MethodName']) {
    if (this.hasLookedUp(methodName)) {
      throw new Error(`assertion failure: ${methodName} already looked up`);
    }
    if (typeof this.receiver === 'string') {
      // @ts-expect-error
      this[`_${methodName}`] = GetIntrinsic(`%Temporal.${this.recordType}.prototype.${methodName}%`);
    } else {
      // This is not expressed correctly in TypeScript; we should be able to
      // express in the type system that T['MethodName'] can be used to index
      // T['Protocol'], and use one of the GetMethod overloads. But as above,
      // we're just going to remove this object later down the line in the
      // rebase, so it's not worth spending the time.
      // @ts-expect-error
      const method = this.receiver[methodName];
      if (!method) {
        throw new TypeError(`${methodName} should be present on ${this.recordType}`);
      }
      if (typeof method !== 'function') {
        throw new TypeError(`${methodName} must be a function`);
      }
      // @ts-expect-error
      this[`_${methodName}`] = method;
    }
  }

  call(methodName: T['MethodName'], args: any[]) {
    if (!this.hasLookedUp(methodName)) {
      throw new Error(`assertion failure: ${methodName} should have been looked up`);
    }
    let receiver = this.receiver;
    if (typeof receiver === 'string') {
      const cls = GetIntrinsic(`%Temporal.${this.recordType}%`);
      const realObject = new cls(receiver);
      // @ts-expect-error
      return this[`_${methodName}`].apply(realObject, args);
    }
    // @ts-expect-error
    return this[`_${methodName}`].apply(receiver, args);
  }
}

export class TimeZoneMethodRecord extends MethodRecord<TimeZoneRecordInfo> {
  constructor(timeZone: string | Temporal.TimeZoneProtocol, methodNames: TimeZonePrototypeKeys[] = []) {
    super('TimeZone', timeZone, methodNames);
  }

  getOffsetNanosecondsFor(instant: Temporal.Instant) {
    return this.call('getOffsetNanosecondsFor', [instant]);
  }

  getPossibleInstantsFor(dateTime: Temporal.PlainDateTime) {
    return this.call('getPossibleInstantsFor', [dateTime]);
  }
}

export class CalendarMethodRecord extends MethodRecord<CalendarRecordInfo> {
  constructor(calendar: string | Temporal.CalendarProtocol, methodNames: CalendarRecordMethodNames[] = []) {
    super('Calendar', calendar, methodNames);
  }

  static CreateFromRelativeTo(
    plainRelativeTo: Temporal.PlainDate | undefined,
    zonedRelativeTo: Temporal.ZonedDateTime | undefined,
    methodNames: CalendarRecordMethodNames[] = []
  ) {
    const relativeTo = zonedRelativeTo ?? plainRelativeTo;
    if (!relativeTo) return undefined;
    return new this(GetSlot(relativeTo, CALENDAR), methodNames);
  }

  dateAdd(date: Temporal.PlainDate, duration: Temporal.Duration, options: Temporal.ArithmeticOptions | undefined) {
    return this.call('dateAdd', [date, duration, options]);
  }

  dateFromFields(fields: CalendarParams['dateFromFields'][0], options: Temporal.AssignmentOptions | undefined) {
    return this.call('dateFromFields', [fields, options]);
  }

  dateUntil(
    one: Temporal.PlainDate,
    two: Temporal.PlainDate,
    options: Temporal.DifferenceOptions<'year' | 'month' | 'week' | 'day'> | undefined
  ) {
    return this.call('dateUntil', [one, two, options]);
  }

  day(date: Temporal.PlainDate | Temporal.PlainDateTime | Temporal.PlainMonthDay) {
    return this.call('day', [date]);
  }

  fields(fieldNames: Iterable<string>) {
    return this.call('fields', [fieldNames]);
  }

  mergeFields(fields: Record<string, any>, additionalFields: Record<string, any>) {
    return this.call('mergeFields', [fields, additionalFields]);
  }

  monthDayFromFields(fields: CalendarParams['monthDayFromFields'][0], options: Temporal.AssignmentOptions | undefined) {
    return this.call('monthDayFromFields', [fields, options]);
  }

  yearMonthFromFields(
    fields: CalendarParams['yearMonthFromFields'][0],
    options: Temporal.AssignmentOptions | undefined
  ) {
    return this.call('yearMonthFromFields', [fields, options]);
  }
}
