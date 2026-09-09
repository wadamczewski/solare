import test from 'node:test';
import assert from 'node:assert/strict';
import {auRadius,maxViewDistance,scaleRatio,sceneRadius} from '../src/scene-scale.js';

test('both mappings are invertible', () => {
 for (const compressed of [true, false])
  for (const au of [.39, 1, 5.2, 30]) {
   const scene = sceneRadius(au, compressed);
   assert.ok(Math.abs(auRadius(scene, compressed) - au) < 1e-9, `${au} at compressed=${compressed}`);
  }
});

test('true scale is linear and readable scale compresses the outer system', () => {
 assert.equal(sceneRadius(1, false), 6);
 assert.equal(sceneRadius(30, false), 180);
 // Neptune sits 30x farther out than Earth but only about 7x farther on screen.
 const spread = sceneRadius(30, true) / sceneRadius(1, true);
 assert.ok(spread > 6 && spread < 8, String(spread));
});

test('switching to true scale pushes the camera out, and back in again', () => {
 // Earth's orbit grows slightly; Neptune's grows about sevenfold.
 const near = scaleRatio(sceneRadius(1, true), true, false);
 const far = scaleRatio(sceneRadius(30, true), true, false);
 assert.ok(near > 1 && far > near);
 assert.ok(far > 6 && far < 8);
 // The reverse trip returns the camera to where it started.
 const out = sceneRadius(30, true) * far;
 assert.ok(Math.abs(out * scaleRatio(out, false, true) - sceneRadius(30, true)) < 1e-9);
});

test('scale ratio is a no-op for a camera sitting on the Sun or staying in one mode', () => {
 assert.equal(scaleRatio(0, true, false), 1);
 assert.equal(scaleRatio(42, true, true), 1);
});

test('the camera may travel far enough to frame the outer system in true scale', () => {
 assert.ok(maxViewDistance(false) > sceneRadius(30, false));
 assert.ok(maxViewDistance(true) > sceneRadius(30, true));
});
