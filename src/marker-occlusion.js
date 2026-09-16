// Whether a straight line from an observer to some target point is blocked
// by the solid disc of another, nearer body - the same question an eclipse
// asks of sunlight, just aimed at whatever is standing in for a light ray
// here: the observer's own line of sight. A sky label or radar blip has no
// partial state the way an eclipse's penumbra does, so this only needs a
// yes/no answer: is *anything* opaque in the way, not how much of it.
//
// Positions are plain [x, y, z] triples in any consistent length unit (the
// caller's scene units); `bodies` are {id, position, radius} candidates in
// the same units. Kept free of THREE so the geometry is directly testable.
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const length = v => Math.hypot(v[0], v[1], v[2]);
const scale = (v, k) => [v[0] * k, v[1] * k, v[2] * k];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// The nearer body (if any) whose disc, as seen from `observer`, covers the
// direction toward `target` before the line of sight ever reaches it.
// `targetId` is excluded from the candidate list so a body never blocks its
// own marker, and a candidate farther away than the target - or the
// observer standing inside it - is never a valid blocker either.
export function findOccluder(observer, target, targetId, bodies) {
 const toTarget = sub(target, observer), targetDistance = length(toTarget);
 if (!(targetDistance > 0)) return null;
 const targetDirection = scale(toTarget, 1 / targetDistance);
 let closest = null, closestDistance = Infinity;
 for (const body of bodies) {
  if (body.id === targetId || !(body.radius > 0)) continue;
  const toBody = sub(body.position, observer), bodyDistance = length(toBody);
  if (!(bodyDistance > body.radius) || bodyDistance >= targetDistance || bodyDistance >= closestDistance) continue;
  const bodyDirection = scale(toBody, 1 / bodyDistance);
  const separation = Math.acos(clamp(dot(targetDirection, bodyDirection), -1, 1));
  const angularRadius = Math.asin(clamp(body.radius / bodyDistance, 0, .99995));
  if (separation < angularRadius) { closest = body; closestDistance = bodyDistance; }
 }
 return closest;
}

// True exactly when the target itself - not some unrelated third body - is
// what a marker would be drawn for, and it turns out to be hidden.
export const isOccluded = (observer, target, targetId, bodies) => findOccluder(observer, target, targetId, bodies) !== null;
