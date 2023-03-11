import { GetIntrinsic } from './intrinsicclass';
import type { Temporal } from '..';
import type { TimeZonePrototypeKeys } from './intrinsicclass';

type TimeZoneRecordInfo = {
  Name: 'TimeZone';
  Protocol: Temporal.TimeZoneProtocol;
  MethodName: TimeZonePrototypeKeys;
};

// We switch off type checking when accessing the cached methods on this object.
// It could be expressed properly in the type system, but we're just going to
// remove this object later down the line in the rebase, so I'm not going to
// spend a lot of effort on it.
class MethodRecord<T extends TimeZoneRecordInfo> {
  recordType: T['Name'];
  receiver: string | T['Protocol'];

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
