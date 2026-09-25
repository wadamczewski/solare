import test from 'node:test';
import assert from 'node:assert/strict';
import {body,initialSystem,stableStep,step} from '../src/physics.js';
import {SHARE_VERSION,createShareState,createViewShare,decodeShareState,encodeShareState,encodeViewShare,expandBodies,plainValue,restoreReferences,shareTokenFromLocation,shareUrl,validViewport} from '../src/share-state.js';

const epoch = new Date('2026-09-25T10:00:00.123Z');
const evolved = () => {
 const bodies = initialSystem(epoch);
 for (let index = 0; index < 40; index++) step(bodies, stableStep(bodies));
 return bodies;
};
const share = (bodies, extra = {}) => createViewShare({
 epoch, elapsed: 12.5, speed: 2, paused: true, compressed: false, brightness: 37, infall: .1,
 layers: {orbits: false, constellations: true, deepSky: false, landmarks: true, education: true},
 camera: {p: [1.5, 2.25, -3], t: [0, .5, 0], f: 51}, follow: bodies[3].id, selected: bodies[3].id,
 panel: {k: 'body', id: bodies[3].id}, modes: {sd: {sec: 4.25, mass: .999}}, bodies, reference: initialSystem(epoch), ...extra
});
// What the receiver does: expand against its own freshly built default system
// and give every body a new id.
const receive = state => {
 const expanded = expandBodies(state.x, initialSystem(new Date(state.e)));
 const ids = new Map(), restored = expanded.map(item => {const made = body(item.fields); ids.set(item.senderId, made.id); return made;});
 expanded.forEach((item, index) => restoreReferences(restored[index], item.refs, ids));
 return {restored, ids};
};
const withoutIds = item => {const copy = plainValue(item); delete copy.id; delete copy.parent; delete copy.fragmentOf; if (copy.collisionScenario) delete copy.collisionScenario.targetId; return copy;};

test('a shared view restores every body bit for bit', () => {
 const bodies = evolved(), state = decodeShareState(encodeViewShare(share(bodies)));
 const {restored, ids} = receive(state);
 assert.equal(restored.length, bodies.length);
 bodies.forEach((original, index) => {
  assert.deepEqual(withoutIds(restored[index]), withoutIds(original), original.name);
  assert.deepEqual(restored[index].p, original.p, `${original.name} position is exact`);
  if (original.parent != null) assert.equal(restored[index].parent, ids.get(original.parent), `${original.name} keeps its host`);
 });
});

test('the view, time, layers and modes travel with the bodies', () => {
 const bodies = evolved(), state = decodeShareState(encodeViewShare(share(bodies)));
 assert.equal(state.v, SHARE_VERSION);
 assert.equal(state.e, epoch.toISOString());
 assert.deepEqual([state.t, state.s, state.p, state.c, state.b, state.n], [12.5, 2, 1, 0, 37, .1]);
 assert.deepEqual(state.l, {o: 0, c: 1, d: 0, k: 1, x: 1});
 assert.deepEqual(state.cam, {p: [1.5, 2.25, -3], t: [0, .5, 0], f: 51});
 assert.equal(state.fo, bodies[3].id);
 assert.deepEqual(state.pn, {k: 'body', id: bodies[3].id});
 assert.deepEqual(state.m, {sd: {sec: 4.25, mass: .999}});
});

test('changed, added and removed bodies survive, with their references remapped', () => {
 const bodies = evolved(), earth = bodies.find(item => item.key === 'earth'), moon = bodies.find(item => item.name === 'Księżyc');
 earth.damage = {kind: 'crater', strength: .4, direction: [0, 1, 0], surface: {globalHeat: .2}};
 earth.mass *= 1.01;
 const comet = body({name: 'Kometa', key: 'comet', mass: 1e-15, radius: 5, p: [2, 0, 1], v: [0, .01, 0], collisionScenario: {targetId: earth.id, launchElapsed: 1, visualDirection: [1, 0, 0]}, lastGraze: moon.id});
 const fragment = body({name: 'Odłamek', key: 'fragment', irregular: true, fragmentOf: [earth.id, 99999], mass: 1e-12, radius: 20, p: [1, 0, 0], v: [0, 0, 0]});
 const remaining = bodies.filter(item => item.name !== 'Fobos').concat(comet, fragment);
 const {restored, ids} = receive(decodeShareState(encodeViewShare(share(remaining))));
 const byName = name => restored.find(item => item.name === name);
 assert.equal(byName('Fobos'), undefined, 'a destroyed moon stays destroyed');
 assert.deepEqual(byName('Ziemia').damage, earth.damage);
 assert.equal(byName('Ziemia').mass, earth.mass);
 assert.equal(byName('Kometa').collisionScenario.targetId, ids.get(earth.id));
 assert.equal(byName('Kometa').lastGraze, ids.get(moon.id));
 assert.deepEqual(byName('Odłamek').fragmentOf, [ids.get(earth.id), null], 'a parent that no longer exists is not pointed at another body');
});

test('an untouched default system costs little more than its positions', () => {
 const bodies = evolved(), token = encodeViewShare(share(bodies));
 assert.ok(token.startsWith(`${SHARE_VERSION}.`));
 assert.ok(token.length < 8000, `token is ${token.length} characters`);
 const url = shareUrl(new URL('https://solare.test/'), share(bodies));
 assert.equal(shareTokenFromLocation(new URL(url)).x.length, bodies.length);
});

test('broken or hostile tokens fail safely', () => {
 assert.equal(decodeShareState('2.not-deflate'), null);
 assert.equal(decodeShareState('2.'), null);
 const bodies = evolved(), state = share(bodies);
 assert.equal(decodeShareState(encodeViewShare({...state, cam: {p: [0, 0, 0], t: [0, 0, 0], f: 400}})), null);
 assert.equal(expandBodies([{i: 1, f: {name: 'x', key: 'x', p: [0, 0], v: [0, 0, 0], mass: 1, radius: 1}}]), null);
 assert.equal(expandBodies([{i: 1, m: 999, d: {}}], initialSystem(epoch)), null);
 assert.equal(validViewport({p: [0, 0, NaN], t: [0, 0, 0], f: 40}), false);
});

test('links made before version 2 still open', () => {
 const legacy = [{id: 1, name: 'Sun', key: 'sun', mass: 1, radius: 695700, p: [0, 0, 0], v: [0, 0, 0]}];
 const decoded = decodeShareState(encodeShareState(createShareState({bodies: legacy, epoch: '2026-01-01T00:00:00.000Z', elapsed: 0, speed: 2, compressed: true, brightness: 100, centralStar: 'sun', showOrbits: true})));
 assert.equal(decoded.v, 1);
 assert.equal(decoded.x[0].name, 'Sun');
});
