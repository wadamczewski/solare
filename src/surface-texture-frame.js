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
