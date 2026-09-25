import test from 'node:test';
import assert from 'node:assert/strict';
import {SATURN_RING_INNER, SATURN_RING_BANDS, URANUS_RING_INNER, URANUS_RING_BANDS, ringBandAt, ringGrain} from '../src/planet-rings.js';

const isHexColor = value => /^#[0-9a-f]{6}$/i.test(value);

for (const [name, inner, bands] of [['Saturn', SATURN_RING_INNER, SATURN_RING_BANDS], ['Uranus', URANUS_RING_INNER, URANUS_RING_BANDS]]) {
 test(`${name} ring bands are ordered, valid and cover a physically sane span`, () => {
  assert.ok(inner > 1, `${name}'s rings should start outside the planet's own surface`);
  assert.ok(bands.length > 0);
  let previous = inner;
  for (const band of bands) {
   assert.ok(band.to > previous, `band boundaries must strictly increase (${previous} -> ${band.to})`);
   assert.ok(isHexColor(band.tone), `${band.tone} should be a 6-digit hex colour`);
   assert.ok(band.alpha >= 0 && band.alpha <= 1, `alpha ${band.alpha} must be a valid opacity`);
   previous = band.to;
  }
 });
}

test('Saturn ring bands place the classic named features at their real radii (Saturn radii)', () => {
 // Cassini/Voyager occultation radii (Wikipedia, "Rings of Saturn"), divided
 // by Saturn's equatorial radius of 60,300 km.
 assert.equal(ringBandAt(SATURN_RING_BANDS, 1.20).tone, '#33322f'); // D ring
 assert.equal(ringBandAt(SATURN_RING_BANDS, 1.40).tone, '#7c7a72'); // C ring
 const bRing = ringBandAt(SATURN_RING_BANDS, 1.80); // B ring: the densest, brightest band
 assert.equal(bRing.tone, '#ddd6c8');
 assert.ok(bRing.alpha > 0.8, 'the B ring should be the most opaque band');
 const cassini = ringBandAt(SATURN_RING_BANDS, 2.00); // Cassini Division
 assert.ok(cassini.alpha < 0.2, 'the Cassini Division should be mostly transparent');
 const encke = ringBandAt(SATURN_RING_BANDS, 2.2154); // Encke Gap, centre ~133,589 km
 assert.ok(encke.alpha < 0.1, 'the Encke Gap should be nearly transparent, not just darker');
 const keeler = ringBandAt(SATURN_RING_BANDS, 2.264); // Keeler Gap, centre ~136,505 km
 assert.ok(keeler.alpha < 0.1, 'the Keeler Gap should be nearly transparent, not just darker');
});

test('Uranus ring bands include the epsilon ring, which the old fixed radius (1.35-1.9) cut off entirely', () => {
 // Epsilon is Uranus's brightest and widest ring, centred at ~51,149 km -
 // 2.0009 Uranus radii (equatorial radius 25,559 km) - which fell outside
 // the previous outer bound of 1.9.
 const epsilon = ringBandAt(URANUS_RING_BANDS, 2.0);
 assert.ok(epsilon.alpha > 0.5, 'epsilon is one of the brightest, most opaque Uranus rings');
});

test('Uranus ring bands model real gaps as near-transparent, not merely darker', () => {
 // Sampling between two named rings (e.g. between ring 4 and the alpha ring,
 // a genuine multi-thousand-kilometre gap) should land in a low-alpha band.
 const gap = ringBandAt(URANUS_RING_BANDS, 1.71);
 assert.ok(gap.alpha < 0.05, 'the true gaps between Uranus rings should be nearly fully transparent');
});

test('ringBandAt falls back to the outermost band beyond every boundary', () => {
 assert.equal(ringBandAt(SATURN_RING_BANDS, 999), SATURN_RING_BANDS[SATURN_RING_BANDS.length - 1]);
});

test('ringGrain is a deterministic, bounded texture rather than a smooth sine wave', () => {
 // Same radius and seed always returns the same value - the renderer builds
 // ring geometry once, not per frame, so this has to be pure.
 assert.equal(ringGrain(1.8, 4111), ringGrain(1.8, 4111));
 // A different seed (Saturn vs Uranus) gives an unrelated pattern, not just
 // a phase-shifted copy of the same wave.
 assert.notEqual(ringGrain(1.8, 4111), ringGrain(1.8, 7331));
 // The sum of octaves is a weighted average of values in [0,1) shifted by
 // -0.5, so it always stays safely inside a bounded range.
 for (let r = 1.1; r < 2.4; r += 0.037) {
  const value = ringGrain(r, 4111);
  assert.ok(value > -0.6 && value < 0.6, `ringGrain(${r}) = ${value} should stay bounded`);
 }
 // A couple of clean sine terms are smooth enough that neighbouring samples
 // barely differ; real particulate structure should show visible grain at a
 // fine radial step even where two samples a full ring-width apart might
 // coincidentally agree.
 const samples = [];
 for (let r = 1.1; r < 2.4; r += 0.0015) samples.push(ringGrain(r, 4111));
 const distinct = new Set(samples.map(v => v.toFixed(4)));
 assert.ok(distinct.size > samples.length * 0.5, 'fine radial sampling should show real grain, not a smooth curve');
});
