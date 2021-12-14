#! /usr/bin/env -S node --experimental-modules
/* eslint-disable no-import-assign */

import Demitasse from '@pipobscure/demitasse';
const { describe, it, report } = Demitasse;

import Pretty from '@pipobscure/demitasse-pretty';
const { reporter } = Pretty;

import { strict as assert } from 'assert';
const { equal } = assert;

import * as Temporal from '@js-temporal/polyfill';
const { PlainDate } = Temporal;

describe('Monkeypatch', () => {
  describe('PlainDate', () => {
    it("Monkeypatching Duration constructor doesn't affect PlainDate", () => {
      Temporal.Duration.prototype.constructor = null;
      const date = PlainDate.from('2021-12-09');
      equal(`${date.until('2021-12-10')}`, 'P1D');
    });

    it("Monkeypatching Duration to be null doesn't affect PlainDate", () => {
      // @ts-ignore: we need to forcefully do stupid things here
      Temporal.Duration = null;
      const date = PlainDate.from('2021-12-09');
      equal(`${date.until('2021-12-10')}`, 'P1D');
    });

    it("delete Duration constructor doesn't affect PlainDate", () => {
      // @ts-ignore: we need to forcefully do stupid things here
      delete Temporal.Duration;
      const date = PlainDate.from('2021-12-09');
      equal(`${date.until('2021-12-10')}`, 'P1D');
    });
  });
});

import { normalize } from 'path';
if (normalize(import.meta.url.slice(8)) === normalize(process.argv[1])) {
  report(reporter).then((failed) => process.exit(failed ? 1 : 0));
}
