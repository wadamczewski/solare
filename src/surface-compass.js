// Bearing math shared by the surface-view radar: how a tracked body's
// compass bearing relates to the observer's current heading, and where that
// relative direction sits on the radar's sky sphere.
//
// Bearings are measured clockwise from north, just like the local horizon
// produced by surface-frame.js.
export const relativeBearing = (bearing, heading) => ((bearing - heading + 540) % 360) - 180;

// A direction given as a bearing relative to the observer (0 = straight
// ahead, positive = to the right) and an altitude above the horizon, placed
// on the surface of a sphere of the given radius centred on the observer -
// the sky dome the radar widget renders. +Z is dead ahead (so it faces the
// fixed camera looking at the sphere from the front), +Y is the zenith, +X
// is to the observer's right: turning right increases the relative bearing
// of everything around the observer, which is exactly what sweeps a body
// from dead ahead toward the right-hand side of the rendered sphere.
export function sphericalToRadar(relativeAzimuthDeg, altitudeDeg, radius = 1) {
 const az = relativeAzimuthDeg * Math.PI / 180, alt = altitudeDeg * Math.PI / 180, cosAlt = Math.cos(alt);
 return {x: Math.sin(az) * cosAlt * radius, y: Math.sin(alt) * radius, z: Math.cos(az) * cosAlt * radius};
}
