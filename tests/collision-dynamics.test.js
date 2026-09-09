import test from 'node:test';
import assert from 'node:assert/strict';
import {collisionSpinState} from '../src/collision-dynamics.js';
import {AU, SOLAR_MASS} from '../src/physics.js';

const earth = () => ({mass: 5.972e24 / SOLAR_MASS, radius: 6371, spin: 23.934, tilt: 23.44});
const contactAU = (a, b) => (a + b) / AU;
// 51.3 km/s, the most probable Halley-Earth encounter speed, in AU per day.
const kmsToAUPerDay = speed => speed * 86400 / AU;

test('off-axis impact speeds a remnant rotation while a head-on impact does not invent spin', () => {
 const impactor = {mass: 1e23 / SOLAR_MASS};
 const contact = contactAU(6371, 1000), v = kmsToAUPerDay(15);
 const headOn = collisionSpinState(earth(), impactor, [1, 0, 0], [-v, 0, 0], contact);
 const offAxis = collisionSpinState(earth(), impactor, [1, 0, 0], [0, 0, v], contact);
 assert.equal(headOn.period, 23.934);
 assert.equal(headOn.tilt, 23.44);
 assert.ok(offAxis.period < 23.934);
 assert.notEqual(offAxis.tilt, 23.44);
});

test('a comet nucleus does not measurably change the length of a day', () => {
 // Halley into Earth, worst case: the whole encounter tangential, so all of the
 // nucleus's angular momentum goes into spin. It carries about 7e25 kg m^2/s
 // about Earth's centre against Earth's own 6e33, so the day must not move.
 const impactor = {mass: 2.2e14 / SOLAR_MASS}, v = kmsToAUPerDay(51.3);
 const state = collisionSpinState(earth(), impactor, [1, 0, 0], [0, 0, v], contactAU(6371, 5.5));
 const secondsChanged = (23.934 - state.period) * 3600;
 assert.ok(secondsChanged >= 0 && secondsChanged < .01, `${secondsChanged} s`);
 assert.ok(Math.abs(state.tilt - 23.44) < .001, String(state.tilt));
 assert.ok(state.impulse < 1e-6, String(state.impulse));
});

test('spin-up scales with the momentum the impactor actually carries', () => {
 const v = kmsToAUPerDay(15), contact = contactAU(6371, 500), arm = [1, 0, 0], motion = [0, 0, v];
 const light = collisionSpinState(earth(), {mass: 1e20 / SOLAR_MASS}, arm, motion, contact);
 const heavy = collisionSpinState(earth(), {mass: 2e20 / SOLAR_MASS}, arm, motion, contact);
 const faster = collisionSpinState(earth(), {mass: 1e20 / SOLAR_MASS}, arm, [0, 0, v * 2], contact);
 assert.ok(Math.abs(heavy.impulse / light.impulse - 2) < 1e-9, 'twice the mass, twice the transfer');
 assert.ok(Math.abs(faster.impulse / light.impulse - 2) < 1e-9, 'twice the speed, twice the transfer');
 // No impactor and no lever arm both mean nothing is delivered.
 assert.equal(collisionSpinState(earth(), null, arm, motion, contact).impulse, 0);
 assert.equal(collisionSpinState(earth(), {mass: 1e20 / SOLAR_MASS}, arm, motion, 0).impulse, 0);
});

test('a giant impact saturates rather than running away', () => {
 // A Theia-sized body at 10 km/s carries far more than Earth's spin momentum;
 // the model caps the transfer instead of returning an absurd rotation period.
 const state = collisionSpinState(earth(), {mass: 6.4e23 / SOLAR_MASS}, [1, 0, 0], [0, 0, kmsToAUPerDay(10)], contactAU(6371, 3390));
 assert.equal(state.impulse, .82);
 assert.ok(state.period > 13 && state.period < 14, String(state.period));
 assert.ok(state.tilt <= 90);
});
