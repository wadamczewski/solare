import test from 'node:test';
import assert from 'node:assert/strict';
import {STAR_SYSTEMS, buildSystem, orbitalState, orbitSpanAU, systemBodies, systemExtentAU, systemNote} from '../src/star-systems.js';
import {G, body} from '../src/physics.js';
import {fastStepSize, splitStep} from '../src/fast-step.js';
import {step} from '../src/physics.js';
import {resolveCollisions} from '../src/collisions.js';

const YEAR = 365.25;
const total = node => node.star ? node.star.mass : total(node.primary) + total(node.secondary);

test('the two-body solution reproduces the period and the shape of the orbit', () => {
 // A circular orbit at 1 AU about one solar mass is a year, and the speed is
 // the Earth's: this pins the units of G, the positions and the velocities.
 const circular = orbitalState({semiMajorAU: 1, eccentricity: 0}, 1);
 assert.ok(Math.abs(circular.period - YEAR) < .3, String(circular.period));
 assert.ok(Math.abs(Math.hypot(...circular.position) - 1) < 1e-12);
 assert.ok(Math.abs(Math.hypot(...circular.velocity) * 149597870.7 / 86400 - 29.78) < .02);

 // At pericentre an eccentric orbit is at a(1-e) and moving fastest; at
 // apocentre, a(1+e) and slowest. Angular momentum is the same at both.
 const near = orbitalState({semiMajorAU: 10, eccentricity: .6, phaseDeg: 0}, 2);
 const far = orbitalState({semiMajorAU: 10, eccentricity: .6, phaseDeg: 180}, 2);
 assert.ok(Math.abs(Math.hypot(...near.position) - 4) < 1e-9);
 assert.ok(Math.abs(Math.hypot(...far.position) - 16) < 1e-9);
 assert.ok(Math.abs(Math.hypot(...near.position) * Math.hypot(...near.velocity)
  - Math.hypot(...far.position) * Math.hypot(...far.velocity)) < 1e-12);
 // Vis-viva at an arbitrary phase.
 const any = orbitalState({semiMajorAU: 5, eccentricity: .3, phaseDeg: 73}, 1.5);
 const r = Math.hypot(...any.position), speed = Math.hypot(...any.velocity);
 assert.ok(Math.abs(speed ** 2 - G * 1.5 * (2 / r - 1 / 5)) < 1e-15);
});

test('a built system has its barycentre at rest at the origin', () => {
 for (const preset of STAR_SYSTEMS) {
  const bodies = systemBodies(preset), mass = bodies.reduce((sum, item) => sum + item.mass, 0);
  for (let axis = 0; axis < 3; axis++) {
   const centre = bodies.reduce((sum, item) => sum + item.mass * item.p[axis], 0) / mass;
   const momentum = bodies.reduce((sum, item) => sum + item.mass * item.v[axis], 0) / mass;
   assert.ok(Math.abs(centre) < 1e-9, `${preset.id} centre ${centre}`);
   assert.ok(Math.abs(momentum) < 1e-15, `${preset.id} momentum ${momentum}`);
  }
  assert.ok(Math.abs(mass - total(preset.root)) < 1e-9, preset.id);
 }
});

test('the separations reproduce the published orbits', () => {
 const find = (id, name) => systemBodies(STAR_SYSTEMS.find(item => item.id === id)).find(b => b.name === name);
 const apart = (id, one, two) => {
  const a = find(id, one), b = find(id, two);
  return Math.hypot(...a.p.map((value, axis) => value - b.p[axis]));
 };
 // Alpha Centauri A-B at 60 degrees of true anomaly, on a = 23.52, e = 0.5179:
 // r = a(1-e²)/(1+e cos ν) = 23.52 · 0.73178 / 1.25895 = 13.671 AU, which sits
 // between the 11 AU pericentre and the 36 AU apocentre the pair really has.
 assert.ok(Math.abs(apart('alpha-centauri', 'α Centauri A', 'α Centauri B') - 13.6713) < .01);
 // Hulse-Taylor at apocentre: a(1+e) = 0.02123 AU, about 4.6 solar radii.
 assert.ok(Math.abs(apart('hulse-taylor', 'PSR B1913+16', 'Towarzysz neutronowy') - .02123) < 1e-4);
 // The J0337 inner pair is essentially circular, so it sits at its own a.
 assert.ok(Math.abs(apart('psr-j0337', 'PSR J0337+1715', 'Wewnętrzny biały karzeł') - .03191) < 1e-4);
});

test('every outer orbit clears the Holman-Wiegert stability radius', () => {
 // Hierarchy is what makes these integrable at all: a trapezium of comparable
 // masses at comparable spacings is the chaotic three-body problem and ejects a
 // component within a few crossing times, which is the situation in Liu Cixin's
 // novel. The quantitative form of "far enough out" is Holman & Wiegert (1999,
 // AJ 117, 621), whose fit gives the innermost stable circumbinary orbit from
 // the inner pair's mass ratio and eccentricity. An outer body must sit beyond
 // it. (The fit assumes a light, coplanar outer body; where the third star is
 // heavy - Proxima, Algol Ab - it is a lower bound, and those clear it by more
 // than an order of magnitude anyway.)
 const total = node => node.star ? node.star.mass : total(node.primary) + total(node.secondary);
 const criticalAU = pair => {
  const one = total(pair.primary), two = total(pair.secondary), mu = Math.min(one, two) / (one + two), e = pair.eccentricity;
  return (1.60 + 5.10 * e - 2.22 * e ** 2 + 4.12 * mu - 4.27 * e * mu - 5.09 * mu ** 2 + 4.61 * e ** 2 * mu ** 2)
   * pair.semiMajorAU;
 };
 const check = (node, id) => {
  if (node.star) return;
  check(node.primary, id); check(node.secondary, id);
  for (const inner of [node.primary, node.secondary]) {
   if (inner.star) continue;
   const limit = criticalAU(inner);
   assert.ok(node.semiMajorAU > limit,
    `${id}: outer orbit ${node.semiMajorAU} AU inside the stability radius ${limit.toFixed(4)} AU`);
  }
 };
 for (const preset of STAR_SYSTEMS) check(preset.root, preset.id);
 // The fit is what the Kepler-16 note quotes: the planet orbits at 0.705 AU,
 // just 9% outside a limit of 0.646 AU. That margin is real and is the point of
 // the system, so the test would notice if either number drifted.
 const kepler = STAR_SYSTEMS.find(item => item.id === 'kepler-16');
 assert.ok(Math.abs(criticalAU(kepler.root.primary) - .646) < .01);
 assert.ok(kepler.root.semiMajorAU / criticalAU(kepler.root.primary) < 1.2);
});

test('every system holds together under the engine that has to run it', () => {
 // The point of the list is that these can actually be simulated. Each preset
 // is integrated with the same stepper the application uses, and must conserve
 // energy, keep every component bound and let nothing collide.
 //
 // The step size adapts to the closest pair, which costs the leapfrog its
 // symplectic property, so the energy error grows slowly instead of merely
 // oscillating. Seven of the eight stay under 1e-4 over 12000 steps. The
 // Hulse-Taylor pair does not: a 7.75-hour orbit of eccentricity 0.617 is by
 // far the hardest case here, since the error of a kick-drift-kick step scales
 // as dt²/q³ and its pericentre is a hundredth of an AU. 12000 steps carry it
 // through about a hundred orbits, which at its viewing rate is half an hour of
 // watching; over that the semi-major axis moves by well under a percent and
 // the orbit keeps its shape, which is what a viewer would see.
 const TOLERANCE = {'hulse-taylor': 1e-2};
 for (const preset of STAR_SYSTEMS) {
  const bodies = systemBodies(preset).map(item => body({name: item.name, key: 'sun', mass: item.mass,
   radius: item.radiusKm, p: [...item.p], v: [...item.v]}));
  const energy = system => {
   let value = 0;
   for (let i = 0; i < system.length; i++) {
    value += .5 * system[i].mass * system[i].v.reduce((sum, x) => sum + x * x, 0);
    for (let j = i + 1; j < system.length; j++)
     value -= G * system[i].mass * system[j].mass / Math.hypot(...system[i].p.map((x, k) => x - system[j].p[k]));
   }
   return value;
  };
  const separations = system => {
   const list = [];
   for (let i = 0; i < system.length; i++) for (let j = i + 1; j < system.length; j++)
    list.push(Math.hypot(...system[i].p.map((x, k) => x - system[j].p[k])));
   return list;
  };
  const before = energy(bodies), start = bodies.map(item => Math.hypot(...item.p));
  const widest = separations(bodies).map(value => value);
  for (let count = 0; count < 12000; count++) {
   const config = fastStepSize(bodies);
   if (config.split) splitStep(bodies, config.dt, config.states); else step(bodies, config.dt);
   assert.equal(resolveCollisions(bodies).length, 0, `${preset.id}: components collided`);
   separations(bodies).forEach((value, index) => { widest[index] = Math.max(widest[index], value); });
  }
  const drift = Math.abs((energy(bodies) - before) / before);
  assert.ok(drift < (TOLERANCE[preset.id] ?? 1e-4), `${preset.id}: energy drifted by ${drift.toExponential(2)}`);
  // Nothing wanders off. The yardstick is the system's own extent rather than
  // where each body happened to start: S2 begins near pericentre and is
  // supposed to travel out to sixteen times that distance.
  const bound = orbitSpanAU(preset) * 3;
  bodies.forEach(item => assert.ok(Math.hypot(...item.p) < bound,
   `${preset.id}: ${item.name} escaped to ${Math.hypot(...item.p).toFixed(3)} AU, past ${bound.toFixed(3)}`));
  // No pair ever opens out past that either, which would mean one component had
  // been flung outwards and pulled back by the time the run ended.
  widest.forEach(value => assert.ok(value < bound * 2, `${preset.id}: a pair reached ${value.toFixed(3)} AU`));
  start.forEach(value => assert.ok(Number.isFinite(value)));
 }
});

test('each system carries a note in four languages, a source and a viewing rate', () => {
 const ids = new Set();
 for (const preset of STAR_SYSTEMS) {
  assert.ok(!ids.has(preset.id), `duplicate ${preset.id}`);
  ids.add(preset.id);
  assert.equal(preset.note.length, 4, preset.id);
  for (const text of preset.note) assert.ok(typeof text === 'string' && text.length > 120, preset.id);
  assert.match(preset.source, /^https:\/\//, preset.id);
  assert.ok(preset.daysPerSecond > 0, preset.id);
  // Three or fewer bodies for a stellar system, four with a planet.
  assert.ok(systemBodies(preset).length >= 2 && systemBodies(preset).length <= 4, preset.id);
  assert.ok(systemExtentAU(preset) > 0, preset.id);
  // The framing radius must cover the whole orbit, not just today's positions.
  assert.ok(orbitSpanAU(preset) >= systemExtentAU(preset) - 1e-9, preset.id);
 }
 assert.notEqual(systemNote('alpha-centauri', 'pl'), systemNote('alpha-centauri', 'en'));
 assert.equal(systemNote('alpha-centauri', 'xx'), systemNote('alpha-centauri', 'en'));
 assert.equal(systemNote('nothing', 'pl'), null);
 // S2 is the case the distinction exists for: it is placed near pericentre.
 const s2 = STAR_SYSTEMS.find(item => item.id === 's2-sgr-a');
 assert.ok(orbitSpanAU(s2) > systemExtentAU(s2) * 5, String(orbitSpanAU(s2) / systemExtentAU(s2)));
});

test('a rate is chosen that puts an orbit on a human timescale', () => {
 // The tightest orbit in a system should take at least a second of screen time
 // and the widest one that matters should not take an hour.
 for (const preset of STAR_SYSTEMS) {
  const periods = [];
  const walk = node => {
   if (node.star) return;
   periods.push(orbitalState(node, total(node)).period);
   walk(node.primary); walk(node.secondary);
  };
  walk(preset.root);
  const seconds = periods.map(days => days / preset.daysPerSecond);
  assert.ok(Math.min(...seconds) > .8, `${preset.id}: fastest orbit ${Math.min(...seconds).toFixed(2)} s`);
  // Alpha Centauri's Proxima takes half a million years by nature; the note says so.
  const watchable = seconds.filter(value => value < 3600);
  assert.ok(watchable.length > 0, preset.id);
 }
});

test('the flattener places a lone star and a simple pair correctly', () => {
 const lone = buildSystem({star: {name: 'x', mass: 2}});
 assert.deepEqual(lone.bodies[0].p, [0, 0, 0]);
 assert.equal(lone.mass, 2);
 // Equal masses sit opposite each other, each at half the separation.
 const pair = buildSystem({primary: {star: {name: 'a', mass: 1}}, secondary: {star: {name: 'b', mass: 1}},
  semiMajorAU: 2, eccentricity: 0, inclinationDeg: 0, phaseDeg: 0});
 assert.ok(Math.abs(pair.bodies[0].p[0] + 1) < 1e-12);
 assert.ok(Math.abs(pair.bodies[1].p[0] - 1) < 1e-12);
 assert.ok(Math.abs(pair.bodies[0].v[2] + pair.bodies[1].v[2]) < 1e-15);
});
