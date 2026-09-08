import test from 'node:test';
import assert from 'node:assert/strict';
import {cometNucleusGeometry, activity} from '../src/comet.js';

test('the nucleus is finely tessellated and free of flat facets',()=>{
 const geometry = cometNucleusGeometry(7);
 const position = geometry.attributes.position;
 // Three splits each icosahedron edge into (detail + 1) parts: 20 * 13^2 = 3380
 // faces at the default detail 12, against 20 * 3^2 = 180 at the old detail 2.
 assert.equal(position.count, 3380 * 3);
 assert.ok(position.count > 180 * 3 * 18, 'far denser than the faceted original');
 assert.ok(geometry.attributes.normal, 'normals are recomputed for smooth shading');
});

test('the shape is a two-lobed body, not a sphere',()=>{
 const position = cometNucleusGeometry(3, 3).attributes.position;
 const radii = [];
 for(let i = 0; i < position.count; i++)
  radii.push(Math.hypot(position.getX(i), position.getY(i), position.getZ(i)));
 const min = Math.min(...radii), max = Math.max(...radii);
 const mean = radii.reduce((s, r) => s + r, 0) / radii.length;
 assert.ok(max / min > 1.6, `too round: ${min.toFixed(3)}..${max.toFixed(3)}`);
 assert.ok(min > 0.1 && max < 1.6, `runaway radii ${min}..${max}`);
 const variance = radii.reduce((s, r) => s + (r - mean) ** 2, 0) / radii.length;
 assert.ok(Math.sqrt(variance) / mean > 0.05, 'surface carries real relief');
});

test('nuclei are stable per seed and differ between seeds',()=>{
 const a = cometNucleusGeometry(11, 2).attributes.position.array;
 const again = cometNucleusGeometry(11, 2).attributes.position.array;
 const other = cometNucleusGeometry(12, 2).attributes.position.array;
 assert.deepEqual(Array.from(a), Array.from(again));
 assert.notDeepEqual(Array.from(a), Array.from(other));
});

test('every vertex stays finite',()=>{
 const position = cometNucleusGeometry(5, 4).attributes.position;
 for(let i = 0; i < position.count; i++)
  assert.ok(Number.isFinite(position.getX(i)) && Number.isFinite(position.getY(i)) && Number.isFinite(position.getZ(i)));
});

test('activity switches on near the Sun and dies away beyond the ice line',()=>{
 // Water ice sublimates strongly inside roughly 3 AU, which is why comets grow
 // tails on approach and go quiet again on the way out.
 assert.ok(activity(0.5) > 0.9, 'a sungrazer is fully active');
 assert.ok(activity(1) > 0.6);
 assert.ok(activity(3) < 0.1, `still ${activity(3)} at 3 AU`);
 assert.ok(activity(6) < 0.005, `still ${activity(6)} at 6 AU`);
 assert.ok(activity(30) < 1e-4);
 for(let r = 0.3; r < 12; r += 0.3) assert.ok(activity(r) >= activity(r + 0.3), `not monotonic at ${r}`);
 for(let r = 0.05; r < 40; r += 0.37){
  const value = activity(r);
  assert.ok(value >= 0 && value <= 1, `out of range at ${r}: ${value}`);
 }
});
