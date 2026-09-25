import test from 'node:test';
import assert from 'node:assert/strict';
import {auRadius,maxViewDistance,satelliteOffset,scaleRatio,sceneRadius} from '../src/scene-scale.js';

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

test('satelliteOffset always clears the host and grows sub-linearly with real distance', () => {
 const hostRadius = .57; // roughly Saturn's own compressed drawn radius
 assert.ok(satelliteOffset(hostRadius, 0) > hostRadius, 'even a zero-distance satellite must clear the host it orbits');
 // A ring shepherd (a few hundred thousand km) and an irregular moon (tens
 // of millions of km) differ in real distance by more than a thousandfold;
 // the compressed offset must still separate them without either collapsing
 // onto the host or growing anywhere near proportionally.
 const shepherd = satelliteOffset(hostRadius, 133600 / 149597870.7);
 const irregular = satelliteOffset(hostRadius, 20e6 / 149597870.7);
 assert.ok(irregular > shepherd, 'a farther satellite must still map to a farther offset');
 assert.ok(irregular / shepherd < 20, `compression should keep the offset ratio ${irregular / shepherd} far below the real distance ratio`);
});

test('satelliteOffset is monotonically increasing in the real distance', () => {
 let previous = -Infinity;
 for (const auOffset of [0, 1e-6, 1e-4, 1e-2, .05, .2]) {
  const offset = satelliteOffset(.57, auOffset);
  assert.ok(offset > previous, `offset must increase with real distance at ${auOffset} AU`);
  previous = offset;
 }
});
