// Read-only helpers behind the sky detail panel. Everything here is derived from
// the shipped catalogues rather than typed in by hand, so the numbers a viewer
// sees stay consistent with what is actually drawn on the sphere.

// Sexagesimal is how catalogues quote sky coordinates, and it is what a viewer
// will find again in any atlas or planetarium program.
export function formatRightAscension(degrees) {
 const hours = ((degrees % 360) + 360) % 360 / 15;
 const whole = Math.floor(hours), minutes = Math.round((hours - whole) * 60);
 return minutes === 60 ? `${(whole + 1) % 24}h 00m` : `${whole}h ${String(minutes).padStart(2, '0')}m`;
}

export function formatDeclination(degrees) {
 const sign = degrees < 0 ? '−' : '+', total = Math.abs(degrees);
 const whole = Math.floor(total), minutes = Math.round((total - whole) * 60);
 return minutes === 60 ? `${sign}${whole + 1}° 00′` : `${sign}${whole}° ${String(minutes).padStart(2, '0')}′`;
}

// Apparent size reads better in degrees once an object is larger than the Moon.
export function formatAngularSize(arcmin) {
 return arcmin >= 60 ? `${Number((arcmin / 60).toFixed(1))}°` : `${Math.round(arcmin)}′`;
}

export function equatorialToVector(raDegrees, decDegrees) {
 const ra = raDegrees * Math.PI / 180, dec = decDegrees * Math.PI / 180, cos = Math.cos(dec);
 return [cos * Math.cos(ra), cos * Math.sin(ra), Math.sin(dec)];
}

// Constellation figures are drawn between catalogue stars, so the brightest star
// of a figure can be looked up instead of being asserted. A coarse declination
// grid keeps 89 figures x ~20 vertices from scanning 41 000 stars each time.
export function createStarIndex(stars, {bands = 180} = {}) {
 const buckets = Array.from({length: bands}, () => []);
 const band = dec => Math.min(bands - 1, Math.max(0, Math.floor((dec + 90) / 180 * bands)));
 for (let index = 0; index < stars.count; index++) buckets[band(stars.dec[index] / 180)].push(index);
 return {
  stars, bands, band,
  // Brightest catalogue star within `tolerance` degrees of the given direction.
  nearest(raDegrees, decDegrees, tolerance = .12) {
   const centre = band(decDegrees), reach = Math.max(1, Math.ceil(tolerance / (180 / bands)));
   const [x, y, z] = equatorialToVector(raDegrees, decDegrees);
   const limit = Math.cos(tolerance * Math.PI / 180);
   let best = null;
   for (let b = centre - reach; b <= centre + reach; b++) {
    if (b < 0 || b >= bands) continue;
    for (const index of buckets[b]) {
     const [sx, sy, sz] = equatorialToVector(stars.ra[index] * 360 / 65536, stars.dec[index] / 180);
     if (sx * x + sy * y + sz * z < limit) continue;
     const magnitude = stars.mag[index] / 100;
     if (!best || magnitude < best.magnitude) best = {index, magnitude};
    }
   }
   return best;
  }
 };
}

// `vertices` are the figure's line endpoints as [raDegrees, decDegrees] pairs.
export function brightestFigureStar(vertices, index, names = []) {
 let best = null;
 for (const [ra, dec] of vertices) {
  const found = index.nearest(ra, dec);
  if (found && (!best || found.magnitude < best.magnitude)) best = {...found, ra, dec};
 }
 if (!best) return null;
 // Proper names are only catalogued for the brightest few dozen stars, so most
 // figures resolve to a magnitude alone.
 const named = names.find(star => Math.abs(star.mag - best.magnitude) < .06 &&
  equatorialToVector(star.ra, star.dec).reduce((sum, value, axis) => sum + value * equatorialToVector(best.ra, best.dec)[axis], 0) > Math.cos(.2 * Math.PI / 180));
 return {magnitude: best.magnitude, name: named?.name || null};
}
