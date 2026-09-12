import test from 'node:test';
import assert from 'node:assert/strict';
import {effectiveLuminosity} from '../src/central-stars.js';
import {SOLAR_EVOLUTION_SECONDS, SOLAR_PHASES, adiabaticExpansion, engulfed, solarEvolutionBodyState, solarEvolutionState, solarPhaseNote, solarLuminosity} from '../src/solar-evolution.js';

const AU_IN_SOLAR_RADII = 149597870.7 / 695700;

test('the run passes through every phase, in order, once', () => {
 const seen = [];
 for (let at = 0; at <= SOLAR_EVOLUTION_SECONDS; at += .25) {
  const state = solarEvolutionState(at);
  if (state.phase !== seen[seen.length - 1]) seen.push(state.phase);
 }
 assert.deepEqual(seen, SOLAR_PHASES.map(item => item.id));
 // Age only ever moves forward, and each phase hands over where the next picks up.
 let previous = -1;
 for (let at = 0; at <= SOLAR_EVOLUTION_SECONDS; at += .1) {
  const {ageGyr} = solarEvolutionState(at);
  assert.ok(ageGyr >= previous - 1e-9, `age went backwards at ${at}s`);
  previous = ageGyr;
 }
 for (let index = 1; index < SOLAR_PHASES.length; index++)
  assert.equal(SOLAR_PHASES[index].startGyr, SOLAR_PHASES[index - 1].endGyr, SOLAR_PHASES[index].id);
});

test('the endpoints are the published ones', () => {
 // Today.
 const now = solarEvolutionState(0);
 assert.equal(now.phase, 'main-sequence');
 assert.ok(Math.abs(now.radiusSolar - 1) < 1e-9);
 assert.ok(Math.abs(now.luminosity - 1) < 1e-9);
 assert.ok(Math.abs(now.mass - 1) < 1e-9);
 assert.ok(Math.abs(now.temperature - 5772) < 1);

 // Schröder & Connon Smith (2008): the red-giant tip at 2730 L☉, 256 R☉,
 // 0.668 M☉, and the asymptotic-giant tip at 4170 L☉, 213 R☉, 0.546 M☉.
 const tip = at => solarEvolutionState(SOLAR_PHASES.slice(0, at + 1).reduce((sum, item) => sum + item.seconds, 0) - 1e-6);
 const rgb = tip(2), agb = tip(4);
 assert.ok(Math.abs(rgb.radiusSolar - 256) < 1, rgb.radiusSolar);
 assert.ok(Math.abs(rgb.luminosity - 2730) < 10, rgb.luminosity);
 assert.ok(Math.abs(rgb.mass - .668) < .001, rgb.mass);
 assert.ok(Math.abs(agb.radiusSolar - 179) < 1, agb.radiusSolar);
 assert.ok(Math.abs(agb.luminosity - 4170) < 20, agb.luminosity);

 // A 0.5405 M☉ carbon-oxygen white dwarf, Earth-sized, cooling towards nothing.
 const end = solarEvolutionState(SOLAR_EVOLUTION_SECONDS);
 assert.equal(end.phase, 'white-dwarf');
 assert.ok(end.done);
 assert.ok(Math.abs(end.mass - .5405) < 1e-9);
 assert.ok(Math.abs(end.radiusSolar * 695700 - 8766) < 20, 'about the radius of Earth');
 assert.ok(end.luminosity < 1e-4 && end.temperature < 5000);
});

test('mass never rises and the star never runs backwards through its own growth', () => {
 let mass = Infinity;
 for (let at = 0; at <= SOLAR_EVOLUTION_SECONDS; at += .1) {
  const state = solarEvolutionState(at);
  assert.ok(state.mass <= mass + 1e-9, `mass grew at ${at}s`);
  mass = state.mass;
  assert.ok(state.radiusSolar > 0 && state.luminosity > 0 && state.temperature > 0);
 }
});

test('the giant reaches past Venus but the white dwarf is smaller than Earth', () => {
 const tipRadiusAU = 256 / AU_IN_SOLAR_RADII;
 assert.ok(tipRadiusAU > .7233, 'a 256 R☉ photosphere must pass Venus at 0.723 AU');
 assert.ok(tipRadiusAU < 1.5237, 'and must not reach Mars');
 assert.ok(Math.abs(tipRadiusAU - 1.19) < .01, tipRadiusAU);
 assert.ok(engulfed(.3871, tipRadiusAU) && engulfed(.7233, tipRadiusAU));
 assert.ok(!engulfed(1.5237, tipRadiusAU));
 // Mercury and Venus retreat as the star sheds mass, and are overtaken anyway.
 const retreat = adiabaticExpansion(1, .668).position;
 assert.ok(engulfed(.3871 * retreat, tipRadiusAU), 'Mercury at 0.58 AU is still inside 1.19');
 assert.ok(engulfed(.7233 * retreat, tipRadiusAU), 'Venus at 1.08 AU is still inside 1.19');
});

test('adiabatic mass loss widens an orbit and slows it, conserving a·M', () => {
 const {position, velocity} = adiabaticExpansion(1, .5);
 assert.equal(position, 2);
 assert.equal(velocity, .5);
 // a·M is the invariant, and the widened orbit is still circular: v² = GM/a.
 const before = {a: 1, m: 1}, after = {a: 1 * position, m: .5};
 assert.ok(Math.abs(before.a * before.m - after.a * after.m) < 1e-12);
 const speedRatio = Math.sqrt(after.m / after.a) / Math.sqrt(before.m / before.a);
 assert.ok(Math.abs(speedRatio - velocity) < 1e-12, String(speedRatio));
 // Nonsense input changes nothing rather than throwing the system apart.
 assert.deepEqual(adiabaticExpansion(0, 1), {position: 1, velocity: 1});
 assert.deepEqual(adiabaticExpansion(1, 0), {position: 1, velocity: 1});
});

test('every phase carries a sourced note and a share of screen time', () => {
 for (const item of SOLAR_PHASES) {
  assert.ok(item.seconds > 0, item.id);
  // Prose is keyed by language, because the interface translator substitutes
  // single phrases and would mangle a sentence.
  assert.equal(item.note.length, 4, item.id);
  for (const text of item.note) assert.ok(typeof text === 'string' && text.length > 40, item.id);
  assert.ok(item.spectralType.length > 0, item.id);
  assert.ok(item.endGyr > item.startGyr, item.id);
 }
 // Long enough to watch, short enough to sit through.
 assert.ok(SOLAR_EVOLUTION_SECONDS > 60 && SOLAR_EVOLUTION_SECONDS < 180, String(SOLAR_EVOLUTION_SECONDS));
});

test('a phase note answers in the requested language and falls back to English', () => {
 assert.notEqual(solarPhaseNote('red-giant', 'pl'), solarPhaseNote('red-giant', 'en'));
 assert.equal(solarPhaseNote('red-giant', 'xx'), solarPhaseNote('red-giant', 'en'));
 assert.ok(solarPhaseNote('white-dwarf', 'de').length > 40);
 assert.ok(solarPhaseNote('agb', 'es').length > 40);
 assert.equal(solarPhaseNote('not-a-phase', 'pl'), null);
});


test('phase anchors are continuous and obey Stefan–Boltzmann', () => {
 for (let index = 0; index < SOLAR_PHASES.length; index++) {
  const current = SOLAR_PHASES[index];
  for (const anchor of [current.from, current.to]) {
   const expected = solarLuminosity(anchor.radius, anchor.temperature);
   assert.ok(Math.abs(anchor.luminosity / expected - 1) < .012,
    `${current.id}: ${anchor.luminosity} L☉ vs ${expected} L☉`);
  }
  if (index) {
   const previous = SOLAR_PHASES[index - 1].to;
   for (const key of ['mass', 'radius', 'luminosity', 'temperature'])
    assert.ok(Math.abs(current.from[key] / previous[key] - 1) < 1e-12,
     `${current.id} jumps in ${key}`);
  }
 }
});

test('the planetary nebula has a ten-thousand-year physical age span', () => {
 const nebula = SOLAR_PHASES.find(item => item.id === 'planetary-nebula');
 assert.ok(Math.abs((nebula.endGyr - nebula.startGyr) * 1e9 - 10000) < 1e-3);
});


test('the renderer receives bolometric luminosity once, never radius squared twice', () => {
 for (let at = 0; at <= SOLAR_EVOLUTION_SECONDS; at += .5) {
  const state = solarEvolutionState(at), bodyState = solarEvolutionBodyState(state);
  assert.equal(bodyState.radius, state.radiusSolar * 695700);
  assert.ok(Math.abs(effectiveLuminosity(bodyState) / state.luminosity - 1) < 1e-12,
   `${state.phase} must heat by its stated luminosity`);
 }
});


test('the application imports the evolution body-state adapter it calls', async () => {
 const source = await (await import('node:fs/promises')).readFile(new URL('../src/main.js', import.meta.url), 'utf8');
 assert.match(source, /solarEvolutionBodyState/);
 assert.match(source, /import \{[^}]*solarEvolutionBodyState[^}]*\} from '\.\/solar-evolution\.js'/);
});
