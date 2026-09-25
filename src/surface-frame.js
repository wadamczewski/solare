import {equatorialToScene, skyDirection} from './sky.js';

// Standing on a body and looking up.
//
// A local horizon needs two things the rest of the application never needed:
// which way the body's spin axis points, and which way it is facing at this
// instant. Both come from the IAU Working Group on Cartographic Coordinates
// and Rotational Elements (Archinal et al. 2018): a pole at right ascension
// a0 and declination d0 in the ICRF, and a prime meridian at angle W from the
// node where the body's equator crosses the ICRF equator.
//
// The Earth is the exception, and deliberately so. Its IAU prime-meridian
// constant is rounded to a value that is a fifth of a degree from sidereal
// time, which is 50 seconds of clock - visible, and the Earth is the one
// horizon a viewer can check against their own sky. It uses Greenwich mean
// sidereal time instead.
//
// Coordinates here are planetocentric latitude and east longitude, measured
// right-handed about the rotation pole. For the Earth that is the ordinary
// geographic system. For Mars and Venus it is not the historical westward
// convention, which is worth knowing before comparing a longitude with a map.
const DEG = Math.PI / 180;
const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0);
export const daysSinceJ2000 = date => (date.getTime() - J2000) / 86400000;

// a0 and d0 in degrees with their per-century rates; w0 and the rotation rate
// in degrees per day. `moonTerms` marks the one body whose pole wanders far
// enough to matter.
const ROTATION = {
 earth: {a0: [0, -.641], d0: [90, -.557], w0: 190.147, rate: 360.9856235, sidereal: true},
 moon: {a0: [269.9949, .0031], d0: [66.5392, .013], w0: 38.3213, rate: 13.17635815, libration: true},
 mercury: {a0: [281.0103, -.0328], d0: [61.4155, -.0049], w0: 329.5988, rate: 6.1385108},
 venus: {a0: [272.76, 0], d0: [67.16, 0], w0: 160.2, rate: -1.4813688},
 mars: {a0: [317.68143, -.1061], d0: [52.8865, -.0609], w0: 176.63, rate: 350.89198226},
 jupiter: {a0: [268.056595, -.006499], d0: [64.495303, .002413], w0: 284.95, rate: 870.536},
 saturn: {a0: [40.589, -.036], d0: [83.537, -.004], w0: 38.9, rate: 810.7939024},
 uranus: {a0: [257.311, 0], d0: [-15.175, 0], w0: 203.81, rate: -501.1600928},
 neptune: {a0: [299.36, 0], d0: [43.46, 0], w0: 249.978, rate: 541.1397757, node: true}
};

// The Moon's pole is dragged around a 1.5-degree circle by the 18.6-year
// regression of its orbital node, so the constant above is never better than a
// degree and a half. These are the IAU libration arguments and the terms that
// reach a hundredth of a degree; together they bring it inside an arcminute.
const LIBRATION = [
 {argument: [125.045, -.0529921], a0: -3.8787, d0: 1.5419, w: 3.561},
 {argument: [250.089, -.1059842], a0: -.1204, d0: .0239, w: .1208},
 {argument: [260.008, 13.0120009], a0: .07, d0: -.0278, w: -.0642},
 {argument: [176.625, 13.3407154], a0: -.0172, d0: .0068, w: .0158},
 {argument: [357.529, .9856003], a0: 0, d0: 0, w: .0252},
 {argument: [311.589, 26.4057084], a0: .0072, d0: -.0029, w: -.0066},
 {argument: [134.963, 13.064993], a0: 0, d0: .0009, w: -.0047},
 {argument: [276.617, .3287146], a0: 0, d0: 0, w: -.0046},
 {argument: [34.226, 1.7484877], a0: 0, d0: 0, w: .0028},
 {argument: [15.134, -.1589763], a0: -.0052, d0: .0008, w: .0052},
 {argument: [119.743, .0036096], a0: 0, d0: 0, w: .004},
 {argument: [239.961, .1643573], a0: 0, d0: 0, w: .0019},
 {argument: [25.053, 12.9590088], a0: .0043, d0: -.0009, w: -.0044}
];

// Greenwich mean sidereal time in degrees, Meeus 12.4, from UT.
export function siderealTime(date) {
 const d = daysSinceJ2000(date), t = d / 36525;
 return ((280.46061837 + 360.98564736629 * d + .000387933 * t ** 2 - t ** 3 / 38710000) % 360 + 360) % 360;
}

export const rotatingBodies = () => Object.keys(ROTATION);
// +1 when a body turns eastward about its IAU north pole, -1 for the
// retrograde rotators (Venus, Uranus), 0 when it has no tabulated rotation.
export const rotationSense = key => Math.sign(ROTATION[key]?.rate || 0);

// Pole direction and prime-meridian angle for a body at an instant.
export function rotationState(key, date) {
 const element = ROTATION[key];
 if (!element) return null;
 const d = daysSinceJ2000(date), t = d / 36525;
 let a0 = element.a0[0] + element.a0[1] * t;
 let d0 = element.d0[0] + element.d0[1] * t;
 let w = element.w0 + element.rate * d;
 // Neptune's pole is swung by the precession of Triton's orbit, the one
 // planetary term large enough to see: half a degree of declination.
 if (element.node) {
  const n = (357.85 + 52.316 * t) * DEG;
  a0 += .7 * Math.sin(n); d0 -= .51 * Math.cos(n); w -= .48 * Math.sin(n);
 }
 if (element.libration) for (const term of LIBRATION) {
  const angle = (term.argument[0] + term.argument[1] * d) * DEG;
  a0 += term.a0 * Math.sin(angle); d0 += term.d0 * Math.cos(angle); w += term.w * Math.sin(angle);
 }
 // Sidereal time is measured from the equinox and W from the node of the
 // body's equator, a quarter turn away; the Earth is expressed either way.
 if (element.sidereal) w = siderealTime(date) - a0 - 90;
 return {rightAscension: ((a0 % 360) + 360) % 360, declination: d0, meridian: ((w % 360) + 360) % 360};
}

const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = v => {const length = Math.hypot(...v); return length > 0 ? v.map(x => x / length) : [1, 0, 0];};
const ARCSEC = DEG / 3600;

// Precession of the equator, Meeus 21.2 and 21.3. Sidereal time is an angle
// from the equinox of the date, and every direction in this application is
// referred to J2000, so a horizon built from sidereal time has to be rotated
// back. Fifty arcseconds a year sounds small and is a third of a degree by
// 2026 - two thirds of a Sun, straight off the altitude of everything.
export function precessionMatrix(centuries) {
 const t = centuries;
 const zeta = (2306.2181 * t + .30188 * t ** 2 + .017998 * t ** 3) * ARCSEC;
 const z = (2306.2181 * t + 1.09468 * t ** 2 + .018203 * t ** 3) * ARCSEC;
 const theta = (2004.3109 * t - .42665 * t ** 2 - .041833 * t ** 3) * ARCSEC;
 const cz = Math.cos(zeta), sz = Math.sin(zeta), cZ = Math.cos(z), sZ = Math.sin(z);
 const ct = Math.cos(theta), st = Math.sin(theta);
 return [
  [cz * ct * cZ - sz * sZ, -sz * ct * cZ - cz * sZ, -st * cZ],
  [cz * ct * sZ + sz * cZ, -sz * ct * sZ + cz * cZ, -st * sZ],
  [cz * st, -sz * st, ct]
 ];
}

// From the mean equator of the date back to J2000: the transpose.
const fromDate = (matrix, v) => [0, 1, 2].map(row => matrix.reduce((sum, line, k) => sum + line[row] * v[k], 0));

// Zenith, north and east at a point on a body, as unit vectors in the scene
// frame. Returns null for a body with no rotational elements.
export function surfaceFrame(key, latitudeDeg, longitudeDeg, date) {
 const element = ROTATION[key];
 if (!element) return null;
 const state = rotationState(key, date);
 let pole, prime;
 if (element.sidereal) {
  // The Earth, in the mean equator and equinox of the date: the pole is the
  // axis itself and the prime meridian stands at a right ascension equal to
  // Greenwich sidereal time. Nothing is rounded and nothing is tabulated.
  const theta = siderealTime(date) * DEG;
  pole = [0, 0, 1];
  prime = [Math.cos(theta), Math.sin(theta), 0];
 } else {
  const a0 = state.rightAscension * DEG, d0 = state.declination * DEG;
  pole = [Math.cos(d0) * Math.cos(a0), Math.cos(d0) * Math.sin(a0), Math.sin(d0)];
  // Node of the body's equator on the ICRF equator, a quarter turn ahead of a0.
  const node = [-Math.sin(a0), Math.cos(a0), 0], along = cross(pole, node);
  const meridian = state.meridian * DEG;
  prime = node.map((value, axis) => value * Math.cos(meridian) + along[axis] * Math.sin(meridian));
 }
 // North is written out rather than taken from a cross product with the pole,
 // which vanishes at the poles themselves and would leave the frame undefined
 // exactly where somebody would want to stand to watch the sky turn flat.
 const quarter = cross(pole, prime);
 const latitude = latitudeDeg * DEG, longitude = longitudeDeg * DEG;
 const outward = prime.map((value, axis) => value * Math.cos(longitude) + quarter[axis] * Math.sin(longitude));
 let zenith = outward.map((value, axis) => value * Math.cos(latitude) + pole[axis] * Math.sin(latitude));
 let north = outward.map((value, axis) => -value * Math.sin(latitude) + pole[axis] * Math.cos(latitude));
 let meridianAxis = prime;
 if (element.sidereal) {
  const matrix = precessionMatrix(daysSinceJ2000(date) / 36525);
  zenith = fromDate(matrix, zenith); north = fromDate(matrix, north);
  pole = fromDate(matrix, pole); meridianAxis = fromDate(matrix, meridianAxis);
 }
 const east = cross(north, zenith);
 // The body-fixed axes as well as the local ones: a caller that draws the body
 // has to turn it by the same rotation the horizon was built from, or the
 // ground slides under an observer who is standing still.
 return {zenith: equatorialToScene(zenith), north: equatorialToScene(north), east: equatorialToScene(east),
  pole: equatorialToScene(pole), prime: equatorialToScene(meridianAxis),
  quarter: equatorialToScene(cross(pole, meridianAxis)), meridian: state.meridian};
}

// A satellite that keeps one face to its primary has no independent rotation
// to tabulate: its prime meridian is the point under the primary, and its pole
// is the normal of its orbit. Building the frame from the scene's own geometry
// also keeps it honest for the satellites whose orbital phase is composed
// rather than computed - the primary hangs where the simulation actually put
// it, which is the whole point of standing there.
export function synchronousFrame(bodyPosition, hostPosition, bodyVelocity, hostVelocity, latitudeDeg, longitudeDeg) {
 const toHost = norm(hostPosition.map((value, axis) => value - bodyPosition[axis]));
 const relative = bodyVelocity.map((value, axis) => value - hostVelocity[axis]);
 const momentum = cross(bodyPosition.map((value, axis) => value - hostPosition[axis]), relative);
 if (!(Math.hypot(...momentum) > 0)) return null;
 const pole = norm(momentum);
 // The sub-host point is longitude zero; east follows the direction of travel.
 const prime = norm(toHost.map((value, axis) => value - pole[axis] * dot(toHost, pole)));
 const quarter = cross(pole, prime);
 const latitude = latitudeDeg * DEG, longitude = longitudeDeg * DEG;
 const outward = prime.map((value, axis) => value * Math.cos(longitude) + quarter[axis] * Math.sin(longitude));
 const zenith = outward.map((value, axis) => value * Math.cos(latitude) + pole[axis] * Math.sin(latitude));
 const north = outward.map((value, axis) => -value * Math.sin(latitude) + pole[axis] * Math.cos(latitude));
 return {zenith, north, east: cross(north, zenith), pole, prime, quarter, meridian: 0};
}

// Altitude above the horizon and azimuth from north through east, in degrees.
export function horizontal(direction, frame) {
 const unit = norm(direction);
 const up = dot(unit, frame.zenith);
 return {
  altitude: Math.asin(Math.max(-1, Math.min(1, up))) / DEG,
  azimuth: ((Math.atan2(dot(unit, frame.east), dot(unit, frame.north)) / DEG) % 360 + 360) % 360
 };
}

// Apparent diameter of a sphere, in degrees. The arcsine matters for anything
// close: Jupiter from Europa is eleven degrees across and the small-angle form
// would be half a degree out.
export function angularDiameter(radiusKm, distanceKm) {
 if (!(radiusKm > 0) || !(distanceKm > radiusKm)) return 0;
 return 2 * Math.asin(radiusKm / distanceKm) / DEG;
}

// Direction of the celestial pole as an altitude: the one number that says
// where on the body you are standing, and equal to the latitude by definition.
export const poleAltitude = frame => Math.asin(Math.max(-1, Math.min(1, dot(frame.pole, frame.zenith)))) / DEG;

// What is above the horizon, seen from a point on a body.
//
// `entries` are the other bodies as the scene holds them - a name, a position
// in scene AU and a physical radius in km - and `eye` is where the observer
// stands, also in scene AU. Everything is geometry from there: the direction
// is the real one, so the parallax of standing on the surface rather than at
// the centre is included for free, which for the Moon seen from the Earth is
// up to a degree.
export function skyObjects(entries, eye, frame) {
 const AU = 149597870.7;
 return entries.map(item => {
  const offset = item.position.map((value, axis) => value - eye[axis]);
  const distanceKm = Math.hypot(...offset) * AU;
  return {...item, ...horizontal(offset, frame), distanceKm,
   diameter: angularDiameter(item.radiusKm, distanceKm)};
 }).sort((one, two) => two.altitude - one.altitude);
}
