import test from 'node:test';
import assert from 'node:assert/strict';
import {surfaceAtmosphere} from '../src/surface-atmosphere.js';

test('Earth has a blue daylight atmosphere and stars fade out', () => {
 const state=surfaceAtmosphere('earth',45);
 assert.equal(state.phase,'day');
 assert.equal(state.color,'#6fb6ea');
 assert.equal(state.stars,0);
});

test('airless Moon keeps the natural sky at every solar altitude', () => {
 assert.equal(surfaceAtmosphere('moon',25).opacity,0);
 assert.equal(surfaceAtmosphere('moon',-20).stars,1);
});

test('twilight is limited to the civil-to-nautical transition', () => {
 assert.equal(surfaceAtmosphere('mars',-6).phase,'twilight');
 assert.equal(surfaceAtmosphere('mars',-16).phase,'night');
});


test('the Earth atmosphere can be disabled without changing the daylight state', () => {
 const state=surfaceAtmosphere('earth',45,false);
 assert.equal(state.phase,'day');
 assert.equal(state.opacity,0);
 assert.equal(state.stars,1);
 assert.equal(state.clouds,0);
});


test('Earth clouds and stars cross-fade through twilight', () => {
 const dusk=surfaceAtmosphere('earth',-6);
 const noon=surfaceAtmosphere('earth',45);
 const night=surfaceAtmosphere('earth',-18);
 assert.ok(dusk.clouds>0&&dusk.clouds<1);
 assert.ok(dusk.stars>0&&dusk.stars<1);
 assert.equal(noon.clouds,1);
 assert.equal(night.clouds,0);
 assert.equal(night.stars,1);
});
