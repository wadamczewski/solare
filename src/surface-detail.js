import * as THREE from 'three';
import {shapeGeometry} from './scene-lod.js';

// A surface view has a single close body.  Its map can therefore use a dense
// mesh and a local relief texture without asking the system map to keep every
// planet at that cost.  Relief follows known ranges where they are important
// to the silhouette; cloud worlds intentionally receive only a subtle layer.
const ROCKY = Object.freeze({
 earth: [.0032, .19], moon: [.0072, .27], mars: [.0078, .25], mercury: [.0034, .2],
 venus: [.0011, .075], io: [.0038, .18], europa: [.0028, .12], ganymede: [.0042, .2],
 callisto: [.0047, .22], titan: [.0018, .1], enceladus: [.0044, .2], triton: [.004, .18],
 iapetus: [.006, .22], rhea: [.0046, .2], dione: [.0048, .21], tethys: [.0049, .21],
 mimas: [.0045, .2], phobos: [.012, .32], deimos: [.009, .28]
});
const GAS = new Set(['jupiter','saturn','uranus','neptune']);
const heightMaps = new Map();
const detailTextures = new Map(), detailLoader = new THREE.TextureLoader();
const MISSION_ASSETS = Object.freeze({
 earth: {color: '/textures/surface/earth-blue-marble-4k.jpg'},
 moon: {color: '/textures/surface/moon-lroc-color.jpg', height: '/textures/surface/moon-lola-height.jpg'},
 mars: {height: '/textures/surface/mars-mola-height.jpg'}
});

function missionTexture(path, color) {
 if (detailTextures.has(path)) return detailTextures.get(path);
 const texture = detailLoader.load(path);
 texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace;
 texture.wrapS = THREE.RepeatWrapping; texture.wrapT = THREE.ClampToEdgeWrapping;
 texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter;
 texture.generateMipmaps = true; detailTextures.set(path, texture); return texture;
}

const hash = (x, y, seed) => {
 const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
 return value - Math.floor(value);
};
const smooth = value => value * value * (3 - 2 * value);
function valueNoise(x, y, seed) {
 const xi = Math.floor(x), yi = Math.floor(y), tx = smooth(x - xi), ty = smooth(y - yi);
 const a = hash(xi, yi, seed), b = hash(xi + 1, yi, seed), c = hash(xi, yi + 1, seed), d = hash(xi + 1, yi + 1, seed);
 return (a + (b - a) * tx) + ((c + (d - c) * tx) - (a + (b - a) * tx)) * ty;
}
function terrainHeight(u, v, seed, cloud) {
 let amplitude = 1, frequency = cloud ? 3 : 2.4, sum = 0, weight = 0;
 for (let octave = 0; octave < 6; octave++) {
  sum += (valueNoise(u * frequency, v * frequency, seed + octave * 17) - .5) * amplitude;
  weight += amplitude; amplitude *= .5; frequency *= 2.05;
 }
 const latitude = Math.abs(v * 2 - 1);
 // The low-frequency band makes continents, basins and crater provinces
 // coherent at the horizon; the remaining octaves carry the close relief.
 const continents = valueNoise(u * (cloud ? 2 : 1.15), v * (cloud ? 2 : 1.15), seed + 101) - .5;
 return Math.max(0, Math.min(1, .5 + sum / weight * .58 + continents * .32 - latitude * (cloud ? .015 : .045)));
}
function profileFor(body) {
 const key = body.surface || body.key;
 const [relief, bump] = ROCKY[key] || (GAS.has(key) || body.gas ? [.00022, .065] : [.0032, .17]);
 return {key, relief, bump, cloud: GAS.has(key) || !!body.gas, seed: String(body.name || key).split('').reduce((n, char) => (n * 31 + char.charCodeAt(0)) >>> 0, 29)};
}
function heightMap(profile) {
 const cacheKey = `${profile.key}:${profile.seed}:${profile.cloud}`;
 if (heightMaps.has(cacheKey)) return heightMaps.get(cacheKey);
 const width = 1024, height = 512, data = new Uint8Array(width * height);
 for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  // The duplicated seam avoids a visible ridge at longitude ±180°.
  data[y * width + x] = Math.round(terrainHeight(x / (width - 1), y / (height - 1), profile.seed, profile.cloud) * 255);
 }
 const map = new THREE.DataTexture(data, width, height, THREE.RedFormat, THREE.UnsignedByteType);
 map.wrapS = THREE.RepeatWrapping; map.wrapT = THREE.ClampToEdgeWrapping;
 map.minFilter = THREE.LinearMipmapLinearFilter; map.magFilter = THREE.LinearFilter; map.generateMipmaps = true;
 map.needsUpdate = true; heightMaps.set(cacheKey, map); return map;
}
function detailedIrregularGeometry(seed) {
 const geometry = new THREE.IcosahedronGeometry(1, 6), positions = geometry.attributes.position;
 for (let index = 0; index < positions.count; index++) {
  const x = positions.getX(index), y = positions.getY(index), z = positions.getZ(index);
  const f = 1 + .12 * Math.sin(x * 18 + y * 13 + z * 8 + seed) + .05 * Math.sin(x * 37 + y * 29 + z * 23 + seed * .37);
  positions.setXYZ(index, x * f * 1.3, y * f * .78, z * f);
 }
 positions.needsUpdate = true; geometry.computeVertexNormals(); return geometry;
}

export function surfaceReliefClearance(body) {
 // A standing eye must clear the highest displaced vertex and retain a small
 // physical gap above the ground.  This also prevents culling through Phobos.
 return profileFor(body).relief * 1.18 + .0008;
}

export function enterSurfaceDetail(view, body, maxAnisotropy = 8) {
 if (!view || !body || view.surfaceDetail) return;
 const profile = profileFor(body), material = view.mesh.material;
 const mission = MISSION_ASSETS[profile.key];
 view.surfaceDetail = {geometry: view.mesh.geometry, material: {
 displacementMap: material.displacementMap, displacementScale: material.displacementScale,
  bumpMap: material.bumpMap, bumpScale: material.bumpScale, anisotropy: material.map?.anisotropy,
  baseMap: material.map, dedicatedColor: !!mission?.color,
  onBeforeCompile: material.onBeforeCompile, customProgramCacheKey: material.customProgramCacheKey
 }};
 view.mesh.geometry = body.irregular ? detailedIrregularGeometry(profile.seed) : shapeGeometry('surface');
 view.surfaceDetail.ownedGeometry = !!body.irregular;
 if (!body.irregular) {
  const map = mission?.height ? missionTexture(mission.height, false) : heightMap(profile);
  material.displacementMap = map; material.displacementScale = profile.relief;
  material.bumpMap = map; material.bumpScale = profile.bump;
 }
 if (mission?.color) material.map = missionTexture(mission.color, true);
 // Moon's ordinary map deliberately reduces mission mosaics to a restrained
 // broad albedo tint for the far-away system view.  At ground level retain
 // the full LROC colour signal, while keeping the previously installed
 // eclipse shader in the compilation chain.
 if (profile.key === 'moon' && mission?.color) {
  const previousCompile = material.onBeforeCompile, previousKey = material.customProgramCacheKey?.bind(material);
  material.onBeforeCompile = shader => {
   previousCompile?.(shader);
   shader.fragmentShader = shader.fragmentShader.replace('diffuseColor*=sampledDiffuseColor;', 'diffuseColor*=texture2D(map,vMapUv);');
  };
  material.customProgramCacheKey = () => `${previousKey?.() || ''}|surface-lroc-colour-v1`;
 }
 if (material.map) material.map.anisotropy = Math.max(material.map.anisotropy || 1, Math.min(16, maxAnisotropy));
 material.needsUpdate = true;
}

export function leaveSurfaceDetail(view) {
 const state = view?.surfaceDetail;
 if (!state) return;
 const material = view.mesh.material;
 if (state.ownedGeometry) view.mesh.geometry.dispose();
 view.mesh.geometry = state.geometry;
 material.displacementMap = state.material.displacementMap; material.displacementScale = state.material.displacementScale;
 material.bumpMap = state.material.bumpMap; material.bumpScale = state.material.bumpScale;
 material.map = state.material.baseMap;
 material.onBeforeCompile = state.material.onBeforeCompile; material.customProgramCacheKey = state.material.customProgramCacheKey;
 if (material.map && state.material.anisotropy != null) material.map.anisotropy = state.material.anisotropy;
 material.needsUpdate = true; view.surfaceDetail = null;
}

export const surfaceDetailProfile = profileFor;
