import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createImpactEffects, impactVisualProfile} from '../src/impact-effects.js';
import {collisionFocusTransfer, framingDistance} from '../src/collision-view.js';
import {scenarioContactNormal} from '../src/collision-scenarios.js';
import {resolveCollisions} from '../src/collisions.js';
import {AU, SOLAR_MASS, body} from '../src/physics.js';

// The effect layer sizes its point sprites in device pixels; nothing here draws.
globalThis.devicePixelRatio ??= 1;

test('a live effect keeps its shard mesh, and the profile count never overwrites it', () => {
 // The profile is spread over the effect record. A count field named `shards`
 // replaced the InstancedMesh, and the next frame threw inside the render loop,
 // which froze the picture for the whole duration of the effect.
 const profile = impactVisualProfile({kind: 'impact', surface: {targetSurvives: true}});
 assert.equal(typeof profile.shardCount, 'number');
 assert.ok(!('shards' in profile), 'the profile must not carry a key the effect record uses for its mesh');

 const scene = new THREE.Scene();
 const effects = createImpactEffects(scene);
 effects.add({kind: 'impact', surface: {targetSurvives: true}, energy: .4, normal: [0, 1, 0], p: [1, 0, 0], v: [0, 0, 0], survivor: 1},
  new THREE.Vector3(1, 0, 0), .2);
 // The update pass is what threw; it must survive several frames.
 for (let frame = 0; frame < 5; frame++) effects.update(1 / 60, p => new THREE.Vector3(...p), 0, () => null);
 effects.clear();
});

test('losing the followed body hands the camera to what survived the impact', () => {
 // A merge records the destroyed projectile as replaced by nothing; the viewer
 // was watching that impact, and the remnant is where it continues.
 const merge = {replacements: {7: null}, survivor: 3};
 assert.equal(collisionFocusTransfer(merge, 7), 3);
 // A body that was not in the collision keeps being followed.
 assert.equal(collisionFocusTransfer(merge, 9), 9);
 assert.equal(collisionFocusTransfer(merge, null), null);
 // Mutual destruction hands over to the largest fragment, or to nothing.
 assert.equal(collisionFocusTransfer({replacements: {7: 12, 8: 12}, survivor: null}, 8), 12);
 assert.equal(collisionFocusTransfer({replacements: {7: null}, survivor: null}, 7), null);
});

test('the camera pulls back far enough to frame what it inherited', () => {
 // Fraction of viewport height the body should span, independent of viewport size.
 const distance = framingDistance(.229, 43, .42);
 const spans = .229 * 2 / distance / (2 * Math.tan(43 * Math.PI / 360));
 assert.ok(Math.abs(spans - .42) < 1e-9, String(spans));
 // A larger body is framed from farther away; nonsense input yields no distance.
 assert.ok(framingDistance(1.02, 43) > framingDistance(.229, 43));
 assert.equal(framingDistance(0, 43), 0);
});

test('a scripted encounter reports the approach direction it was staged along', () => {
 const target = {id: 4}, projectile = {id: 7, collisionScenario: {targetId: 4, visualDirection: [2, 0, 0]}};
 // Normalised, and always running from the first argument to the second.
 const close = (got, want) => want.every((value, axis) => Math.abs(got[axis] - value) < 1e-12);
 assert.ok(close(scenarioContactNormal(target, projectile), [1, 0, 0]));
 assert.ok(close(scenarioContactNormal(projectile, target), [-1, 0, 0]));
 // Unrelated pairs, and pairs with no scenario, fall back to the physical vector.
 assert.equal(scenarioContactNormal(projectile, {id: 9}), null);
 assert.equal(scenarioContactNormal(target, {id: 9}), null);
});

test('a staged comet impact merges head-on instead of registering a graze first', () => {
 // Halley into Earth at 51.3 km/s. The rendered contact is scripted, so the
 // integrator has the pair far apart and pointing the wrong way; without the
 // staged normal the pair reads as a glancing blow and bounces before it hits.
 const speed = 51.3 * 86400 / AU;
 const earth = body({name: 'Ziemia', key: 'earth', mass: 5.972e24 / SOLAR_MASS, radius: 6371, p: [1, 0, 0], v: [0, .0172, 0]});
 const comet = body({name: '1P/Halley', key: 'comet', mass: 2.2e14 / SOLAR_MASS, radius: 5.5,
  p: [1.04, .002, -.001], v: [-speed, .0172, 0],
  collisionScenario: {targetId: earth.id, visualDirection: [1, 0, 0], launchElapsed: 0, minDurationDays: 32}});
 const bodies = [earth, comet];
 const events = resolveCollisions(bodies, {contactTest: () => true, contactNormal: scenarioContactNormal});
 assert.equal(events.length, 1);
 assert.equal(events[0].kind, 'impact', 'a comet striking a planet is an impact, not a graze');
 assert.equal(events[0].survivor, earth.id);
 assert.ok(bodies.includes(earth) && !bodies.includes(comet));
 // Earth is nine orders of magnitude short of being unbound by this, so it
 // keeps its radius and simply gains the comet.
 const earthBinding = events[0].binding.a.id === earth.id ? events[0].binding.a : events[0].binding.b;
 assert.ok(earthBinding.disruptionRatio < 1e-6, String(earthBinding.disruptionRatio));
 assert.ok(Math.abs(earth.radius - 6371) < 1e-3);
 assert.ok(earth.mass > 5.972e24 / SOLAR_MASS);
 assert.equal(earth.damage.kind, 'crater');
});

test('a staged encounter resolves as its impact even after the integrator carries it past', () => {
 // At the rendered contact the physical pair is a third of an AU apart and
 // receding: the relative velocity is almost perpendicular to the staged
 // approach. Read literally that is a glancing blow, and the graze branch
 // records lastGraze and then skips the pair on every later frame, so the
 // impact never happens - this is why Mercury never reached Venus.
 const mercury = body({name: 'Merkury', key: 'mercury', mass: 3.301e23 / SOLAR_MASS, radius: 2439.7, p: [.7, .3, 0], v: [.01, .017, 0]});
 const venus = body({name: 'Wenus', key: 'venus', mass: 4.867e24 / SOLAR_MASS, radius: 6051.8, p: [.35, .62, 0], v: [-.018, .011, 0]});
 mercury.collisionScenario = {targetId: venus.id, visualDirection: [1, .06, -.04], launchElapsed: 0, minDurationDays: 32};
 const bodies = [venus, mercury];
 const events = resolveCollisions(bodies, {contactTest: () => true, contactNormal: scenarioContactNormal});
 assert.equal(events.length, 1);
 assert.notEqual(events[0].kind, 'graze', 'a staged encounter must never come out as a sideswipe');
 assert.equal(events[0].survivor, venus.id);
 assert.ok(!bodies.includes(mercury), 'the projectile is consumed by the impact it was staged for');
 assert.ok(!mercury.lastGraze && !venus.lastGraze, 'nothing may be marked as having grazed');
});

test('an ordinary pair can still graze', () => {
 // The exclusion above must not disable glancing blows for everything else.
 // Tangential contact at 2 km/s: above the pair's ~0.9 km/s escape speed, well
 // below the energy that would unbind either of them.
 const sideways = 1 / 86400 * 2 * 86400 / 149597870.7 * 86400 / 2;
 const one = body({name: 'A', key: 'rock', mass: 1e22 / SOLAR_MASS, radius: 1500, p: [1, 0, 0], v: [0, sideways, 0]});
 const two = body({name: 'B', key: 'rock', mass: 1e22 / SOLAR_MASS, radius: 1500, p: [1.00002, 0, 0], v: [0, -sideways, 0]});
 const events = resolveCollisions([one, two], {contactTest: () => true});
 assert.equal(events[0].kind, 'graze');
});
