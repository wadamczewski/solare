import test from 'node:test';
import assert from 'node:assert/strict';
import {SYSTEM_BODY_SHARE, SYSTEM_MAX_BODY, SYSTEM_MIN_BODY, SYSTEM_MIN_GAP, SYSTEM_VIEW_RADIUS, systemBodyKey, systemBodyRadius,
 systemCameraDistance, systemDistance, systemDrawnExtent, systemLayout, systemMaxDistance} from '../src/system-view.js';
import {STAR_SYSTEMS, orbitSpanAU, systemBodies} from '../src/star-systems.js';

const presetOf = id => STAR_SYSTEMS.find(item => item.id === id);
const layoutOf = (preset, compressed = true) => {
 const positions = new Map(systemBodies(preset).map(item => [item.name, item.p]));
 return systemLayout(preset.root, name => positions.get(name), orbitSpanAU(preset), compressed);
};
const apart = (layout, one, two) => Math.hypot(...layout.get(one).p.map((value, axis) => value - layout.get(two).p[axis]));
const drawnRadius = (layout, name) => layout.get(name).r;

test('the widest orbit of any system fills the same frame', () => {
 // This is the whole reason the mapping is per-system: the presets span from
 // 0.02 AU to 8700, and all of them have to arrive at the same screen size.
 for (const preset of STAR_SYSTEMS) {
  const span = orbitSpanAU(preset);
  for (const compressed of [true, false])
   assert.ok(Math.abs(systemDistance(span, span, compressed) - SYSTEM_VIEW_RADIUS) < 1e-9, preset.id);
 }
 assert.equal(systemDistance(0, 10), 0);
 assert.equal(systemDistance(1, 0), 0);
 assert.equal(systemDistance(-1, 10), 0);
});

test('the mapping is monotonic, and real scale is strictly proportional', () => {
 for (const compressed of [true, false]) {
  let previous = -1;
  for (let au = .001; au < 50; au *= 1.4) {
   const value = systemDistance(au, 50, compressed);
   assert.ok(value > previous, `${au} ${compressed}`);
   previous = value;
  }
 }
 assert.ok(Math.abs(systemDistance(5, 50, false) - SYSTEM_VIEW_RADIUS / 10) < 1e-12);
 assert.ok(systemDistance(5, 50, true) > systemDistance(5, 50, false) * 2);
});

test('every component of every preset is drawn between the size limits', () => {
 for (const preset of STAR_SYSTEMS) {
  const span = orbitSpanAU(preset);
  for (const item of systemBodies(preset)) {
   const drawn = systemBodyRadius(item.radiusKm, span);
   assert.ok(drawn >= SYSTEM_MIN_BODY - 1e-12 && drawn <= SYSTEM_MAX_BODY + 1e-12, `${preset.id} ${item.name} ${drawn}`);
   assert.ok(systemBodyRadius(item.radiusKm, span, true, .1) >= SYSTEM_MIN_BODY - 1e-12, 'the floor outranks the cap');
   // Real scale is not clamped: that is what makes it real scale.
   assert.ok(systemBodyRadius(item.radiusKm, span, false) < drawn);
  }
 }
 assert.equal(systemBodyRadius(0, 10), SYSTEM_MIN_BODY);
 assert.equal(systemBodyRadius(undefined, 10), SYSTEM_MIN_BODY);
});

test('the layout puts every component of every preset where it can be seen', () => {
 // Two discs closer together than the sum of their radii are one object on
 // screen. Every pair in every preset has to clear that, at the moment the
 // preset is loaded and at every phase of every orbit afterwards.
 for (const preset of STAR_SYSTEMS) {
  const span = orbitSpanAU(preset), bodies = systemBodies(preset);
  const layout = layoutOf(preset);
  const size = new Map(bodies.map(item => [item.name, drawnRadius(layout, item.name)]));
  assert.equal(layout.size, bodies.length, preset.id);
  for (const one of bodies) for (const two of bodies) {
   if (one === two) continue;
   const gap = apart(layout, one.name, two.name) - size.get(one.name) - size.get(two.name);
   assert.ok(gap > 0, `${preset.id}: ${one.name} and ${two.name} overlap by ${(-gap).toFixed(3)}`);
  }
 }
});

test('a tight pair far from the barycentre survives the compression', () => {
 // Alpha Centauri A and B are 13.7 AU apart while sitting 700 AU out on a
 // 8700 AU orbit. Mapping a body's distance from the barycentre would give
 // them the same radius to three decimal places and draw them as one dot;
 // compressing each level separately is what keeps them apart.
 const alpha = presetOf('alpha-centauri'), span = orbitSpanAU(alpha), layout = layoutOf(alpha);
 const positions = new Map(systemBodies(alpha).map(item => [item.name, item.p]));
 const radial = name => systemDistance(Math.hypot(...positions.get(name)), span, true);
 assert.ok(Math.abs(radial('α Centauri A') - radial('α Centauri B')) < .1, 'the radial map really does collapse them');
 assert.ok(apart(layout, 'α Centauri A', 'α Centauri B') > 1.4, String(apart(layout, 'α Centauri A', 'α Centauri B')));
 // And Proxima is still four hundred times further out in nature, several
 // times further out on screen, and inside the frame.
 const far = Math.hypot(...layout.get('Proxima Centauri').p);
 assert.ok(far > apart(layout, 'α Centauri A', 'α Centauri B') * 4, String(far));
 assert.ok(far <= SYSTEM_VIEW_RADIUS + 1e-9, String(far));
});

test('the layout keeps the barycentre at the origin and the geometry of the sky', () => {
 for (const preset of STAR_SYSTEMS) {
  const bodies = systemBodies(preset), layout = layoutOf(preset);
  const mass = bodies.reduce((sum, item) => sum + item.mass, 0);
  for (let axis = 0; axis < 3; axis++) {
   const centre = bodies.reduce((sum, item) => sum + item.mass * layout.get(item.name).p[axis], 0) / mass;
   assert.ok(Math.abs(centre) < 1e-9, `${preset.id} ${centre}`);
  }
  // Each separation keeps its direction; only its length is rescaled.
  const one = bodies[0], two = bodies[1];
  const trueOffset = one.p.map((value, axis) => two.p[axis] - value);
  const drawnOffset = layout.get(one.name).p.map((value, axis) => layout.get(two.name).p[axis] - value);
  const cosine = trueOffset.reduce((sum, value, axis) => sum + value * drawnOffset[axis], 0)
   / (Math.hypot(...trueOffset) * Math.hypot(...drawnOffset));
  assert.ok(cosine > .999, `${preset.id}: direction turned, cos ${cosine}`);
 }
});

test('real scale keeps every proportion and imposes no minimum gap', () => {
 // The same layout without the compression must be a plain scaling of nature:
 // the ratio of any two separations is the ratio they really have.
 const kepler = presetOf('kepler-16'), bodies = systemBodies(kepler);
 const layout = layoutOf(kepler, false);
 const trueApart = (one, two) => Math.hypot(...bodies.find(item => item.name === one).p
  .map((value, axis) => value - bodies.find(item => item.name === two).p[axis]));
 const ratio = apart(layout, 'Kepler-16 A', 'Kepler-16 B') / trueApart('Kepler-16 A', 'Kepler-16 B');
 const other = apart(layout, 'Kepler-16 A', 'Kepler-16 b') / trueApart('Kepler-16 A', 'Kepler-16 b');
 assert.ok(Math.abs(ratio / other - 1) < 1e-9, `${ratio} against ${other}`);
 // And a star is a small fraction of its own orbit, as it is in the sky:
 // Kepler-16 A is a thirtieth of the separation, not a third of it.
 const span = orbitSpanAU(kepler), drawn = systemBodyRadius(bodies[0].radiusKm, span, false);
 assert.ok(drawn * 20 < apart(layout, 'Kepler-16 A', 'Kepler-16 B'), String(drawn));
 assert.ok(drawn < systemBodyRadius(bodies[0].radiusKm, span, true) / 3);
});

test('the frame is measured from the widest the system will ever be drawn', () => {
 for (const preset of STAR_SYSTEMS) {
  const span = orbitSpanAU(preset), extent = systemDrawnExtent(preset.root, span);
  const layout = layoutOf(preset);
  const now = Math.max(...[...layout.values()].map(item => Math.hypot(...item.p) + item.r));
  assert.ok(extent >= now - 1e-9, `${preset.id}: extent ${extent} under today's ${now}`);
  assert.ok(extent <= SYSTEM_VIEW_RADIUS * 1.6, `${preset.id}: extent ${extent}`);
  assert.ok(systemCameraDistance(extent) > extent);
  assert.ok(systemMaxDistance(extent) > systemCameraDistance(extent) * 2);
 }
 // S2 is the case: it is placed near pericentre and travels out sixteen times
 // as far, so the frame cannot be measured from where it happens to be now.
 const s2 = presetOf('s2-sgr-a'), layout = layoutOf(s2);
 assert.ok(systemDrawnExtent(s2.root, orbitSpanAU(s2)) > Math.hypot(...layout.get('S2').p) * 2);
});

test('a component is never drawn filling the orbit it sits in', () => {
 // Algol's primary is a fifth of the way to its companion in nature. The power
 // law alone would draw it at nearly half of that separation, which reads as a
 // contact binary rather than a semi-detached one.
 for (const preset of STAR_SYSTEMS) {
  const layout = layoutOf(preset), bodies = systemBodies(preset);
  const walk = node => {
   if (node.star) return;
   walk(node.primary); walk(node.secondary);
   const leaves = branch => branch.star ? [branch.star.name] : [...leaves(branch.primary), ...leaves(branch.secondary)];
   const one = leaves(node.primary), two = leaves(node.secondary);
   const separation = Math.min(...one.flatMap(a => two.map(b => apart(layout, a, b))));
   for (const name of [...one, ...two])
    assert.ok(drawnRadius(layout, name) <= Math.max(SYSTEM_MIN_BODY, SYSTEM_BODY_SHARE * separation) + 1e-9,
     `${preset.id}: ${name} is ${drawnRadius(layout, name).toFixed(2)} across a ${separation.toFixed(2)} gap`);
  };
  walk(preset.root);
  assert.equal(bodies.length, layout.size);
 }
 // Algol specifically: a fifth, not a half.
 const algol = layoutOf(presetOf('algol'));
 assert.ok(drawnRadius(algol, 'Algol Aa1') / apart(algol, 'Algol Aa1', 'Algol Aa2') < .3);
});

test('the minimum gap only ever pushes components apart', () => {
 // A pair already wide enough is left exactly where the compression put it.
 const wide = {primary: {star: {name: 'a', mass: 1, radiusKm: 700000}},
  secondary: {star: {name: 'b', mass: 1, radiusKm: 700000}}, semiMajorAU: 40, eccentricity: 0};
 const positions = new Map([['a', [-20, 0, 0]], ['b', [20, 0, 0]]]);
 const layout = systemLayout(wide, name => positions.get(name), 40, true);
 assert.ok(Math.abs(apart(layout, 'a', 'b') - systemDistance(40, 40)) < 1e-9);
 // A Sun on a 40 AU orbit is well under the floor at that scale, so the floor
 // decides the disc and the cap never comes into it.
 assert.equal(drawnRadius(layout, 'a'), SYSTEM_MIN_BODY);
 assert.ok(SYSTEM_BODY_SHARE * systemDistance(40, 40) > SYSTEM_MIN_BODY);
 // A pair that would overlap is opened out to the minimum and no further.
 const tight = new Map([['a', [-.002, 0, 0]], ['b', [.002, 0, 0]]]);
 const squeezed = systemLayout(wide, name => tight.get(name), 40, true);
 assert.ok(Math.abs(apart(squeezed, 'a', 'b') - SYSTEM_MIN_GAP * 2 * SYSTEM_MIN_BODY) < 1e-9,
  String(apart(squeezed, 'a', 'b')));
});

test('each kind of component maps to an engine key the renderer knows', () => {
 assert.equal(systemBodyKey('star'), 'sun');
 assert.equal(systemBodyKey('white-dwarf'), 'sun');
 assert.equal(systemBodyKey('neutron-star'), 'neutron-star');
 assert.equal(systemBodyKey('blackhole'), 'blackhole');
 assert.equal(systemBodyKey('planet'), 'exoplanet');
 assert.equal(systemBodyKey(undefined), 'exoplanet');
 const kinds = new Set(STAR_SYSTEMS.flatMap(preset => systemBodies(preset).map(item => item.kind)));
 for (const kind of kinds) assert.ok(['sun', 'neutron-star', 'blackhole', 'exoplanet'].includes(systemBodyKey(kind)), kind);
 assert.ok(kinds.has('neutron-star') && kinds.has('blackhole') && kinds.has('planet') && kinds.has('white-dwarf'));
});
