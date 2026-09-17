// A body far enough away, or physically small enough, to draw as only a
// handful of screen pixels - or fewer - is nearly impossible to click
// precisely by hitting its exact rendered geometry: at that size, the
// difference between a hit and a miss is a single pixel of mouse position.
// This picks the nearest candidate whose on-screen marker - its own drawn
// size, or a forgiving minimum, whichever is larger - contains the pointer,
// giving every body at least a small, comfortable click target regardless
// of how few pixels it actually covers.
export function nearestMarkerId(pointer, candidates, minRadius) {
 let bestId = null, bestDistance = Infinity;
 for (const candidate of candidates) {
  const distance = Math.hypot(candidate.x - pointer.x, candidate.y - pointer.y);
  const radius = Math.max(candidate.radius, minRadius);
  if (distance <= radius && distance < bestDistance) { bestId = candidate.id; bestDistance = distance; }
 }
 return bestId;
}
