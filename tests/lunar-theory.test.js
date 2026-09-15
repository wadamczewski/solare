import test from 'node:test';
import assert from 'node:assert/strict';
import {initialSystem} from '../src/physics.js';
import {planetState, toSceneFrame} from '../src/ephemeris.js';
import {MOON_MASS_FRACTION, deltaTSeconds, dynamicalCenturies, earthMoonSplit, moonEcliptic,
 MOON_PHASES, moonGeocentric, moonIllumination, moonPhaseName, moonState, precessEcliptic, solarLongitude} from '../src/lunar-theory.js';

const AU = 149597870.7, DEG = Math.PI / 180;
const at = (...args) => new Date(Date.UTC(...args));

test('the series reproduces the worked example it was transcribed from', () => {
 // Meeus, Astronomical Algorithms, example 47.a: 1992 April 12.0 TD, which is
 // T = -0.077221081451 Julian centuries. This is the whole reason to trust the
 // 300 coefficients above it; every digit Meeus publishes has to come back.
 const {longitude, latitude, distanceKm} = moonEcliptic(-.077221081451);
 assert.ok(Math.abs(longitude - 133.162655) < 5e-6, String(longitude));
 assert.ok(Math.abs(latitude + 3.229126) < 5e-6, String(latitude));
 assert.ok(Math.abs(distanceKm - 368409.7) < .05, String(distanceKm));
});

test('the Moon stays inside the orbit it actually has', () => {
 // Perigee and apogee vary, but over a century the Moon never comes closer
 // than about 356 400 km nor goes further than about 406 700.
 let closest = Infinity, furthest = 0, sum = 0, count = 0, worstLatitude = 0;
 for (let day = 0; day < 36525; day += 1) {
  const {distanceKm, latitude} = moonEcliptic((day - 18262) / 36525);
  closest = Math.min(closest, distanceKm); furthest = Math.max(furthest, distanceKm);
  worstLatitude = Math.max(worstLatitude, Math.abs(latitude));
  sum += distanceKm; count++;
 }
 assert.ok(closest > 356000 && closest < 357500, `perigee ${closest}`);
 assert.ok(furthest > 406000 && furthest < 407500, `apogee ${furthest}`);
 assert.ok(Math.abs(sum / count - 385000) < 1500, `mean ${sum / count}`);
 // The orbit is inclined about 5.145 degrees to the ecliptic, and the Sun
 // works that up and down by roughly a seventh of a degree either way.
 assert.ok(worstLatitude > 5.1 && worstLatitude < 5.4, String(worstLatitude));
});

test('a synodic month comes out of the series at its real length', () => {
 // Nothing in the tables says 29.53 days. It falls out of the Moon's motion
 // against the Sun's, so finding it is an end-to-end check of both.
 const gap = date => {
  const t = dynamicalCenturies(date);
  return ((moonEcliptic(t).longitude - solarLongitude(t)) % 360 + 360) % 360;
 };
 const start = at(2024, 0, 1), newMoons = [];
 let previous = gap(start);
 for (let day = 1; day < 1830; day++) {
  const value = gap(new Date(start.getTime() + day * 86400000));
  // The difference wraps through 360 at new moon; interpolate the crossing.
  if (value < previous) newMoons.push(day - value / (value + 360 - previous));
  previous = value;
 }
 assert.ok(newMoons.length >= 60, String(newMoons.length));
 // A straight line through the crossings rather than the mean of the gaps:
 // the endpoints of a short run carry the anomalistic term and would bias it.
 const n = newMoons.length, meanIndex = (n - 1) / 2;
 const meanTime = newMoons.reduce((sum, value) => sum + value, 0) / n;
 let top = 0, bottom = 0;
 newMoons.forEach((time, index) => {
  top += (index - meanIndex) * (time - meanTime); bottom += (index - meanIndex) ** 2;
 });
 assert.ok(Math.abs(top / bottom - 29.5306) < .005, `mean synodic month ${top / bottom}`);
 // Individual months really do vary by half a day either side of the mean.
 const spans = newMoons.slice(1).map((value, index) => value - newMoons[index]);
 assert.ok(Math.max(...spans) - Math.min(...spans) > .5, String(Math.max(...spans) - Math.min(...spans)));
 assert.ok(Math.max(...spans) < 29.9 && Math.min(...spans) > 29.2, `${Math.min(...spans)} to ${Math.max(...spans)}`);
});

test('precession to J2000 is reversible and the right size', () => {
 // A fifth of a degree by 2026 is what makes this correction necessary: left
 // out, it puts the Moon 1400 km from where the rest of the scene expects it.
 const t = dynamicalCenturies(at(2026, 8, 11));
 const [lon, lat] = precessEcliptic(133.162655, -3.229126, t, 0);
 const shift = 133.162655 - lon;
 assert.ok(shift > .3 && shift < .4, `shift ${shift} degrees`);
 assert.ok(Math.abs(shift * DEG * 384400) > 2000, 'and it is kilometres, not metres');
 const [back, backLat] = precessEcliptic(lon, lat, 0, t);
 assert.ok(Math.abs(back - 133.162655) < 1e-9, String(back));
 assert.ok(Math.abs(backLat + 3.229126) < 1e-9, String(backLat));
 // Zero interval changes nothing at all.
 const [same, sameLat] = precessEcliptic(200, 4, .3, .3);
 assert.ok(Math.abs(same - 200) < 1e-9 && Math.abs(sameLat - 4) < 1e-9);
});

test('the clock correction follows the measured record and then stops guessing', () => {
 assert.ok(Math.abs(deltaTSeconds(at(1900, 0, 1)) + 2.8) < .5);
 assert.ok(Math.abs(deltaTSeconds(at(2000, 0, 1)) - 63.8) < .5);
 assert.ok(Math.abs(deltaTSeconds(at(2020, 0, 1)) - 69.4) < .5);
 // Halfway between two entries is halfway between their values.
 assert.ok(Math.abs(deltaTSeconds(at(2010, 0, 1)) - 66.1) < .5);
 assert.ok(Math.abs(deltaTSeconds(at(2015, 0, 1)) - 67.75) < .6);
 // Beyond the record it is held flat rather than extrapolated off a curve.
 assert.equal(deltaTSeconds(at(2200, 0, 1)), deltaTSeconds(at(2030, 0, 1)));
 assert.equal(deltaTSeconds(at(1500, 0, 1)), deltaTSeconds(at(1800, 0, 1)));
 // Seventy seconds is not negligible here: the Moon covers 38 arcseconds in it.
 const date = at(2026, 8, 11, 12);
 const withCorrection = moonEcliptic(dynamicalCenturies(date)).longitude;
 const without = moonEcliptic((date.getTime() - Date.UTC(2000, 0, 1, 12)) / 86400000 / 36525).longitude;
 assert.ok(Math.abs(withCorrection - without) * 3600 > 25, 'the correction has to matter');
});

test('the velocity is the derivative of the position the series gives', () => {
 const date = at(2026, 8, 11, 12);
 const {p, v} = moonState(date);
 // An independent difference of the position, with a different step.
 const shift = .003;
 const before = moonGeocentric(new Date(date.getTime() - shift * 86400000));
 const after = moonGeocentric(new Date(date.getTime() + shift * 86400000));
 const numerical = [0, 1, 2].map(axis => (after[axis] - before[axis]) / (2 * shift));
 const difference = Math.hypot(...v.map((value, axis) => value - numerical[axis])) * AU / 86400;
 assert.ok(difference < .001, `${difference * 1000} m/s apart`);
 // The Moon runs between about 0.97 and 1.08 km/s around its orbit.
 for (let day = 0; day < 60; day += .5) {
  const speed = Math.hypot(...moonState(new Date(date.getTime() + day * 86400000)).v) * AU / 86400;
  assert.ok(speed > .96 && speed < 1.09, `${speed} km/s on day ${day}`);
 }
 assert.ok(Math.abs(Math.hypot(...p) * AU - 385000) < 25000);
});

test('splitting the pair leaves the barycentre exactly where it was', () => {
 // This is what removes the 4671 km the Earth used to be out by: the planetary
 // ephemeris returns the barycentre, and the Earth was simply placed there.
 const date = at(2026, 8, 11, 12);
 const position = [.9, -.4, .002], velocity = [.007, .015, -.0001];
 const {earth, moon} = earthMoonSplit(position, velocity, date);
 for (let axis = 0; axis < 3; axis++) {
  const centre = earth.p[axis] * (1 - MOON_MASS_FRACTION) + moon.p[axis] * MOON_MASS_FRACTION;
  const momentum = earth.v[axis] * (1 - MOON_MASS_FRACTION) + moon.v[axis] * MOON_MASS_FRACTION;
  assert.ok(Math.abs(centre - position[axis]) < 1e-15, `axis ${axis}`);
  assert.ok(Math.abs(momentum - velocity[axis]) < 1e-17, `axis ${axis}`);
 }
 const displacement = Math.hypot(...earth.p.map((value, axis) => value - position[axis])) * AU;
 assert.ok(displacement > 4300 && displacement < 5000, `${displacement} km off the barycentre`);
 const separation = Math.hypot(...moon.p.map((value, axis) => value - earth.p[axis])) * AU;
 assert.ok(Math.abs(separation - Math.hypot(...moonGeocentric(date)) * AU) < 1e-6);
 assert.ok(Math.abs(MOON_MASS_FRACTION - .012150) < 1e-5, String(MOON_MASS_FRACTION));
});

test('the phase runs through a whole cycle in a synodic month', () => {
 const start = at(2026, 0, 1), readings = [];
 for (let day = 0; day < 30; day += .25)
  readings.push(moonIllumination(new Date(start.getTime() + day * 86400000)));
 assert.ok(Math.min(...readings.map(item => item.illuminated)) < .02, 'a new moon');
 assert.ok(Math.max(...readings.map(item => item.illuminated)) > .98, 'and a full one');
 // Elongation runs nearly the whole way round. Nearly, not exactly: the Moon
 // is up to 5.1 degrees off the ecliptic, so a full moon away from a node
 // never quite reaches opposition, and this one gets to 175.7 degrees.
 const widest = Math.max(...readings.map(item => item.elongation));
 assert.ok(widest > 174 && widest < 180, String(widest));
 assert.ok(Math.min(...readings.map(item => item.elongation)) < 4);
 // Over a year some full moon does fall near a node, and that is the geometry
 // an eclipse needs - which the composed phase could never have produced.
 let closest = 0;
 for (let day = 0; day < 400; day += .25)
  closest = Math.max(closest, moonIllumination(new Date(start.getTime() + day * 86400000)).elongation);
 assert.ok(closest > 179, `nearest approach to opposition in a year: ${closest}`);
 for (const item of readings)
  assert.ok(Math.abs(item.illuminated - (1 - Math.cos(item.elongation * DEG)) / 2) < .02, String(item.elongation));
 // Waxing for half the month and waning for the other half, in one run each.
 let flips = 0;
 for (let i = 1; i < readings.length; i++) if (readings[i].waxing !== readings[i - 1].waxing) flips++;
 assert.ok(flips === 2, `${flips} changes of direction in 30 days`);
 const waxingShare = readings.filter(item => item.waxing).length / readings.length;
 assert.ok(Math.abs(waxingShare - .5) < .1, String(waxingShare));
 // A waxing crescent is brightening; the same lit fraction waning is not.
 const half = readings.find(item => item.waxing && item.illuminated > .5);
 assert.ok(half && half.phaseAngle < 90);
});

test('the phase is named the way an almanac names it', () => {
 const start = at(2026, 0, 1), seen = new Map();
 for (let day = 0; day < 60; day += .25) {
  const date = new Date(start.getTime() + day * 86400000);
  seen.set(moonPhaseName(date), (seen.get(moonPhaseName(date)) || 0) + 1);
 }
 // Every one of the eight appears across two months, and none dominates.
 for (const name of MOON_PHASES) assert.ok(seen.has(name), `never saw ${name}`);
 assert.ok(Math.max(...seen.values()) < 120, 'one name has swallowed the month');
 // First and last quarter are half lit and must not be confused for each other.
 const first = MOON_PHASES[2], last = MOON_PHASES[6];
 assert.notEqual(first, last);
 for (let day = 0; day < 60; day += .25) {
  const date = new Date(start.getTime() + day * 86400000), name = moonPhaseName(date);
  if (name === first) assert.ok(moonIllumination(date).waxing, 'a first quarter is waxing');
  if (name === last) assert.ok(!moonIllumination(date).waxing, 'a last quarter is waning');
 }
});

test('the simulation starts the Moon where the theory puts it', () => {
 // The integration point: what initialSystem builds, not what the series says.
 const date = at(2026, 8, 11, 12);
 const bodies = initialSystem(date);
 const earth = bodies.find(item => item.key === 'earth');
 const moon = bodies.find(item => item.parent === earth.id);
 assert.ok(moon, 'the Moon is still in the system');
 const offset = moon.p.map((value, axis) => value - earth.p[axis]);
 const expected = moonGeocentric(date);
 // The scene frame swaps y and z; the separation is frame-independent.
 assert.ok(Math.abs(Math.hypot(...offset) - Math.hypot(...expected)) * AU < 1e-6);
 assert.ok(Math.abs(offset[0] - expected[0]) * AU < 1e-6);
 assert.ok(Math.abs(offset[1] - expected[2]) * AU < 1e-6, 'y in the scene is z in the ecliptic');
 assert.ok(Math.abs(offset[2] - expected[1]) * AU < 1e-6);

 // The pair still averages to the barycentre the planetary ephemeris returns.
 const sun = bodies.find(item => item.key === 'sun');
 const barycentre = earth.p.map((value, axis) =>
  value * (1 - MOON_MASS_FRACTION) + moon.p[axis] * MOON_MASS_FRACTION - sun.p[axis]);
 const fromElements = toSceneFrame(planetState('earth', date).p);
 assert.ok(Math.hypot(...barycentre.map((value, axis) => value - fromElements[axis])) * AU < 1,
  'the barycentre must not move');
 // And the Earth is now a few thousand kilometres off it, where it belongs.
 const displaced = Math.hypot(...earth.p.map((value, axis) => value - sun.p[axis] - fromElements[axis])) * AU;
 assert.ok(displaced > 4300 && displaced < 5000, `${displaced} km`);
});

test('the Moon no longer starts at a composed phase', () => {
 // The old placement put every satellite at a phase fixed by its index in a
 // table, so the Moon sat in the same place whatever the date. Now the
 // simulation's own Moon tracks the sky: over a year it laps the Sun the
 // twelve and a third times it should, and its elongation from the Sun in the
 // scene matches what the theory says independently of it.
 const start = at(2026, 0, 1), elongations = [];
 for (let day = 0; day < 365; day += 2) {
  const date = new Date(start.getTime() + day * 86400000);
  const bodies = initialSystem(date);
  const earth = bodies.find(item => item.key === 'earth'), sun = bodies.find(item => item.key === 'sun');
  const moon = bodies.find(item => item.parent === earth.id);
  const toMoon = moon.p.map((value, axis) => value - earth.p[axis]);
  const toSun = sun.p.map((value, axis) => value - earth.p[axis]);
  const cosine = toMoon.reduce((sum, value, axis) => sum + value * toSun[axis], 0)
   / (Math.hypot(...toMoon) * Math.hypot(...toSun));
  const scene = Math.acos(Math.max(-1, Math.min(1, cosine))) / DEG;
  assert.ok(Math.abs(scene - moonIllumination(date).elongation) < .2,
   `${scene} in the scene against ${moonIllumination(date).elongation} from the theory`);
  elongations.push(scene);
 }
 assert.ok(Math.min(...elongations) < 5 && Math.max(...elongations) > 175);
 // Twelve or thirteen new moons in a year, sampled every two days.
 let laps = 0;
 for (let i = 1; i < elongations.length - 1; i++)
  if (elongations[i] < elongations[i - 1] && elongations[i] < elongations[i + 1]) laps++;
 assert.ok(laps >= 11 && laps <= 13, `${laps} new moons in a year`);
});
