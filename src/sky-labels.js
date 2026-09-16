// Pure geometry for the surface-view sky labels: turning an object already
// projected into camera clip space (or its real size) into where an HTML
// marker belongs on screen and how large its outline ring should be. Kept
// free of THREE and the DOM so the placement math is directly testable;
// main.js does the actual Vector3.project(camera) call and hands the three
// clip-space numbers in here.

// Clip-space x/y/z (as THREE's Vector3.project gives back) to a pixel
// position, plus whether the point is worth showing at all: in front of the
// camera (z inside the near/far mapping) and not far enough outside the
// frame to be pointless to draw. A small margin past the edges (rather than
// exactly 1) keeps a marker attached while it is dragged across the border
// instead of popping in and out at the last pixel.
export function projectedPoint(clipX, clipY, clipZ, innerWidth, innerHeight, margin = 1.08) {
 const visible = clipZ > -1 && clipZ < 1 && Math.abs(clipX) < margin && Math.abs(clipY) < margin;
 return {x: (clipX + 1) * innerWidth / 2, y: (1 - clipY) * innerHeight / 2, visible};
}

// The on-screen radius, in pixels, of a sphere of the given (scene-unit)
// radius seen from `distance` away through a camera with vertical field of
// view `fovDegrees` - the same small-angle projection the automation API
// already uses for window.solare.getView().bodies[].pixels, so the ring
// matches the body's actual rendered disc when that disc is big enough to
// see. At true interplanetary scale a planet is a physical point, so the
// result is clamped the same way the deep-sky ring is: a label exists to be
// seen, and a sub-pixel ring around Saturn defeats the purpose of drawing
// one at all.
export function ringPixelRadius(radius, distance, fovDegrees, innerHeight, {min = 9, max = 140} = {}) {
 if (distance <= 0) return min;
 const pixels = radius * innerHeight / (2 * distance * Math.tan(fovDegrees * Math.PI / 360));
 return Math.max(min, Math.min(max, pixels));
}

// The same idea for a deep-sky object, which has no scene-unit radius, only
// a real angular size in arcminutes. Clamped so a point-like object still
// gets a visible ring and a huge one (the Magellanic Clouds, say) doesn't
// swallow the screen.
export function deepSkyRingPixelRadius(arcminutes, fovDegrees, innerHeight, {min = 9, max = 120} = {}) {
 const angularRadiusDeg = (arcminutes || 0) / 60 / 2;
 const pixels = angularRadiusDeg / fovDegrees * innerHeight;
 return Math.max(min, Math.min(max, pixels));
}

// Whether the camera has rotated enough since a label overlay was last
// painted to be worth repainting right now, instead of waiting for the next
// periodic refresh. Quaternions are plain [x,y,z,w] arrays (kept free of
// THREE, like the rest of this module) so the caller can hand in
// camera.quaternion's own components directly. The angle between two unit
// quaternions is 2*acos(|dot|); the dot product is clamped to [-1,1] first
// since floating-point drift can push it a hair past that and turn acos into
// NaN, and the absolute value folds away the harmless q/-q sign ambiguity
// (the same orientation can be represented by either). Comparing an angle
// rather than a raw dot product keeps the epsilon meaningful on its own
// terms - an actual angular tolerance - rather than an arbitrary number that
// would need re-tuning if the comparison math ever changed.
export function quaternionChanged(previous, current, epsilonRadians = 1e-4) {
 const dot = Math.max(-1, Math.min(1,
  previous[0] * current[0] + previous[1] * current[1] + previous[2] * current[2] + previous[3] * current[3]));
 return 2 * Math.acos(Math.abs(dot)) > epsilonRadians;
}
