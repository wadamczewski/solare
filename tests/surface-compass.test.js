import test from 'node:test';
import assert from 'node:assert/strict';
import {relativeBearing, sphericalToRadar} from '../src/surface-compass.js';

test('relativeBearing is zero when a bearing matches the observer heading', () => {
 assert.equal(relativeBearing(90, 90), 0);
});

test('relativeBearing wraps across the 0/360 seam the short way', () => {
 assert.equal(relativeBearing(1, 359), 2);
 assert.equal(relativeBearing(359, 1), -2);
});

test('sphericalToRadar places dead ahead, at the horizon, on the +Z axis facing the camera', () => {
 const point = sphericalToRadar(0, 0, 1);
 assert.ok(Math.abs(point.x) < 1e-9);
 assert.ok(Math.abs(point.y) < 1e-9);
 assert.equal(Math.round(point.z * 1e6) / 1e6, 1);
});

test('sphericalToRadar places the zenith straight up regardless of bearing', () => {
 const point = sphericalToRadar(137, 90, 1);
 assert.ok(Math.abs(point.x) < 1e-9);
 assert.equal(Math.round(point.y * 1e6) / 1e6, 1);
 assert.ok(Math.abs(point.z) < 1e-9);
});

test('sphericalToRadar sweeps a body to the right of the sphere as the observer turns toward it', () => {
 const point = sphericalToRadar(90, 0, 1);
 assert.equal(Math.round(point.x * 1e6) / 1e6, 1);
 assert.ok(Math.abs(point.z) < 1e-9);
});

test('sphericalToRadar scales with the given radius', () => {
 const unit = sphericalToRadar(30, 20, 1), scaled = sphericalToRadar(30, 20, 2.5);
 assert.equal(Math.round(scaled.x * 1e6) / 1e6, Math.round(unit.x * 2.5 * 1e6) / 1e6);
 assert.equal(Math.round(scaled.y * 1e6) / 1e6, Math.round(unit.y * 2.5 * 1e6) / 1e6);
 assert.equal(Math.round(scaled.z * 1e6) / 1e6, Math.round(unit.z * 2.5 * 1e6) / 1e6);
});

test('sphericalToRadar always lands on the sphere of the given radius', () => {
 for (const [az, alt] of [[0, 0], [45, 30], [180, -10], [270, 89], [15, -89]]) {
  const point = sphericalToRadar(az, alt, 3);
  const length = Math.hypot(point.x, point.y, point.z);
  assert.ok(Math.abs(length - 3) < 1e-9, `(${az},${alt}) landed at radius ${length}, expected 3`);
 }
});
