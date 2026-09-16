import test from 'node:test';
import assert from 'node:assert/strict';
import {projectedPoint, ringPixelRadius, deepSkyRingPixelRadius} from '../src/sky-labels.js';

test('projectedPoint maps clip space to pixel coordinates, centre and corners', () => {
 assert.deepEqual(projectedPoint(0, 0, 0, 1000, 800), {x: 500, y: 400, visible: true});
 const topLeft = projectedPoint(-1, 1, 0, 1000, 800);
 assert.equal(topLeft.x, 0);
 assert.equal(topLeft.y, 0);
 assert.ok(topLeft.visible);
});

test('projectedPoint hides a point behind the camera', () => {
 assert.equal(projectedPoint(0, 0, -1.5, 1000, 800).visible, false);
 assert.equal(projectedPoint(0, 0, 1.5, 1000, 800).visible, false);
});

test('projectedPoint hides a point well outside the frame but keeps one just past the edge', () => {
 assert.equal(projectedPoint(3, 0, 0, 1000, 800).visible, false);
 assert.ok(projectedPoint(1.05, 0, 0, 1000, 800).visible, 'a point just past the clip edge should stay attached while dragging across it');
 assert.equal(projectedPoint(1.2, 0, 0, 1000, 800).visible, false);
});

test('ringPixelRadius grows with apparent size and shrinks with distance, within the clamps', () => {
 const near = ringPixelRadius(1, 5, 60, 800), far = ringPixelRadius(1, 20, 60, 800);
 assert.ok(near > 9 && near < 140 && far > 9 && far < 140, 'both cases should land strictly between the clamps to be a meaningful comparison');
 assert.ok(near > far, 'a closer object of the same radius should draw a bigger ring');
 const bigger = ringPixelRadius(2, 20, 60, 800);
 assert.ok(bigger > far, 'a larger radius at the same distance should draw a bigger ring');
});

test('ringPixelRadius clamps a physically point-sized object (a true-scale planet, say) to the minimum ring size', () => {
 assert.equal(ringPixelRadius(0.0001, 50, 60, 800), 9);
});

test('ringPixelRadius clamps a huge or very close object to the maximum ring size', () => {
 assert.equal(ringPixelRadius(5, 1, 60, 800), 140);
});

test('ringPixelRadius falls back to the minimum ring size (not zero, NaN or negative) for a degenerate zero or negative distance', () => {
 assert.equal(ringPixelRadius(1, 0, 60, 800), 9);
 assert.equal(ringPixelRadius(1, -5, 60, 800), 9);
});

test('deepSkyRingPixelRadius clamps a point-like object to the minimum ring size', () => {
 assert.equal(deepSkyRingPixelRadius(0, 60, 800), 9);
 assert.equal(deepSkyRingPixelRadius(0.001, 60, 800), 9);
});

test('deepSkyRingPixelRadius clamps a huge object to the maximum ring size', () => {
 assert.equal(deepSkyRingPixelRadius(600, 30, 800), 120);
});

test('deepSkyRingPixelRadius scales between the clamps with angular size', () => {
 const small = deepSkyRingPixelRadius(200, 60, 800), large = deepSkyRingPixelRadius(800, 60, 800);
 assert.ok(small > 9 && small < 120, 'the small case should land strictly between the clamps to be a meaningful comparison');
 assert.ok(large > small);
});
