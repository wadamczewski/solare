import test from 'node:test';
import assert from 'node:assert/strict';
import {KNOWN_PLACES, knownPlacesFor} from '../src/surface-places.js';
import {moons, planets} from '../src/physics.js';
import {rotatingBodies} from '../src/surface-frame.js';

const SURFACE_EXCLUDED = new Set(['Hyperion']);

test('every planet with tabulated surface rotation has at least one known place', () => {
 const tabulated = new Set(rotatingBodies());
 for (const [, key] of planets) {
  if (key === 'sun' || !tabulated.has(key)) continue;
  assert.ok(KNOWN_PLACES[key]?.length > 0, `expected at least one known place for ${key}`);
 }
});

test('every moon (except the tumbling exclusion) has at least one known place, looked up by name', () => {
 for (const [name] of moons) {
  if (SURFACE_EXCLUDED.has(name)) continue;
  assert.ok(KNOWN_PLACES[name]?.length > 0, `expected at least one known place for ${name}`);
  assert.deepEqual(knownPlacesFor({key: 'moon', name}), KNOWN_PLACES[name]);
 }
});

test('knownPlacesFor distinguishes moons sharing the runtime key "moon" by name, not key', () => {
 assert.notDeepEqual(knownPlacesFor({key: 'moon', name: 'Io'}), knownPlacesFor({key: 'moon', name: 'Księżyc'}));
 assert.deepEqual(knownPlacesFor({key: 'moon', name: 'Nieznany satelita'}), []);
});

test('knownPlacesFor looks planets up by key', () => {
 assert.deepEqual(knownPlacesFor({key: 'mars'}), KNOWN_PLACES.mars);
 assert.deepEqual(knownPlacesFor({key: 'not-a-body'}), []);
});

test('knownPlacesFor tolerates a missing body', () => {
 assert.deepEqual(knownPlacesFor(null), []);
 assert.deepEqual(knownPlacesFor(undefined), []);
});

test('every coordinate is a valid planetocentric latitude/longitude', () => {
 for (const places of Object.values(KNOWN_PLACES)) {
  for (const place of places) {
   assert.ok(typeof place.name === 'string' && place.name.length > 0);
   assert.ok(place.latitude >= -90 && place.latitude <= 90, `${place.name}: latitude ${place.latitude} out of range`);
   assert.ok(place.longitude >= -180 && place.longitude <= 180, `${place.name}: longitude ${place.longitude} out of range`);
  }
 }
});

test('no body lists the same place name twice', () => {
 for (const [key, places] of Object.entries(KNOWN_PLACES)) {
  const names = places.map(p => p.name);
  assert.equal(new Set(names).size, names.length, `${key} repeats a place name`);
 }
});
