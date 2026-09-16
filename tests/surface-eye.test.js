import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {moons, planets} from '../src/physics.js';

const source = readFileSync(new URL('../src/main.js', import.meta.url).pathname, 'utf8');

// Standing on a body means placing the eye just outside its surface. Two ways
// of getting that wrong made the ground disappear and the sky show through the
// body, and neither shows up in a unit test of any module - they are a camera
// against a mesh. What can be checked is the arithmetic behind both.
test('the eye clears the lumps of an irregular body', () => {
 // Irregular bodies are drawn as a deformed icosahedron. The deformation
 // reaches well past the nominal radius, so an eye a thousandth of a radius up
 // stands inside the mesh and looks out through its culled back faces: Phobos
 // and Deimos were transparent for exactly this reason.
 const deformation = source.match(/f=1\+(\.\d+)\*Math\.sin\([^)]*\)\+(\.\d+)\*Math\.sin\([^)]*\)/);
 assert.ok(deformation, 'the irregular deformation is no longer where this test looks for it');
 const stretch = source.match(/a\.setXYZ\(i,x\*f\*([\d.]+),y\*f\*([\d.]+),z\*f\)/);
 assert.ok(stretch, 'the irregular axis stretch is no longer where this test looks for it');
 const envelope = (1 + Number(deformation[1]) + Number(deformation[2]))
  * Math.max(Number(stretch[1]), Number(stretch[2]), 1);
 const eye = source.match(/SURFACE_EYE_IRREGULAR\s*=\s*([\d.]+)/);
 assert.ok(eye, 'no irregular eye height to check');
 assert.ok(Number(eye[1]) > envelope,
  `an eye at ${eye[1]} radii is inside a mesh reaching ${envelope.toFixed(3)}`);
 // And not so far out that it stops being a surface view.
 assert.ok(Number(eye[1]) < envelope * 1.5, `an eye at ${eye[1]} radii is a flypast, not a horizon`);
});

test('the near plane follows the eye down to the ground', () => {
 // The near plane is a fixed distance for the rest of the application. An
 // observer on the ground stands a thousandth of a radius above it, which on
 // anything smaller than the Earth is nearer than that plane - the ground
 // itself was being clipped away. Phobos stood 277 near-planes too low.
 assert.match(source, /camera\.near=Math\.max\([\d.e-]+,height\/\d+\)/,
  'the surface view no longer brings the near plane down with the eye');
 assert.match(source, /camera\.near=CAMERA_NEAR/, 'and it has to be put back on the way out');
 const global = Number(source.match(/const CAMERA_NEAR=([\d.]+);/)[1]);
 const AU = 149597870.7;
 // Every body that can be stood on has to end up with the ground in front of
 // the near plane rather than behind it.
 const radii = [...planets.map(row => row[6]), ...moons.map(row => row[4])];
 const divisor = Number(source.match(/camera\.near=Math\.max\([\d.e-]+,height\/(\d+)\)/)[1]);
 const eye = Number(source.match(/SURFACE_EYE\s*=\s*([\d.]+)/)[1]);
 for (const radiusKm of radii) {
  const drawn = radiusKm / AU * 6, height = drawn * (eye - 1);
  assert.ok(height / divisor < height, 'the near plane has to sit inside the eye height');
  // The fixed plane would have swallowed most of them, which is the bug.
  if (radiusKm < 3000) assert.ok(height < global * 3, `${radiusKm} km would have been safe anyway`);
 }
});

test('switching the standing body from its own picker keeps the HUD name in step', () => {
 // window.solare.getView() reports surfaceView.name for automation and
 // debugging; it used to be set once by startSurfaceView and never touched
 // again, so it kept reporting the body a surface view was entered from
 // after picking a different one from the #surface-body select.
 assert.match(source, /surfaceView\.key=body\?\.key;surfaceView\.name=body\?\.name;/);
});
