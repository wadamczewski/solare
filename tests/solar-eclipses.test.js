import test from 'node:test';
import assert from 'node:assert/strict';
import {SOLAR_ECLIPSES, SOLAR_LEAD_MINUTES, formatEclipseDuration} from '../src/solar-eclipses.js';

test('every solar eclipse has a valid date, kind, positive duration and a real-looking location', () => {
 const kinds = new Set(['total', 'annular', 'hybrid']);
 for (const item of SOLAR_ECLIPSES) {
  assert.ok(item.id && /^solar-\d{4}-\d{2}-\d{2}$/.test(item.id), `${item.id} should look like solar-YYYY-MM-DD`);
  assert.ok(item.name.length > 0);
  assert.ok(kinds.has(item.kind), `${item.kind} should be a real eclipse kind`);
  assert.ok(Number.isFinite(Date.parse(item.greatest)), `${item.greatest} should be a valid date`);
  assert.ok(item.durationSeconds > 0 && item.durationSeconds < 60 * 15, 'no real eclipse has 15 minutes of totality/annularity');
  assert.ok(Math.abs(item.location.latitude) <= 90);
  assert.ok(Math.abs(item.location.longitude) <= 180);
  assert.ok(item.location.name.length > 0);
 }
});

test('the ids are unique and the list is in chronological order', () => {
 assert.equal(new Set(SOLAR_ECLIPSES.map(item => item.id)).size, SOLAR_ECLIPSES.length);
 const dates = SOLAR_ECLIPSES.map(item => Date.parse(item.greatest));
 assert.deepEqual(dates, [...dates].sort((a, b) => a - b));
});

test('the 2027 Luxor eclipse is the longest listed, matching its "eclipse of the century" reputation', () => {
 const luxor = SOLAR_ECLIPSES.find(item => item.id === 'solar-2027-08-02');
 assert.ok(luxor);
 assert.ok(SOLAR_ECLIPSES.every(item => item.durationSeconds <= luxor.durationSeconds));
});

test('SOLAR_LEAD_MINUTES gives a real head start, shorter than a typical eclipse\'s whole partial phase', () => {
 assert.ok(SOLAR_LEAD_MINUTES > 10 && SOLAR_LEAD_MINUTES < 120);
});

test('formatEclipseDuration matches the sources\' own phrasing', () => {
 assert.equal(formatEclipseDuration(268), '4 min 28 s');
 assert.equal(formatEclipseDuration(160), '2 min 40 s');
 assert.equal(formatEclipseDuration(76), '1 min 16 s');
 assert.equal(formatEclipseDuration(38), '38 s');
 assert.equal(formatEclipseDuration(0), null);
 assert.equal(formatEclipseDuration(-5), null);
});
