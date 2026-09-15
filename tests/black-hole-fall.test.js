import test from 'node:test';
import assert from 'node:assert/strict';
import {BLACK_HOLE_FALL_DURATION,BLACK_HOLE_INTERIOR_DURATION,blackHoleFallState,schwarzschildRadiusKm} from '../src/black-hole-fall.js';

test('fall crosses the Schwarzschild horizon in finite observer proper time',()=>{
 const before=blackHoleFallState(BLACK_HOLE_FALL_DURATION-.01,4e6),at=blackHoleFallState(BLACK_HOLE_FALL_DURATION,4e6);
 assert.ok(before.outside);assert.ok(!at.outside);assert.ok(before.radiusRs>1);assert.ok(at.radiusRs<=1);assert.ok(at.horizonKm>1e6);
});
test('the exterior aperture contracts only after the horizon and never turns negative',()=>{
 const outside=blackHoleFallState(12,21),inside=blackHoleFallState(BLACK_HOLE_FALL_DURATION+BLACK_HOLE_INTERIOR_DURATION/2,21),late=blackHoleFallState(999,21);
 assert.equal(outside.cosmicAperture,1);assert.ok(inside.cosmicAperture>late.cosmicAperture);assert.ok(late.cosmicAperture>0);
});
test('the horizon tidal gradient is gentler for a supermassive black hole',()=>{
 const stellar=blackHoleFallState(BLACK_HOLE_FALL_DURATION,21),supermassive=blackHoleFallState(BLACK_HOLE_FALL_DURATION,4e6);
 assert.ok(stellar.tidalRelative>supermassive.tidalRelative);assert.ok(Math.abs(schwarzschildRadiusKm(1)-2.95325008)<1e-6);
});
