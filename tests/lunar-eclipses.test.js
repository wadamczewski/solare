import test from 'node:test';
import assert from 'node:assert/strict';
import {LUNAR_ECLIPSES, lunarEclipseLeadMinutes} from '../src/lunar-eclipses.js';

test('every lunar eclipse has a valid date, a kind-consistent set of durations', () => {
 for (const item of LUNAR_ECLIPSES) {
  assert.ok(item.id && /^lunar-\d{4}-\d{2}-\d{2}$/.test(item.id), `${item.id} should look like lunar-YYYY-MM-DD`);
  assert.ok(item.name.length > 0);
  assert.ok(Number.isFinite(Date.parse(item.greatest)), `${item.greatest} should be a valid date`);
  assert.ok(item.penumbralSeconds > 0, 'every lunar eclipse has a penumbral phase');
  if (item.kind === 'total') assert.ok(item.totalitySeconds > 0);
  else assert.equal(item.totalitySeconds, undefined, `a ${item.kind} eclipse should not carry a totality duration`);
  if (item.kind === 'penumbral') assert.equal(item.partialSeconds, undefined, 'a penumbral eclipse never reaches the umbra');
  else assert.ok(item.partialSeconds > 0);
 }
});

test('the phases nest: totality is inside the partial phase, which is inside the penumbral one', () => {
 for (const item of LUNAR_ECLIPSES) {
  if (item.totalitySeconds) assert.ok(item.totalitySeconds < item.partialSeconds);
  if (item.partialSeconds) assert.ok(item.partialSeconds < item.penumbralSeconds);
 }
});

test('the ids are unique and the list is in chronological order', () => {
 assert.equal(new Set(LUNAR_ECLIPSES.map(item => item.id)).size, LUNAR_ECLIPSES.length);
 const dates = LUNAR_ECLIPSES.map(item => Date.parse(item.greatest));
 assert.deepEqual(dates, [...dates].sort((a, b) => a - b));
});

test('all three eclipse kinds are represented', () => {
 const kinds = new Set(LUNAR_ECLIPSES.map(item => item.kind));
 assert.deepEqual(kinds, new Set(['total', 'partial', 'penumbral']));
});

test('lunarEclipseLeadMinutes is half the penumbral duration, in minutes', () => {
 const total = LUNAR_ECLIPSES.find(item => item.id === 'lunar-2022-11-08');
 assert.equal(lunarEclipseLeadMinutes(total), 21231 / 2 / 60);
 const penumbral = LUNAR_ECLIPSES.find(item => item.kind === 'penumbral');
 assert.ok(lunarEclipseLeadMinutes(penumbral) > 0 && lunarEclipseLeadMinutes(penumbral) < penumbral.penumbralSeconds / 60);
});
