import * as THREE from 'three';

// The cloud field deliberately remains procedural: an animated global cloud
// texture would add a large download to the surface view, while this small,
// tileable field supplies the broad decks and soft gaps that matter at ground
// level. It is generated once per Earth surface session and has no network
// dependency.
const CLOUD_SIZE = Object.freeze({width: 256, height: 128});
const CLOUD_LAYERS = Object.freeze([
 {radius: 1.007, opacity: .14, seed: 41, drift: 1},
 {radius: 1.011, opacity: .08, seed: 97, drift: .67},
 {radius: 1.016, opacity: .045, seed: 181, drift: .42}
]);
const SHADOW_RADIUS = 1.0012;
const wrap = value => value - Math.floor(value);
const smooth = value => value * value * (3 - 2 * value);
const mix = (a, b, amount) => a + (b - a) * amount;
const smoothstep = (edge0, edge1, value) => {
 const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
 return t * t * (3 - 2 * t);
};

function hash(x, y, seed) {
 const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
 return value - Math.floor(value);
}

// Periodic value noise prevents a seam at the date line. The texture repeats
// horizontally, so its last and first columns sample the same cloud cell.
function periodicNoise(x, y, periodX, periodY, seed) {
 const xi = Math.floor(x), yi = Math.floor(y), tx = smooth(x - xi), ty = smooth(y - yi);
 const cell = (column, row) => hash((column % periodX + periodX) % periodX, (row % periodY + periodY) % periodY, seed);
 const a = cell(xi, yi), b = cell(xi + 1, yi), c = cell(xi, yi + 1), d = cell(xi + 1, yi + 1);
 return mix(mix(a, b, tx), mix(c, d, tx), ty);
}

function cloudDensity(u, v, seed) {
 let sum = 0, weight = 0, amplitude = 1, frequency = 2;
 for (let octave = 0; octave < 5; octave++) {
  sum += (periodicNoise(u * frequency * 6, v * frequency * 3, frequency * 6, frequency * 3, seed + octave * 23) - .5) * amplitude;
  weight += amplitude; amplitude *= .52; frequency *= 2;
 }
 // Subtropical bands and patchy polar thinning make the result read as an
 // atmosphere rather than evenly scattered static.
 const latitude = Math.abs(v * 2 - 1);
 const bands = .10 * Math.sin((v * 2 - 1) * Math.PI * 5 + seed);
 const field = .5 + sum / weight * .8 + bands - Math.max(0, latitude - .78) * .24;
 return smoothstep(.56, .74, field);
}

export function createProceduralCloudTexture(width = CLOUD_SIZE.width, height = CLOUD_SIZE.height, seed = 41) {
 const data = new Uint8Array(width * height * 4);
 for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  const u = x / (width - 1), v = y / (height - 1);
  const density = cloudDensity(u, v, seed);
  const index = (y * width + x) * 4;
  // A slightly warm cloud core and blue-grey edge avoid a flat white veil.
  const tint = 218 + Math.round(density * 35);
  data[index] = tint; data[index + 1] = Math.min(255, tint + 7); data[index + 2] = 255;
  data[index + 3] = Math.round(density * 228);
 }
 const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat, THREE.UnsignedByteType);
 texture.colorSpace = THREE.SRGBColorSpace;
 texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.ClampToEdgeWrapping;
 texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter;
 texture.generateMipmaps = true; texture.needsUpdate = true;
 return texture;
}

export function cloudDrift({wallSeconds = 0, simulatedDays = 0, drift = 1, shadow = false} = {}) {
 // The wall-clock component prevents a paused view from looking frozen; the
 // simulation component lets fast-forward visibly advance weather without
 // letting 365 days/s turn the entire globe each frame.
 const simulated = Math.tanh(Math.max(0, simulatedDays) / 80) * .18;
 const phase = wrap((wallSeconds * .0005 + simulated) * drift);
 return {x: phase, y: wrap(.17 + phase * (shadow ? .13 : .19))};
}

const cloudMaterial = (map, opacity) => new THREE.MeshBasicMaterial({
 map, transparent: true, opacity, alphaTest: .018, depthWrite: false,
 side: THREE.BackSide, toneMapped: false
});

const shadowMaterial = map => new THREE.MeshBasicMaterial({
 map, color: '#334354', transparent: true, opacity: .13, alphaTest: .045,
 depthWrite: false, side: THREE.FrontSide, toneMapped: false
});

export function createEarthCloudCover() {
 const group = new THREE.Group();
 group.name = 'Procedural Earth clouds';
 const geometry = new THREE.SphereGeometry(1, 96, 64);
 const layers = CLOUD_LAYERS.map(profile => {
  const map = createProceduralCloudTexture(CLOUD_SIZE.width, CLOUD_SIZE.height, profile.seed);
  const mesh = new THREE.Mesh(geometry, cloudMaterial(map, profile.opacity));
  mesh.name = 'Earth cloud volume layer'; mesh.scale.setScalar(profile.radius);
  mesh.renderOrder = 3; mesh.frustumCulled = false; group.add(mesh);
  return {mesh, map, profile};
 });
 // The lower shell is a projected, softened counterpart of the same cloud
 // field. It sits just above the terrain, so it travels with the globe and
 // remains on the ground instead of hanging in world space.
 const shadowMap = createProceduralCloudTexture(CLOUD_SIZE.width, CLOUD_SIZE.height, CLOUD_LAYERS[0].seed);
 const shadow = new THREE.Mesh(geometry, shadowMaterial(shadowMap));
 shadow.name = 'Earth cloud shadows'; shadow.scale.setScalar(SHADOW_RADIUS);
 shadow.renderOrder = 2; shadow.frustumCulled = false; group.add(shadow);
 let enabled = true;

 return {
  group,
  setEnabled(next) { enabled = !!next; group.visible = enabled; },
  update(time) {
   if (!enabled) return;
   for (const layer of layers) {
    const offset = cloudDrift({...time, drift: layer.profile.drift});
    layer.map.offset.set(offset.x, offset.y);
   }
   const drift = cloudDrift({...time, drift: CLOUD_LAYERS[0].drift, shadow: true});
   // A fixed offset in the Sun-facing direction gives the shadow a believable
   // displacement from its cloud deck while preserving the same wind motion.
   shadowMap.offset.set(wrap(drift.x + .038), wrap(drift.y - .016));
  },
  dispose() {
   geometry.dispose();
   for (const layer of layers) { layer.map.dispose(); layer.mesh.material.dispose(); }
   shadowMap.dispose(); shadow.material.dispose();
  }
 };
}
