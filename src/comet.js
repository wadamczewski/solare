// Comet nucleus shape and the two tails a comet actually grows.
//
// Shape: real short-period nuclei imaged up close are contact binaries or badly
// battered ellipsoids - 67P/Churyumov-Gerasimenko and 19P/Borrelly are the clear
// examples, and 1P/Halley is a 15x8 km elongated body. The nucleus here is built
// from two blended lobes plus multi-octave noise and a few impact bowls, at a
// tessellation fine enough that no facet reads as a flat triangle.
//
// Tails: a comet has two, pointing in different directions.
//   - The ion tail is gas ionised by solar UV and carried off by the solar wind.
//     It runs almost exactly anti-sunward, narrow and filamentary, and is blue
//     because it shines by CO+ emission near 420 nm.
//   - The dust tail is grains pushed out by radiation pressure while keeping the
//     orbital momentum they were released with. That is why it curves away from
//     the anti-solar line and fans out, and it is warm white because it merely
//     reflects sunlight.
// Grain paths use the classic syndyne construction: a grain released age tau ago
// starts from where the nucleus was then and is displaced anti-sunward by
// 1/2 * beta * g_sun * tau^2. Directions are physical; the absolute lengths are
// stylised to stay readable at the app's compressed viewing scale.
import * as THREE from 'three';

// -------------------------------------------------------------- nucleus
const hash = (x, y, z, seed) => {
 let h = Math.imul(x * 374761393 + y * 668265263 + z * 2147483647 + seed * 971, 1274126177);
 h = (h ^ (h >>> 13)) >>> 0;
 return h / 4294967296;
};
const smooth = t => t * t * (3 - 2 * t);

function valueNoise(x, y, z, seed) {
 const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
 const xf = smooth(x - xi), yf = smooth(y - yi), zf = smooth(z - zi);
 let result = 0;
 for (let dz = 0; dz < 2; dz++)
  for (let dy = 0; dy < 2; dy++)
   for (let dx = 0; dx < 2; dx++) {
    const weight = (dx ? xf : 1 - xf) * (dy ? yf : 1 - yf) * (dz ? zf : 1 - zf);
    result += weight * hash(xi + dx, yi + dy, zi + dz, seed);
   }
 return result * 2 - 1;
}

// Distance from the centre to a lobe's surface along direction d, or -1 if the
// ray misses the lobe entirely.
function lobeReach(d, centre, radius) {
 const along = d[0] * centre[0] + d[1] * centre[1] + d[2] * centre[2];
 const centreSq = centre[0] ** 2 + centre[1] ** 2 + centre[2] ** 2;
 const disc = radius * radius - centreSq + along * along;
 return disc < 0 ? -1 : along + Math.sqrt(disc);
}

// Smooth maximum, so the two lobes meet in a neck instead of an intersection crease.
const softMax = (a, b, k) => {
 if (a < 0) return b;
 if (b < 0) return a;
 return Math.log(Math.exp(a * k) + Math.exp(b * k)) / k;
};

// Three subdivides each icosahedron edge into (detail + 1) segments, so this is
// 20 * 13^2 = 3380 faces against the 180 the old detail-2 sphere had.
export function cometNucleusGeometry(seed = 1, detail = 12) {
 const geometry = new THREE.IcosahedronGeometry(1, detail);
 const position = geometry.attributes.position;
 const random = (n) => hash(n, seed * 17, 3, seed);
 // Two lobes of unequal size on a slightly tilted axis, as at 67P.
 const bigCentre = [0.30 + random(1) * 0.08, random(2) * 0.05, random(3) * 0.05];
 const smallCentre = [-(0.34 + random(4) * 0.08), random(5) * 0.07, random(6) * 0.07];
 const bigRadius = 0.70 + random(7) * 0.08, smallRadius = 0.52 + random(8) * 0.08;
 // A handful of impact bowls scattered over the surface.
 const craters = Array.from({length: 5}, (_, i) => {
  const u = random(20 + i) * 2 - 1, phi = random(30 + i) * Math.PI * 2;
  const s = Math.sqrt(1 - u * u);
  return {dir: [s * Math.cos(phi), u, s * Math.sin(phi)], size: 0.18 + random(40 + i) * 0.24, depth: 0.06 + random(50 + i) * 0.07};
 });

 const v = new THREE.Vector3();
 for (let i = 0; i < position.count; i++) {
  v.fromBufferAttribute(position, i).normalize();
  const d = [v.x, v.y, v.z];
  let r = softMax(lobeReach(d, bigCentre, bigRadius), lobeReach(d, smallCentre, smallRadius), 14);
  // Three octaves of ridges and pits, the coarsest doing most of the work.
  r *= 1 + 0.13 * valueNoise(d[0] * 2.1, d[1] * 2.1, d[2] * 2.1, seed)
         + 0.06 * valueNoise(d[0] * 5.3, d[1] * 5.3, d[2] * 5.3, seed + 7)
         + 0.025 * valueNoise(d[0] * 11.7, d[1] * 11.7, d[2] * 11.7, seed + 19);
  for (const crater of craters) {
   const cosine = d[0] * crater.dir[0] + d[1] * crater.dir[1] + d[2] * crater.dir[2];
   const edge = Math.max(0, cosine - (1 - crater.size));
   if (edge > 0) {
    const t = edge / crater.size;
    r -= crater.depth * Math.sin(Math.min(1, t) * Math.PI) * (1 - 0.35 * t); // bowl with a raised rim
   }
  }
  position.setXYZ(i, v.x * r, v.y * r, v.z * r);
 }
 geometry.computeVertexNormals();
 return geometry;
}

// ----------------------------------------------------------------- tails
const TAIL_VERTEX = `
attribute float size; attribute float intensity; attribute vec3 tint;
varying vec3 c; varying float a;
uniform float dpr;
void main(){
 c = tint; a = intensity;
 vec4 mv = modelViewMatrix * vec4(position, 1.);
 gl_Position = projectionMatrix * mv;
 gl_PointSize = max(1., size * dpr);
}`;

const TAIL_FRAGMENT = `
varying vec3 c; varying float a;
void main(){
 float r = length(gl_PointCoord - .5) * 2.;
 if (r > 1.) discard;
 gl_FragColor = vec4(c * a * pow(1. - r, 1.7), 1.);
}`;

const ION_TINT = [0.32, 0.62, 1.0];   // CO+ emission dominates the plasma tail
const DUST_TINT = [1.0, 0.88, 0.68];  // reflected sunlight, slightly reddened by the grains
const COMA_TINT = [0.62, 0.86, 0.95];

// Water ice starts sublimating in earnest inside roughly 3 AU; outside that a
// comet is essentially inert and should show almost no tail.
export function activity(distanceAU) {
 const insolation = 1 / Math.max(0.05, distanceAU * distanceAU);
 const switchOn = 1 / (1 + Math.exp((distanceAU - 2.6) * 2.2));
 return Math.min(1, insolation * switchOn * 1.6);
}

export function createCometTails(scene, particlesPerComet = 5200) {
 const maxComets = 6, total = maxComets * particlesPerComet;
 const geometry = new THREE.BufferGeometry();
 const position = new Float32Array(total * 3), size = new Float32Array(total);
 const intensity = new Float32Array(total), tint = new Float32Array(total * 3);
 geometry.setAttribute('position', new THREE.BufferAttribute(position, 3).setUsage(THREE.DynamicDrawUsage));
 geometry.setAttribute('size', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
 geometry.setAttribute('intensity', new THREE.BufferAttribute(intensity, 1).setUsage(THREE.DynamicDrawUsage));
 geometry.setAttribute('tint', new THREE.BufferAttribute(tint, 3).setUsage(THREE.DynamicDrawUsage));
 const material = new THREE.ShaderMaterial({
  uniforms: {dpr: {value: 1}},
  vertexShader: TAIL_VERTEX, fragmentShader: TAIL_FRAGMENT,
  transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
 });
 const points = new THREE.Points(geometry, material);
 points.frustumCulled = false;
 scene.add(points);

 // Fixed per-particle draws keep every grain on a stable path instead of
 // flickering between frames. These come from an iterated LCG rather than a hash
 // of the index: hashing sequential indices leaves the draws correlated, and the
 // grains then line up into visible arcs instead of filling the tail.
 const draw = new Float32Array(particlesPerComet * 4);
 let state = 987654321 >>> 0;
 const next = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
 for (let i = 0; i < particlesPerComet; i++) {
  draw[i * 4] = next();      // age along the tail
  draw[i * 4 + 1] = next();  // beta: radiation pressure over gravity
  draw[i * 4 + 2] = next();  // lateral angle
  draw[i * 4 + 3] = next();  // lateral magnitude
 }

 const nucleus = new THREE.Vector3(), antisun = new THREE.Vector3();
 const motion = new THREE.Vector3(), lateralA = new THREE.Vector3(), lateralB = new THREE.Vector3();
 const grain = new THREE.Vector3();

 return {
  points,
  setPixelRatio(value) { material.uniforms.dpr.value = value; },
  // context: {comets, sunDisplayed, displayed, velocityOf, distanceOf, scale, time}
  update(context) {
   const {comets, sunDisplayed, displayed, velocityOf, distanceOf, span, time} = context;
   let cursor = 0;
   for (const comet of comets.slice(0, maxComets)) {
    nucleus.copy(displayed(comet));
    antisun.copy(nucleus).sub(sunDisplayed);
    const sunDistance = antisun.length();
    if (sunDistance < 1e-9) antisun.set(1, 0, 0); else antisun.divideScalar(sunDistance);
    const strength = activity(distanceOf(comet));
    motion.copy(velocityOf(comet));
    if (motion.lengthSq() < 1e-18) motion.copy(antisun).cross(new THREE.Vector3(0, 1, 0));
    motion.normalize();
    // A frame across the tail: one axis in the sun-motion plane, one normal to it.
    lateralA.copy(motion).sub(antisun.clone().multiplyScalar(motion.dot(antisun)));
    if (lateralA.lengthSq() < 1e-12) lateralA.set(0, 1, 0);
    lateralA.normalize();
    lateralB.copy(antisun).cross(lateralA).normalize();

    const ionLength = span * (0.9 + 2.6 * strength);
    const dustLength = span * (0.5 + 1.5 * strength);
    for (let i = 0; i < particlesPerComet; i++, cursor++) {
     const ion = i < particlesPerComet * 0.42;
     const age = draw[i * 4], beta = draw[i * 4 + 1];
     const angle = draw[i * 4 + 2] * Math.PI * 2, spread = draw[i * 4 + 3];
     let alpha, width, tone, brightness, radius;
     if (ion) {
      // Straight, fast, narrow, with slow-travelling kinks like real ion tails.
      const t = (age + time * 0.09) % 1;
      // A coherent kink travelling down the tail, plus per-grain scatter so the
      // plasma reads as a bundle of filaments rather than one ribbon.
      const wave = Math.sin(t * 5 + angle * 6.283) * 0.03;
      const flare = t * (0.5 + t);
      grain.copy(nucleus)
       .addScaledVector(antisun, t * ionLength)
       .addScaledVector(lateralA, (wave + Math.cos(angle * 6.283) * (0.05 + spread * 0.11) * flare) * ionLength)
       .addScaledVector(lateralB, (Math.sin(angle * 6.283) * (0.05 + beta * 0.11) * flare) * ionLength);
      alpha = 1 - t; width = 1.5 + 2.1 * (1 - t); tone = ION_TINT; brightness = 1.35;
     } else {
      // Syndyne: released age ago, then pushed anti-sunward, so it lags the nucleus
      // along its own track and the fan curves.
      // Age and beta vary independently, so the grains fill a syndyne-synchrone
      // fan rather than a line: heavier grains (low beta) lag near the orbit,
      // light ones are blown far anti-sunward.
      const t = age;
      const push = 0.5 * (0.15 + beta * 1.9) * t * t;
      grain.copy(nucleus)
       .addScaledVector(motion, -t * dustLength * 0.62)
       .addScaledVector(antisun, push * dustLength * 1.5)
       .addScaledVector(lateralA, (spread - 0.5) * t * dustLength * 0.42)
       .addScaledVector(lateralB, Math.sin(angle * 6.283) * t * dustLength * 0.3);
      alpha = Math.pow(1 - t, 1.3); width = 1.8 + 3.1 * (1 - t); tone = DUST_TINT; brightness = 1.05;
     }
     // Innermost grains form the coma: bright, round, close in.
     if (age < 0.06) {
      const u = age / 0.06;
      grain.copy(nucleus)
       .addScaledVector(lateralA, Math.cos(angle) * u * span * 0.05 * (0.4 + spread))
       .addScaledVector(lateralB, Math.sin(angle) * u * span * 0.05 * (0.4 + spread))
       .addScaledVector(antisun, (beta - 0.3) * u * span * 0.05);
      alpha = 1 - u * 0.5; width = 3.4 + 4.2 * (1 - u); tone = COMA_TINT; brightness = 2.1;
     }
     radius = strength * alpha * brightness;
     position[cursor * 3] = grain.x; position[cursor * 3 + 1] = grain.y; position[cursor * 3 + 2] = grain.z;
     size[cursor] = width;
     intensity[cursor] = radius;
     tint[cursor * 3] = tone[0]; tint[cursor * 3 + 1] = tone[1]; tint[cursor * 3 + 2] = tone[2];
    }
   }
   for (; cursor < total; cursor++) { size[cursor] = 0; intensity[cursor] = 0; }
   geometry.attributes.position.needsUpdate = true;
   geometry.attributes.size.needsUpdate = true;
   geometry.attributes.intensity.needsUpdate = true;
   geometry.attributes.tint.needsUpdate = true;
  },
  clear() {
   size.fill(0); intensity.fill(0);
   geometry.attributes.size.needsUpdate = true;
   geometry.attributes.intensity.needsUpdate = true;
  }
 };
}
