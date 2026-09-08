import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {skyDirection, colourIndexToRGB, magnitudeFlux, decodeStars, decodeGlow, decodeLines, unpackRA, unpackDec, skyLayerDepthState} from '../src/sky.js';

test('sky layers participate in depth testing so solid bodies occlude them',()=>{
 assert.deepEqual(skyLayerDepthState, {depthWrite: false, depthTest: true});
 const source = readFileSync(new URL('../src/sky.js', import.meta.url), 'utf8');
 assert.doesNotMatch(source, /depthTest:\s*false/);
});

const load = name => {
 const file = readFileSync(new URL('../public/sky/' + name, import.meta.url));
 return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
};

test('the vernal equinox and the poles land where they belong',()=>{
 // RA 0, Dec 0 is the origin of both systems, so it must sit on +X.
 const equinox = skyDirection(0, 0);
 assert.ok(Math.abs(equinox[0] - 1) < 1e-12);
 assert.ok(Math.hypot(equinox[1], equinox[2]) < 1e-12);
 // The celestial pole is tilted from the ecliptic pole by the obliquity.
 const pole = skyDirection(0, 90);
 const tilt = Math.acos(pole[1]) * 180 / Math.PI;
 assert.ok(Math.abs(tilt - 23.4392911) < 1e-6, `tilt ${tilt}`);
 // The ecliptic pole itself is at RA 270, Dec 66.56.
 const eclipticPole = skyDirection(270, 90 - 23.4392911);
 assert.ok(Math.abs(eclipticPole[1] - 1) < 1e-9, JSON.stringify(eclipticPole));
});

test('sky directions are unit vectors everywhere',()=>{
 for(let ra = 0; ra < 360; ra += 17)
  for(let dec = -90; dec <= 90; dec += 13)
   assert.ok(Math.abs(Math.hypot(...skyDirection(ra, dec)) - 1) < 1e-12);
});

test('the solstice points sit on the ecliptic plane',()=>{
 // RA 90 / Dec +23.44 is the summer solstice: on the ecliptic, so y is zero.
 const solstice = skyDirection(90, 23.4392911);
 assert.ok(Math.abs(solstice[1]) < 1e-9, `y=${solstice[1]}`);
});

test('colour index maps blue stars bluer and red stars redder',()=>{
 const blue = colourIndexToRGB(-0.3), sun = colourIndexToRGB(0.65), red = colourIndexToRGB(1.6);
 assert.ok(blue[2] > blue[0], 'a B-type star is blue-dominant');
 assert.ok(red[0] > red[2], 'an M-type star is red-dominant');
 assert.ok(sun[0] > 0.5 && sun[2] > 0.3, 'a solar-type star is near white');
 for(const rgb of [blue, sun, red]) for(const c of rgb) assert.ok(c >= 0 && c <= 1);
});

test('magnitude flux follows the astronomical five-magnitudes-per-hundred rule',()=>{
 assert.ok(Math.abs(magnitudeFlux(6) - 1) < 1e-12);
 assert.ok(Math.abs(magnitudeFlux(1) / magnitudeFlux(6) - 100) < 1e-9);
 assert.ok(magnitudeFlux(-1.44) > magnitudeFlux(8), 'Sirius outshines the faintest catalogue star');
});

test('the shipped star catalogue decodes to a plausible sky',()=>{
 const stars = decodeStars(load('stars.bin'));
 assert.ok(stars.count > 40000, `only ${stars.count} stars`);
 let brightest = 99, faintest = -99, north = 0;
 for(let i = 0; i < stars.count; i++){
  const mag = stars.mag[i] / 100, dec = unpackDec(stars.dec[i]), ra = unpackRA(stars.ra[i]);
  assert.ok(ra >= 0 && ra < 360.01);
  assert.ok(dec >= -90.01 && dec <= 90.01);
  brightest = Math.min(brightest, mag); faintest = Math.max(faintest, mag);
  if(dec > 0) north++;
 }
 // Sirius at -1.44 is the brightest star in the sky and the cut is magnitude 8.
 assert.ok(Math.abs(brightest + 1.44) < 0.05, `brightest ${brightest}`);
 assert.ok(faintest <= 8.01 && faintest > 7.5, `faintest ${faintest}`);
 // Both hemispheres are covered; the south is richer because the galactic centre is there.
 const share = north / stars.count;
 assert.ok(share > 0.35 && share < 0.65, `northern share ${share}`);
});

test('the Milky Way point cloud hugs the galactic plane',()=>{
 const glow = decodeGlow(load('milkyway.bin'));
 assert.ok(glow.count > 50000, `only ${glow.count} points`);
 // The galactic centre lies at RA 266.4, Dec -29.0; the densest part of the
 // cloud must be near it, and no point may reach the celestial poles.
 let near = 0, extremeDec = 0;
 for(let i = 0; i < glow.count; i++){
  const ra = unpackRA(glow.ra[i]), dec = unpackDec(glow.dec[i]);
  extremeDec = Math.max(extremeDec, Math.abs(dec));
  const separation = Math.acos(Math.max(-1, Math.min(1,
   skyDirection(ra, dec).reduce((s, x, k) => s + x * skyDirection(266.4, -29.0)[k], 0)))) * 180 / Math.PI;
  if(separation < 20) near++;
 }
 assert.ok(extremeDec < 80, `a point reached dec ${extremeDec}`);
 // A 20 deg cap is 3% of the sky; the bulge must be far denser than that.
 assert.ok(near / glow.count > 0.09, `only ${(near / glow.count * 100).toFixed(1)}% near the centre`);
});

test('constellation figures decode as complete segment pairs',()=>{
 const lines = decodeLines(load('constellations.bin'));
 assert.ok(lines.count > 200 && lines.count % 2 === 0, `count ${lines.count}`);
});

test('the bright deep-sky list carries the landmarks worth steering by',()=>{
 const objects = JSON.parse(readFileSync(new URL('../public/sky/deepsky.json', import.meta.url), 'utf8'));
 const byId = Object.fromEntries(objects.map(o => [o.id, o]));
 for(const id of ['M 31', 'M 42', 'M 45', 'LMC', 'SMC']) assert.ok(byId[id], `missing ${id}`);
 // Andromeda sits at RA 10.7, Dec +41.3 and spans about 3 degrees.
 assert.ok(Math.abs(byId['M 31'].ra - 10.68) < 0.2);
 assert.ok(Math.abs(byId['M 31'].dec - 41.27) < 0.2);
 assert.ok(byId['M 31'].arcmin > 150);
 for(const o of objects) assert.ok(o.ra >= 0 && o.ra < 360 && o.dec >= -90 && o.dec <= 90, o.id);
});
