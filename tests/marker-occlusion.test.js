import test from 'node:test';
import assert from 'node:assert/strict';
import {findOccluder, isOccluded} from '../src/marker-occlusion.js';

test('a body directly behind a nearer, wide-enough disc is occluded', () => {
 const observer = [0, 0, 0], target = [0, 0, 10];
 const blocker = {id: 'planet', position: [0, 0, 5], radius: 2};
 assert.equal(findOccluder(observer, target, 'moon', [blocker]), blocker);
 assert.ok(isOccluded(observer, target, 'moon', [blocker]));
});

test('a body off to the side of the blocker is not occluded', () => {
 const observer = [0, 0, 0], target = [5, 0, 10];
 const blocker = {id: 'planet', position: [0, 0, 5], radius: 1};
 assert.equal(findOccluder(observer, target, 'moon', [blocker]), null);
});

test('a candidate farther away than the target cannot occlude it', () => {
 const observer = [0, 0, 0], target = [0, 0, 5];
 const farBlocker = {id: 'planet', position: [0, 0, 10], radius: 2};
 assert.equal(findOccluder(observer, target, 'moon', [farBlocker]), null);
});

test('a body never occludes its own marker', () => {
 const observer = [0, 0, 0], target = [0, 0, 5];
 const self = {id: 'moon', position: [0, 0, 5], radius: 1};
 assert.equal(findOccluder(observer, target, 'moon', [self]), null);
});

test('the observer standing inside a candidate is never blocked by it', () => {
 const observer = [0, 0, 0], target = [0, 0, 10];
 const enclosing = {id: 'planet', position: [0, 0, 0.1], radius: 5};
 assert.equal(findOccluder(observer, target, 'moon', [enclosing]), null);
});

test('a narrow, distant body does not block something only slightly off its line', () => {
 const observer = [0, 0, 0], target = [1, 0, 10];
 const thin = {id: 'asteroid', position: [0, 0, 9], radius: 0.05};
 assert.equal(findOccluder(observer, target, 'moon', [thin]), null);
});

test('with several candidates in the way, the nearest one wins', () => {
 const observer = [0, 0, 0], target = [0, 0, 20];
 const near = {id: 'near', position: [0, 0, 4], radius: 1};
 const far = {id: 'far', position: [0, 0, 12], radius: 3};
 assert.equal(findOccluder(observer, target, 'moon', [far, near]), near);
});

test('a planet occludes its own moon when the moon sits behind it (the reported case)', () => {
 // Saturn between the observer and one of its own moons, roughly to scale.
 const observer = [0, 0, 0];
 const saturn = {id: 'saturn', position: [0, 0, 9.5], radius: 0.0004}; // ~58 000 km in AU
 const titan = [0, 0, 9.5 + 0.0082]; // Titan's orbital radius, same line of sight
 assert.equal(findOccluder(observer, titan, 'titan', [saturn]), saturn);
});
