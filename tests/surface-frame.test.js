import test from 'node:test';
import assert from 'node:assert/strict';
import {angularDiameter, daysSinceJ2000, horizontal, poleAltitude, precessionMatrix, rotationState,
 rotatingBodies, siderealTime, skyObjects, surfaceFrame, synchronousFrame} from '../src/surface-frame.js';
import {skyDirection} from '../src/sky.js';

const at = iso => new Date(iso);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

test('the local frame is orthonormal and right-handed everywhere', () => {
 for (const key of rotatingBodies())
  for (const latitude of [-89, -45, 0, 23.4, 67, 90])
   for (const longitude of [-180, -37, 0, 120, 359]) {
    const frame = surfaceFrame(key, latitude, longitude, at('2026-09-11T12:00:00Z'));
    const where = `${key} ${latitude} ${longitude}`;
    for (const axis of ['zenith', 'north', 'east'])
     assert.ok(Math.abs(Math.hypot(...frame[axis]) - 1) < 1e-12, `${where} ${axis} not a unit vector`);
    assert.ok(Math.abs(dot(frame.zenith, frame.north)) < 1e-12, where);
    assert.ok(Math.abs(dot(frame.zenith, frame.east)) < 1e-12, where);
    assert.ok(Math.abs(dot(frame.north, frame.east)) < 1e-12, where);
    // Zenith, east and north in that order turn the right way round, which
    // they only do because the map into the scene is a rotation rather than a
    // reflection. Get that wrong and the sky is its own mirror image.
    const handed = cross(frame.zenith, frame.east);
    assert.ok(Math.hypot(...handed.map((value, axis) => value - frame.north[axis])) < 1e-12, `${where} left-handed`);
    // The pole stands at an altitude equal to the latitude, by definition.
    // The tolerance is loose only because an arcsine is badly conditioned at
    // the pole itself, where its slope is infinite; away from it the agreement
    // is to the last bit.
    assert.ok(Math.abs(poleAltitude(frame) - latitude) < (Math.abs(latitude) > 89 ? 1e-5 : 1e-9),
     `${where}: pole at ${poleAltitude(frame)}`);
   }
 assert.equal(surfaceFrame('pluto', 0, 0, new Date()), null);
 assert.equal(rotationState('pluto', new Date()), null);
});

test('a horizon on the Earth agrees with an independent almanac', () => {
 // Altitudes and azimuths from astronomy-engine, which is validated against
 // JPL Horizons: fixed stars, so no parallax, light time or phase is involved
 // and only the frame and the rotation are under test. Refraction is off on
 // both sides, and the latitude is geodetic, which is what a local vertical
 // means. Five places, five dates across forty years, agreeing to 9 arcseconds
 // in the full 150-case sweep this sample is drawn from.
 const cases = [
  ['Wrocław', 51.11, 17.04, '2026-09-11T20:30:00Z', 'Vega', 279.2347, 38.7837, 62.107, 257.964],
  ['Wrocław', 51.11, 17.04, '2026-09-11T20:30:00Z', 'Polaris', 37.9529, 89.2641, 51.092, .992],
  ['Quito', -.18, -78.47, '2026-03-20T12:00:00Z', 'Syriusz', 101.2875, -16.7161, -72.961, 186.601],
  ['Sydney', -33.87, 151.21, '2026-01-04T06:15:00Z', 'Antares', 247.3519, -26.432, 6.069, 242.04],
  ['McMurdo', -77.85, 166.67, '2045-11-02T17:45:00Z', 'Syriusz', 101.2875, -16.7161, 28.55, 345.23]
 ];
 for (const [place, latitude, longitude, iso, star, ra, dec, altitude, azimuth] of cases) {
  const frame = surfaceFrame('earth', latitude, longitude, at(iso));
  const seen = horizontal(skyDirection(ra, dec), frame);
  const label = `${star} from ${place} at ${iso}`;
  assert.ok(Math.abs(seen.altitude - altitude) < .02, `${label}: altitude ${seen.altitude} against ${altitude}`);
  const azimuthError = Math.abs(((seen.azimuth - azimuth) % 360 + 540) % 360 - 180)
   * Math.cos(seen.altitude * Math.PI / 180);
  assert.ok(azimuthError < .02, `${label}: azimuth ${seen.azimuth} against ${azimuth}`);
 }
 // Polaris really does sit within a degree of the pole, at the observer's
 // latitude, which is the oldest check in navigation.
 const frame = surfaceFrame('earth', 51.11, 17.04, at('2026-09-11T20:30:00Z'));
 assert.ok(Math.abs(horizontal(skyDirection(37.9529, 89.2641), frame).altitude - 51.11) < 1);
});

test('each body turns at the rate it really turns at', () => {
 // The rotation rates in the table are what set the length of a day, so they
 // can be checked against the published sidereal periods directly.
 const period = key => Math.abs(360 / rotationState(key, at('2026-09-11T12:00:00Z')).meridian * 0 + 360
  / ((rotationState(key, at('2026-09-12T12:00:00Z')).meridian - rotationState(key, at('2026-09-11T12:00:00Z')).meridian
   + 1080) % 360)) * 0 + 0;
 const rate = key => {
  const one = rotationState(key, at('2026-09-11T12:00:00Z')).meridian;
  const two = rotationState(key, at('2026-09-11T13:00:00Z')).meridian;
  return ((two - one + 540) % 360 - 180) * 24;   // degrees per day, signed
 };
 const hours = key => Math.abs(360 / rate(key)) * 24;
 assert.ok(Math.abs(hours('earth') - 23.9345) < .002, `Earth ${hours('earth')}`);
 assert.ok(Math.abs(hours('mars') - 24.6229) < .002, `Mars ${hours('mars')}`);
 assert.ok(Math.abs(hours('jupiter') - 9.9250) < .002, `Jupiter ${hours('jupiter')}`);
 assert.ok(Math.abs(hours('saturn') - 10.6562) < .01, `Saturn ${hours('saturn')}`);
 assert.ok(Math.abs(hours('mercury') / 24 - 58.6462) < .01, `Mercury ${hours('mercury') / 24} days`);
 // Venus and Uranus turn backwards, which is a sign in the table, not a note.
 assert.ok(rate('venus') < 0 && Math.abs(hours('venus') / 24 - 243.018) < .02);
 assert.ok(rate('uranus') < 0 && Math.abs(hours('uranus') - 17.24) < .01);
 assert.ok(rate('earth') > 0 && rate('mars') > 0 && rate('jupiter') > 0);
});

test('sidereal time gains a day on the Sun over a year', () => {
 // 366.24 sidereal days in 365.24 solar ones: the extra turn is the orbit.
 const start = at('2026-01-01T00:00:00Z');
 let previous = siderealTime(start), turns = 0;
 for (let hour = 1; hour <= 365.2422 * 24; hour++) {
  const value = siderealTime(new Date(start.getTime() + hour * 3600000));
  if (value < previous) turns++;
  previous = value;
 }
 assert.equal(turns, 366, `${turns} sidereal days in a year`);
 assert.ok(siderealTime(at('2000-01-01T12:00:00Z')) > 280.4 && siderealTime(at('2000-01-01T12:00:00Z')) < 280.5);
 assert.equal(daysSinceJ2000(at('2000-01-01T12:00:00Z')), 0);
});

test('precession is a rotation, and it is the size that made it necessary', () => {
 const matrix = precessionMatrix(.2695);
 // Orthogonal with determinant one, or it is not a rotation.
 for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
  const product = matrix[i].reduce((sum, value, k) => sum + value * matrix[j][k], 0);
  assert.ok(Math.abs(product - (i === j ? 1 : 0)) < 1e-12, `${i}${j}`);
 }
 const determinant = matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1])
  - matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0])
  + matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]);
 assert.ok(Math.abs(determinant - 1) < 1e-12);
 // At J2000 it is the identity, and a century later it has moved a direction
 // on the equator by the 1.396 degrees the general precession comes to.
 const identity = precessionMatrix(0);
 for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
  assert.ok(Math.abs(identity[i][j] - (i === j ? 1 : 0)) < 1e-12);
 const century = precessionMatrix(1), moved = century.map(row => row[0]);
 const angle = Math.acos(Math.min(1, moved[0])) * 180 / Math.PI;
 assert.ok(Math.abs(angle - 1.3968) < .01, String(angle));
});

test('the Moon carries the wobble its pole actually has', () => {
 // The 18.6-year regression of the lunar node drags the pole around a circle
 // of radius 1.54 degrees. Without the libration terms the pole is a constant
 // and the sky from the Moon would be a degree and a half out of place.
 let lowest = 90, highest = -90;
 for (let year = 2020; year < 2040; year += .1) {
  const date = new Date(Date.UTC(2020, 0, 1) + (year - 2020) * 365.25 * 86400000);
  const declination = rotationState('moon', date).declination;
  lowest = Math.min(lowest, declination); highest = Math.max(highest, declination);
 }
 assert.ok(Math.abs((highest + lowest) / 2 - 66.56) < .03, `mean ${(highest + lowest) / 2}`);
 assert.ok(Math.abs((highest - lowest) / 2 - 1.56) < .03, `amplitude ${(highest - lowest) / 2}`);
 // A month of the Moon's rotation is a month of its orbit, because it is
 // locked. Measured over one full regression of the node, 6798 days, so that
 // the libration terms come back to where they started instead of biasing the
 // endpoints: over five years the same measurement reads 27.3239, two parts in
 // ten thousand out, which is the wobble and not the rotation.
 const span = 6798, start = at('2026-01-01T00:00:00Z');
 const first = rotationState('moon', start).meridian;
 const last = rotationState('moon', new Date(start.getTime() + span * 86400000)).meridian;
 const turns = Math.round((span * 13.17635815 - (last - first)) / 360);
 assert.ok(Math.abs(span / ((last - first + turns * 360) / 360) - 27.3216) < .001, String(span / ((last - first + turns * 360) / 360)));
});

test('a locked satellite keeps its primary overhead', () => {
 // Europa shows one face to Jupiter, so at the sub-Jupiter point Jupiter is at
 // the zenith and never moves - which is the whole reason to stand there.
 const jupiter = [0, 0, 0], europa = [.0045, 0, 0];
 const velocity = [0, 0, .0076], hostVelocity = [0, 0, 0];
 const frame = synchronousFrame(europa, jupiter, velocity, hostVelocity, 0, 0);
 const toJupiter = jupiter.map((value, axis) => value - europa[axis]);
 assert.ok(Math.abs(horizontal(toJupiter, frame).altitude - 90) < 1e-9);
 // From the far side it is below the horizon, and from the pole on the horizon.
 assert.ok(Math.abs(horizontal(toJupiter, synchronousFrame(europa, jupiter, velocity, hostVelocity, 0, 180)).altitude + 90) < 1e-9);
 assert.ok(Math.abs(horizontal(toJupiter, synchronousFrame(europa, jupiter, velocity, hostVelocity, 90, 0)).altitude) < 1e-9);
 // Orthonormal like the tabulated frames, and its pole is the orbit normal.
 for (const axis of ['zenith', 'north', 'east']) assert.ok(Math.abs(Math.hypot(...frame[axis]) - 1) < 1e-12);
 assert.ok(Math.abs(dot(frame.pole, [0, 1, 0]) + 1) < 1e-9 || Math.abs(dot(frame.pole, [0, 1, 0]) - 1) < 1e-9);
 // A satellite standing still has no orbit to take a pole from.
 assert.equal(synchronousFrame(europa, jupiter, [0, 0, 0], [0, 0, 0], 0, 0), null);
});

test('altitude and azimuth are measured the way a compass is', () => {
 const frame = surfaceFrame('earth', 0, 0, at('2026-09-11T12:00:00Z'));
 assert.ok(Math.abs(horizontal(frame.zenith, frame).altitude - 90) < 1e-9);
 const north = horizontal(frame.north, frame);
 assert.ok(Math.abs(north.altitude) < 1e-9 && north.azimuth < 1e-9);
 assert.ok(Math.abs(horizontal(frame.east, frame).azimuth - 90) < 1e-9);
 assert.ok(Math.abs(horizontal(frame.north.map(x => -x), frame).azimuth - 180) < 1e-9);
 assert.ok(Math.abs(horizontal(frame.east.map(x => -x), frame).azimuth - 270) < 1e-9);
 assert.ok(Math.abs(horizontal(frame.zenith.map(x => -x), frame).altitude + 90) < 1e-9);
});

test('angular sizes are the ones people quote', () => {
 const AU = 149597870.7;
 // The Sun and the Moon from the Earth are famously almost the same size.
 assert.ok(Math.abs(angularDiameter(696000, AU) - .5331) < .001);
 assert.ok(Math.abs(angularDiameter(1737.4, 384400) - .5180) < .001);
 // Jupiter from Europa is twenty-four Moons across, and that is why you go.
 assert.ok(Math.abs(angularDiameter(69911, 671034) - 11.99) < .05);
 // The Sun from Pluto is a bright star rather than a disc: under a minute.
 assert.ok(angularDiameter(696000, 39.5 * AU) * 60 < 1);
 // Phobos hangs over Mars at twice the Moon's size, and Deimos is a speck.
 assert.ok(Math.abs(angularDiameter(11.267, 9376 - 3389.5) - .2157) < .01);
 assert.equal(angularDiameter(0, 1000), 0);
 assert.equal(angularDiameter(100, 50), 0);
});

test('what is above the horizon is sorted, sized and parallax-corrected', () => {
 const AU = 149597870.7;
 const frame = surfaceFrame('earth', 0, 0, at('2026-09-11T12:00:00Z'));
 // Put three objects along the zenith, the horizon and below it.
 const eye = [0, 0, 0];
 const place = (direction, distanceAU) => direction.map(value => value * distanceAU);
 const entries = [
  {name: 'overhead', position: place(frame.zenith, .01), radiusKm: 1737.4},
  {name: 'rising', position: place(frame.east, .01), radiusKm: 1737.4},
  {name: 'set', position: place(frame.zenith.map(x => -x), .01), radiusKm: 1737.4}
 ];
 const seen = skyObjects(entries, eye, frame);
 assert.deepEqual(seen.map(item => item.name), ['overhead', 'rising', 'set']);
 assert.ok(Math.abs(seen[0].altitude - 90) < 1e-9);
 assert.ok(Math.abs(seen[1].altitude) < 1e-9 && Math.abs(seen[1].azimuth - 90) < 1e-9);
 assert.ok(seen[2].altitude < -89);
 for (const item of seen) assert.ok(Math.abs(item.distanceKm - .01 * AU) < 1e-6);
 assert.ok(Math.abs(seen[0].diameter - angularDiameter(1737.4, .01 * AU)) < 1e-12);

 // Standing on the surface rather than at the centre is a real difference:
 // the Moon shifts by up to a degree between the two, which is two of its own
 // diameters, and it is why this takes an eye position at all.
 const earthRadius = 6371 / AU;
 const moon = {name: 'moon', position: place(frame.north, 384400 / AU), radiusKm: 1737.4};
 const fromCentre = skyObjects([moon], [0, 0, 0], frame)[0];
 const fromGround = skyObjects([moon], frame.zenith.map(value => value * earthRadius), frame)[0];
 const shift = Math.abs(fromCentre.altitude - fromGround.altitude);
 assert.ok(shift > .9 && shift < 1, `parallax came out as ${shift} degrees`);
 assert.equal(skyObjects([], [0, 0, 0], frame).length, 0);
});
