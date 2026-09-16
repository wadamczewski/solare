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
