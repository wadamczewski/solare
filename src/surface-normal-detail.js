// Turns an 8-bit height field into a tangent-space normal map, so ground
// lighting responds to real slope instead of the screen-space bump trick
// (Three's own dFdx/dFdy bump chunk goes soft or dead flat once a surface
// view is zoomed in far enough that one screen pixel covers less than one
// texel of a several-thousand-kilometre global map, which is exactly the
// situation standing on the ground puts it in).
//
// The field is addressed row-major, row 0 first, matching both a JPEG
// decoder's output and the DataTexture layout the procedural height map
// already uses elsewhere in this codebase - so a normal map built from a
// given height field always tilts the same way that field's own
// displacement already bulges, without needing to agree on a shared idea
// of "north" or "east" with anything else. Longitude (u) wraps at the
// texture edge; latitude (v) does not, matching an equirectangular map's
// poles.
//
// Output is packed as the standard OpenGL-style tangent-space encoding
// consumed by Three.js's own automatic (no precomputed mesh tangents)
// normal mapping: R=x*.5+.5, G=y*.5+.5, B=z*.5+.5, with an unperturbed
// texel encoding to (128,128,255).
export function heightFieldToNormals(field, width, rows, {relief, worldStepU, worldStepV}) {
 if (width < 2 || rows < 2) throw new RangeError('a height field needs at least a 2x2 grid to take a gradient of');
 const out = new Uint8ClampedArray(width * rows * 3);
 const heightAt = (x, y) => (field[y * width + x] / 255) * relief;
 for (let y = 0; y < rows; y++) {
  const y0 = Math.max(0, y - 1), y1 = Math.min(rows - 1, y + 1), vSpan = (y1 - y0) * worldStepV;
  for (let x = 0; x < width; x++) {
   const x0 = (x - 1 + width) % width, x1 = (x + 1) % width;
   const dHdu = (heightAt(x1, y) - heightAt(x0, y)) / (2 * worldStepU);
   const dHdv = vSpan > 0 ? (heightAt(x, y1) - heightAt(x, y0)) / vSpan : 0;
   // The surface tilts away from rising ground, exactly as Three's own
   // bump chunk (perturbNormalArb) subtracts its height gradient.
   const nx = -dHdu, ny = -dHdv, nz = 1, length = Math.hypot(nx, ny, nz);
   const index = (y * width + x) * 3;
   out[index] = (nx / length) * 127.5 + 127.5;
   out[index + 1] = (ny / length) * 127.5 + 127.5;
   out[index + 2] = (nz / length) * 127.5 + 127.5;
  }
 }
 return out;
}

// A body's equatorial and polar texel spacing in the same sphere-radius
// units as its relief scale, for an equirectangular map of the given size.
export function equirectangularTexelSpan(width, rows, radius = 1) {
 return {worldStepU: (2 * Math.PI * radius) / width, worldStepV: (Math.PI * radius) / rows};
}

const wrappedRandom = (i, seed) => {
 const value = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
 return value - Math.floor(value);
};

// The frequencies are whole numbers of cycles per tile, so the sum below is
// exactly periodic in x and y at (width, rows) by construction: shifting x
// by a multiple of width (or y by a multiple of rows) adds a whole multiple
// of 2*PI inside every sin(), leaving the value unchanged. That is what lets
// GL_REPEAT tile this with no seam - unlike the value noise used for the
// planet-scale relief field above, which is never tiled and doesn't need
// the property. Exposed on its own (rather than folded into
// seamlessHeightField) so that periodicity is a directly checkable fact
// about a single sample, not something a test has to infer from an array.
export function seamlessNoiseTerms(seed = 1, termCount = 10) {
 const terms = [];
 for (let i = 0; i < termCount; i++) {
  terms.push({
   fx: 1 + Math.floor(wrappedRandom(i * 4, seed) * 5),
   fy: 1 + Math.floor(wrappedRandom(i * 4 + 1, seed) * 5),
   phase: wrappedRandom(i * 4 + 2, seed) * 2 * Math.PI,
   amplitude: .3 + .7 * wrappedRandom(i * 4 + 3, seed)
  });
 }
 return terms;
}
export function seamlessNoiseAt(x, y, width, rows, terms) {
 let sum = 0, totalAmplitude = 0;
 for (const t of terms) {
  sum += t.amplitude * Math.sin(2 * Math.PI * t.fx * x / width + 2 * Math.PI * t.fy * y / rows + t.phase);
  totalAmplitude += t.amplitude;
 }
 return sum / totalAmplitude * .5 + .5; // 0..1
}

// A height field that repeats exactly at its own width and height, for a
// small texture meant to be tiled hundreds of times across a body's ground
// (close-up grain) rather than wrapped once around it like the planet-scale
// relief above.
export function seamlessHeightField(width, rows, seed = 1, termCount = 10) {
 const terms = seamlessNoiseTerms(seed, termCount), field = new Uint8Array(width * rows);
 for (let y = 0; y < rows; y++) for (let x = 0; x < width; x++) field[y * width + x] = Math.round(seamlessNoiseAt(x, y, width, rows, terms) * 255);
 return field;
}
