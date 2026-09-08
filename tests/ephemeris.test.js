import test from 'node:test';
import assert from 'node:assert/strict';
import {planetState, elements, eccentricAnomaly, julianCenturies, toSceneFrame, J2000} from '../src/ephemeris.js';
import {initialSystem, planets, G} from '../src/physics.js';

const REFERENCE = new Date('2026-09-08T00:00:00Z');
const degrees = radians => (radians * 180 / Math.PI + 360) % 360;

test('tabulated mean-longitude rates reproduce the known orbital periods',()=>{
 const expected = {mercury:87.969, venus:224.701, earth:365.256, mars:686.980, jupiter:4332.59, saturn:10759.22, uranus:30685.4, neptune:60189};
 for(const [key, days] of Object.entries(expected)){
  const period = 360 / (elements[key].l[1] / 36525);
  assert.ok(Math.abs(period / days - 1) < 0.001, `${key}: ${period.toFixed(2)} vs ${days}`);
 }
});

test('Kepler solver inverts the mean anomaly for every planetary eccentricity',()=>{
 for(const key of Object.keys(elements)){
  const e = elements[key].e[0];
  for(let M = -180; M <= 180; M += 7){
   const E = eccentricAnomaly(M, e);
   const recovered = E - (e * 180 / Math.PI) * Math.sin(E * Math.PI / 180);
   assert.ok(Math.abs(recovered - M) < 1e-8, `${key} M=${M}`);
  }
 }
});

test('J2000 epoch is the tabulated instant and centuries count from it',()=>{
 assert.equal(julianCenturies(new Date(J2000)), 0);
 assert.ok(Math.abs(julianCenturies(new Date('2100-01-01T12:00:00Z')) - 1) < 1e-4);
});

test('heliocentric distances stay inside each orbit perihelion-aphelion band',()=>{
 for(const date of [new Date('1900-01-01T00:00:00Z'), REFERENCE, new Date('2049-12-31T00:00:00Z')])
  for(const key of Object.keys(elements)){
   const {p, a, e} = planetState(key, date);
   const r = Math.hypot(...p);
   assert.ok(r >= a * (1 - e) - 1e-6 && r <= a * (1 + e) + 1e-6, `${key} r=${r}`);
  }
});

test('Earth places the Sun at its real ecliptic longitude for the reference date',()=>{
 // The Sun sits at ecliptic longitude 165 deg as seen from Earth on 8 Sep 2026;
 // heliocentric Earth is therefore 180 deg away from that.
 const {p} = planetState('earth', REFERENCE);
 const earthLongitude = degrees(Math.atan2(p[1], p[0]));
 assert.ok(Math.abs(((earthLongitude + 180) % 360) - 165) < 0.5, `sun at ${(earthLongitude + 180) % 360}`);
});

test('velocity matches a finite difference of the position it is paired with',()=>{
 // The two differ by the secular drift of the elements themselves, which the
 // analytic velocity deliberately excludes: those rates are perturbations
 // averaged over centuries, not instantaneous motion. Saturn has the largest
 // rates and sets the bound at about 0.02% of its speed.
 const h = 0.01;
 for(const key of Object.keys(elements)){
  const {v} = planetState(key, REFERENCE);
  const before = planetState(key, new Date(REFERENCE.getTime() - h * 86400000)).p;
  const after = planetState(key, new Date(REFERENCE.getTime() + h * 86400000)).p;
  const speed = Math.hypot(...v);
  for(let k = 0; k < 3; k++){
   const numeric = (after[k] - before[k]) / (2 * h);
   assert.ok(Math.abs(numeric - v[k]) < speed * 3e-4, `${key} axis ${k}: ${numeric} vs ${v[k]}`);
  }
 }
});

test('scene frame keeps the ecliptic in XZ with the pole on Y',()=>{
 assert.deepEqual(toSceneFrame([1, 2, 3]), [1, 3, 2]);
 const {p} = planetState('earth', REFERENCE);
 const scene = toSceneFrame(p);
 assert.ok(Math.abs(scene[1]) < 1e-3, 'Earth sits essentially in the ecliptic plane');
});

test('bodies orbit prograde and near their nominal semi-major axis on load',()=>{
 const bs = initialSystem(REFERENCE);
 const sun = bs[0];
 for(const [name, key, a] of planets){
  const b = bs.find(x => x.key === key);
  const r = Math.hypot(...b.p.map((x, k) => x - sun.p[k]));
  assert.ok(Math.abs(r / a - 1) < 0.12, `${name} r=${r} a=${a}`);
  // Prograde motion is counter-clockwise seen from ecliptic north: x*vz - z*vx > 0.
  const angular = (b.p[0] - sun.p[0]) * (b.v[2] - sun.v[2]) - (b.p[2] - sun.p[2]) * (b.v[0] - sun.v[0]);
  assert.ok(angular > 0, `${name} orbits retrograde`);
  // Speed must match the vis-viva value for its current radius.
  const speed = Math.hypot(...b.v.map((x, k) => x - sun.v[k]));
  const visViva = Math.sqrt(G * (1 + b.mass) * (2 / r - 1 / a));
  assert.ok(Math.abs(speed / visViva - 1) < 0.02, `${name} speed ${speed} vs ${visViva}`);
 }
});

test('a system built for the current moment is finite and holds its moons',()=>{
 const bs = initialSystem();
 assert.equal(bs.length, 32);
 assert.ok(bs.every(b => [...b.p, ...b.v].every(Number.isFinite)));
 for(const moon of bs.filter(b => b.parent)){
  const host = bs.find(b => b.id === moon.parent);
  const r = Math.hypot(...moon.p.map((x, k) => x - host.p[k]));
  const v2 = moon.v.reduce((s, x, k) => s + (x - host.v[k]) ** 2, 0);
  assert.ok(v2 / 2 - G * host.mass / r < 0, moon.name);
 }
});

test('two loads a day apart advance the planets by roughly one day of motion',()=>{
 const first = initialSystem(REFERENCE);
 const later = initialSystem(new Date(REFERENCE.getTime() + 86400000));
 const earthA = first.find(b => b.key === 'earth'), earthB = later.find(b => b.key === 'earth');
 const moved = Math.hypot(...earthA.p.map((x, k) => x - earthB.p[k]));
 const perDay = Math.hypot(...earthA.v);
 assert.ok(Math.abs(moved / perDay - 1) < 0.01, `moved ${moved} vs ${perDay}`);
});
