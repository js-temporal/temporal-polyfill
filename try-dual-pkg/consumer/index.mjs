/* eslint-disable */

import { Temporal } from '@js-temporal/polyfill';
import { createCurrentZDT, getDurationInHours } from 'lib-esm';
import { createZDT } from 'lib-cjs';

const zdtA = createZDT(2022, 1, 1);
const zdtB = Temporal.ZonedDateTime.from({
  timeZone: 'Asia/Tokyo',
  year: 2022,
  month: 1,
  day: 3,
  hour: 10
});
const zdtC = createCurrentZDT();
const zdtD = createZDT(2022, 1, 2);

console.log(getDurationInHours(zdtA, zdtB)); // This will throw TypeError: invalid result
// console.log(getDurationInHours(zdtB, zdtC)); // This will not throw because both are esm
// console.log(getDurationInHours(zdtA, zdtD)); // This will not throw because both are cjs
