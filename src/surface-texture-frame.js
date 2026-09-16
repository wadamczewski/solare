// Three.js sphere UVs place U=.5 (the centre of an equirectangular map) on
// local +X, while U=.75 is local -Z. For geographic maps those directions are
// Greenwich and 90° east respectively.
export function equirectangularSurfaceBasis(frame) {
 return {
  x: [...frame.prime],
  y: [...frame.pole],
  z: frame.quarter.map(value => value === 0 ? 0 : -value)
 };
}

// The same calibration, inverted: where a given latitude/longitude sits on
// the sphere mesh's own unit-radius surface, in the mesh's local frame
// (before whatever rotation is currently animating it - the decorative spin
// in the ordinary view, or the astronomically exact one set on entering
// surface view). A point placed here as a child of the mesh follows the
// mesh's own rotation exactly the way the ground texture does, since both
// are defined in the same local space. Longitude is planetocentric and
// measured east, matching the rest of the application.
export function localSurfacePoint(latitudeDeg, longitudeDeg) {
 const lat = latitudeDeg * Math.PI / 180, lon = longitudeDeg * Math.PI / 180, cosLat = Math.cos(lat);
 return [cosLat * Math.cos(lon), Math.sin(lat), -cosLat * Math.sin(lon)];
}
