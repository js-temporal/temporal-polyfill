const { Temporal } = require('@js-temporal/polyfill');

function createZDT(year, month, day) {
  return Temporal.ZonedDateTime.from({
    timeZone: 'Asia/Tokyo',
    year,
    month,
    day
  });
}

module.exports = { createZDT };
