import test from 'node:test';
import assert from 'node:assert/strict';
import {surfaceDetailProfile, surfaceReliefClearance} from '../src/surface-detail.js';
import {shapeGeometry} from '../src/scene-lod.js';

test('surface detail retains a far denser mesh than the ordinary high LOD', () => {
 assert.ok(shapeGeometry('surface').attributes.position.count > shapeGeometry('high').attributes.position.count * 10);
});

test('rocky surface profiles retain stronger relief than cloud tops', () => {
 const earth = surfaceDetailProfile({key: 'earth', name: 'Earth'});
 const jupiter = surfaceDetailProfile({key: 'jupiter', name: 'Jupiter', gas: true});
 assert.ok(earth.relief > jupiter.relief * 10);
 assert.ok(surfaceReliefClearance({key: 'mars', name: 'Mars'}) > .005);
});

test('mapped worlds expose a nonzero physical relief profile', () => {
 const mars = surfaceDetailProfile({key: 'mars', name: 'Mars'});
 const moon = surfaceDetailProfile({key: 'moon', name: 'Moon'});
 assert.ok(mars.relief > 0);
 assert.ok(moon.relief > mars.relief * .8);
});
