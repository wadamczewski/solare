import test from 'node:test';
import assert from 'node:assert/strict';
import {earthObserverCoordinates,isEarthSurface} from '../src/surface-observer.js';

test('device geolocation uses the Earth horizon convention', () => {
 assert.deepEqual(earthObserverCoordinates({latitude: 52.2297, longitude: 21.0122, accuracy: 18}), {
  latitude: 52.2297, longitude: 21.0122, accuracy: 18
 });
 assert.deepEqual(earthObserverCoordinates({latitude: 94, longitude: 540, accuracy: -3}), {
  latitude: 90, longitude: -180, accuracy: 0
 });
 assert.equal(earthObserverCoordinates({latitude: 'north', longitude: 21}), null);
});

test('only the Earth surface enables device localisation', () => {
 assert.equal(isEarthSurface({key: 'earth'}), true);
 assert.equal(isEarthSurface({key: 'moon'}), false);
 assert.equal(isEarthSurface(null), false);
});
