import {rotationState,rotationSense} from './surface-frame.js';
import {equatorialToScene} from './sky.js';

// Which way each body's spin axis points in the scene, and which plane its
// moons orbit in.
//
// The scene used to tilt every spin axis by the body's obliquity towards one
// fixed direction (scene -X) and to lay every moon's orbit in one shared plane
// per planet, tipped about a different axis (scene X). The two never agreed:
// Saturn's moons crossed its own rings at 27 degrees, Uranus's at 90, and the
// velocity was set so that every regular moon went round its planet the wrong
// way. The spin axis now takes its direction from the IAU rotational elements
// (Archinal et al. 2018, already used by the surface view) and its angle from
// the body's own tilt, and a moon's orbit is built around that same axis.

const DEG = Math.PI / 180;
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = v => {const length = Math.hypot(...v); return length > 1e-12 ? v.map(x => x / length) : null;};

// The right-handed spin pole of a body with IAU rotational elements, as a
// scene-frame unit vector: the IAU north pole for eastward rotators and its
// opposite for Venus and Uranus, whose IAU "north" is the pole on the north
// side of the invariable plane while they turn the other way about it.
export function iauSpinPole(key, date) {
 const state = rotationState(key, date), sense = rotationSense(key);
 if (!state || !sense) return null;
 const a = state.rightAscension * DEG, d = state.declination * DEG;
 return equatorialToScene([Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)]).map(x => x * sense);
}

// Azimuth of a spin pole around the scene's ecliptic pole (+Y), measured in the
// XZ plane - the only part of the IAU pole the scene needs, because the angle
// from the ecliptic pole stays the body's own editable tilt.
export function poleAzimuth(pole) {
 return pole && Math.hypot(pole[0], pole[2]) > 1e-9 ? Math.atan2(pole[2], pole[0]) : null;
}

// The spin axis the renderer draws and moons orbit around. A body without an
// azimuth keeps the scene's old convention (tilted towards -X), so user-made
// bodies and collision fragments look exactly as before.
export function spinAxis(body) {
 const tilt = (Number(body?.tilt) || 0) * DEG, azimuth = Number.isFinite(body?.poleAzimuth) ? body.poleAzimuth : Math.PI;
 return [Math.cos(azimuth) * Math.sin(tilt), Math.cos(tilt), Math.sin(azimuth) * Math.sin(tilt)];
}

// Position and velocity of a satellite relative to its host, in the scene
// frame, on a Keplerian ellipse. `reference` is the pole of the plane the
// inclination is measured from - the host's equator for regular moons, the
// ecliptic for a distant irregular one such as Nereid. The line of nodes and
// the orbital phase are composed (no ephemeris exists here for most moons);
// the pericentre is placed at the node. The orbit runs counter-clockwise
// about its own normal, so an inclination past 90 degrees (Triton) is
// retrograde by itself - no separate sign is needed.
export function satelliteState({mu, a, e = 0, inclinationDeg = 0, nodeRad = 0, phaseRad = 0, reference = [0, 1, 0]}) {
 const pole = norm(reference) || [0, 1, 0];
 const e1 = norm(cross([0, 1, 0], pole)) || [1, 0, 0], e2 = cross(pole, e1);
 const node = e1.map((x, k) => x * Math.cos(nodeRad) + e2[k] * Math.sin(nodeRad));
 const i = inclinationDeg * DEG, side = cross(node, pole);
 const normal = pole.map((x, k) => x * Math.cos(i) + side[k] * Math.sin(i));
 const along = cross(normal, node), p = a * (1 - e * e), nu = phaseRad;
 const r = p / (1 + e * Math.cos(nu)), speed = Math.sqrt(mu / p);
 return {
  p: node.map((x, k) => r * (Math.cos(nu) * x + Math.sin(nu) * along[k])),
  v: node.map((x, k) => speed * (-Math.sin(nu) * x + (e + Math.cos(nu)) * along[k])),
  normal
 };
}
