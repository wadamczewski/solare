import * as THREE from 'three';
import {shapeGeometry} from './scene-lod.js';
import {hasMeasuredIrregularShape,measuredIrregularGeometry} from './body-shapes.js';
import {heightFieldToNormals, equirectangularTexelSpan, seamlessHeightField} from './surface-normal-detail.js';
import {createSurfaceTileStream,surfaceAssetKey} from './surface-tiles.js';
import {createSurfaceTopography} from './surface-topography.js';

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
const heightMaps = new Map(), normalMaps = new Map();
const detailTextures = new Map(), detailLoader = new THREE.TextureLoader();
const MISSION_ASSETS = Object.freeze({
 earth: {color: '/textures/surface/earth-blue-marble-4k.jpg'},
 moon: {color: '/textures/surface/moon-lroc-color.jpg', height: '/textures/surface/moon-lola-height.jpg', normal: '/textures/surface/moon-lola-normal.jpg'},
 mars: {height: '/textures/surface/mars-mola-height.jpg', normal: '/textures/surface/mars-mola-normal.jpg'}
});

// This is deliberately keyed through surfaceAssetKey(), never through the
// renderer category.  In particular, every satellite has key: 'moon' while
// only Earth's Moon owns the LROC/LOLA products.
export function missionAssetsForBody(body) {
 return MISSION_ASSETS[surfaceAssetKey(body)] || null;
}

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
const MOON_PROFILE_KEYS=Object.freeze({
 'Księżyc':'moon',Moon:'moon',Fobos:'phobos',Deimos:'deimos',Io:'io',Europa:'europa',Ganimedes:'ganymede',Kallisto:'callisto',
 Mimas:'mimas',Enceladus:'enceladus',Tetyda:'tethys',Dione:'dione',Rea:'rhea',Tytan:'titan',Japet:'iapetus',Hyperion:'hyperion',Tryton:'triton'
});
function profileFor(body) {
 const assetKey=surfaceAssetKey(body),key=assetKey || MOON_PROFILE_KEYS[body?.name] || (body?.key==='moon'?`moon:${body.name}`:body?.key);
 const [relief, bump] = ROCKY[key] || (GAS.has(key) || body.gas ? [.00022, .065] : [.0032, .17]);
 return {key,assetKey, relief, bump, cloud: GAS.has(key) || !!body.gas, seed: String(body.name || key).split('').reduce((n, char) => (n * 31 + char.charCodeAt(0)) >>> 0, 29)};
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
// A normal map derived from the same procedural field heightMap() displaces
// the mesh with, so a world with no mission elevation data (every rocky body
// but Mars and the Moon, including Earth today) still shades the slopes it
// actually stands on rather than a flat or screen-space-derivative bump.
function proceduralNormalMap(profile) {
 const cacheKey = `${profile.key}:${profile.seed}:${profile.cloud}`;
 if (normalMaps.has(cacheKey)) return normalMaps.get(cacheKey);
 const source = heightMap(profile), {width, height} = source.image, field = source.image.data;
 const {worldStepU, worldStepV} = equirectangularTexelSpan(width, height);
 const normals = heightFieldToNormals(field, width, height, {relief: profile.relief, worldStepU, worldStepV});
 // DataTexture needs an alpha channel (RGBFormat has no WebGL2 upload path).
 const rgba = new Uint8Array(width * height * 4);
 for (let i = 0; i < width * height; i++) {
  rgba[i * 4] = normals[i * 3]; rgba[i * 4 + 1] = normals[i * 3 + 1]; rgba[i * 4 + 2] = normals[i * 3 + 2]; rgba[i * 4 + 3] = 255;
 }
 const map = new THREE.DataTexture(rgba, width, height, THREE.RGBAFormat, THREE.UnsignedByteType);
 map.wrapS = THREE.RepeatWrapping; map.wrapT = THREE.ClampToEdgeWrapping;
 map.minFilter = THREE.LinearMipmapLinearFilter; map.magFilter = THREE.LinearFilter; map.generateMipmaps = true;
 map.needsUpdate = true; normalMaps.set(cacheKey, map); return map;
}

// However real a body's own map is, it is still a few thousand kilometres
// per texel: the ground right under a standing observer is always well
// inside a single texel of it. This is a second, much finer normal map -
// generic rock/regolith grain, not tied to any body - tiled hundreds of
// times across the surface and blended in close up, so that patch of
// ground reads as textured rather than as a smooth interpolation of its
// far-away neighbours. It is a cosmetic detail layer on top of the real
// per-texel shading above, not a substitute for it.
const DETAIL_SIZE = 128, DETAIL_REPEAT = 180, DETAIL_STRENGTH = .55;
let detailNormalMapCache = null;
function microDetailNormalMap() {
 if (detailNormalMapCache) return detailNormalMapCache;
 const field = seamlessHeightField(DETAIL_SIZE, DETAIL_SIZE, 401);
 const {worldStepU, worldStepV} = equirectangularTexelSpan(DETAIL_SIZE, DETAIL_SIZE, 1);
 // Not a real elevation model - just enough relief that the grain has a
 // visible normal once it is repeated at DETAIL_REPEAT.
 const normals = heightFieldToNormals(field, DETAIL_SIZE, DETAIL_SIZE, {relief: .015, worldStepU, worldStepV});
 const rgba = new Uint8Array(DETAIL_SIZE * DETAIL_SIZE * 4);
 for (let i = 0; i < DETAIL_SIZE * DETAIL_SIZE; i++) {
  rgba[i * 4] = normals[i * 3]; rgba[i * 4 + 1] = normals[i * 3 + 1]; rgba[i * 4 + 2] = normals[i * 3 + 2]; rgba[i * 4 + 3] = 255;
 }
 const map = new THREE.DataTexture(rgba, DETAIL_SIZE, DETAIL_SIZE, THREE.RGBAFormat, THREE.UnsignedByteType);
 map.wrapS = THREE.RepeatWrapping; map.wrapT = THREE.RepeatWrapping;
 map.minFilter = THREE.LinearMipmapLinearFilter; map.magFilter = THREE.LinearFilter; map.generateMipmaps = true;
 map.needsUpdate = true; detailNormalMapCache = map; return map;
}
// Blends the fine grain into whatever normal the standard chunks already
// produced, using a triplanar projection (three axis-aligned samples of the
// same small tile, blended by how face-on the surface is to each axis) so
// there is no UV seam or pole pinch to hide - the equirectangular maps
// above already carry that risk once; a second, much higher-frequency map
// would make it far more visible.  Each projection's own tangent frame is
// just the two object-space axes it does not sample along, so this needs
// no derivatives and cannot go flat at grazing incidence the way Three's
// screen-space bump chunk does.
function applyMicroDetail(material) {
 const previousCompile = material.onBeforeCompile, previousKey = material.customProgramCacheKey?.bind(material);
 const detailMap = microDetailNormalMap();
 material.onBeforeCompile = shader => {
  previousCompile?.(shader);
  shader.uniforms.detailNormalMap = {value: detailMap};
  shader.uniforms.detailRepeat = {value: DETAIL_REPEAT};
  shader.uniforms.detailStrength = {value: DETAIL_STRENGTH};
  shader.vertexShader = 'varying vec3 vDetailPosition;\nvarying vec3 vDetailNormal;\n' + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvDetailPosition=position;vDetailNormal=normal;');
  shader.fragmentShader = 'varying vec3 vDetailPosition;\nvarying vec3 vDetailNormal;\nuniform sampler2D detailNormalMap;\nuniform float detailRepeat;\nuniform float detailStrength;\n#if !defined(USE_NORMALMAP_OBJECTSPACE)\nuniform mat3 normalMatrix;\n#endif\n' + shader.fragmentShader;
  shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{
 vec3 dn=normalize(vDetailNormal);
 vec3 blend=pow(abs(dn),vec3(4.0));blend/=(blend.x+blend.y+blend.z+1e-5);
 vec3 sampX=texture2D(detailNormalMap,vDetailPosition.zy*detailRepeat).xyz*2.0-1.0;
 vec3 sampY=texture2D(detailNormalMap,vDetailPosition.xz*detailRepeat).xyz*2.0-1.0;
 vec3 sampZ=texture2D(detailNormalMap,vDetailPosition.xy*detailRepeat).xyz*2.0-1.0;
 vec3 detailObject=
  vec3(sign(dn.x)*sampX.z,sampX.y,sampX.x)*blend.x+
  vec3(sampY.x,sign(dn.y)*sampY.z,sampY.y)*blend.y+
  vec3(sampZ.x,sampZ.y,sign(dn.z)*sampZ.z)*blend.z;
 normal=normalize(normal+normalize(normalMatrix*detailObject)*detailStrength);
}
`);
 };
 material.customProgramCacheKey = () => `${previousKey?.() || ''}|surface-micro-detail-v1`;
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
 const mission = missionAssetsForBody(body);
 view.surfaceDetail = {geometry: view.mesh.geometry, material: {
 displacementMap: material.displacementMap, displacementScale: material.displacementScale,
  normalMap: material.normalMap, normalScale: material.normalScale?.clone(), anisotropy: material.map?.anisotropy,
  baseMap: material.map, dedicatedColor: !!mission?.color,
  onBeforeCompile: material.onBeforeCompile, customProgramCacheKey: material.customProgramCacheKey
 }};
 view.mesh.geometry = hasMeasuredIrregularShape(body) ? measuredIrregularGeometry(body,6) : body.irregular ? detailedIrregularGeometry(profile.seed) : shapeGeometry('surface');
 view.surfaceDetail.ownedGeometry = !!body.irregular;
 if (!body.irregular) {
  const map = mission?.height ? missionTexture(mission.height, false) : heightMap(profile);
  material.displacementMap = map; material.displacementScale = profile.relief;
  // A real per-texel gradient (see surface-normal-detail.js) instead of
  // Three's screen-space bump chunk, which goes flat once a texel covers
  // less than a screen pixel - the case for the whole time anyone is
  // standing on the ground looking at anything nearby.
  material.normalMap = mission?.normal ? missionTexture(mission.normal, false) : proceduralNormalMap(profile);
 material.normalScale.set(profile.bump, profile.bump);
 }
 if (mission?.color) material.map = missionTexture(mission.color, true);
 // Moon's ordinary map deliberately reduces mission mosaics to a restrained
 // broad albedo tint for the far-away system view.  At ground level retain
 // the full LROC colour signal, while keeping the previously installed
 // eclipse shader in the compilation chain.
 if (profile.assetKey === 'moon' && mission?.color) {
  const previousCompile = material.onBeforeCompile, previousKey = material.customProgramCacheKey?.bind(material);
  material.onBeforeCompile = shader => {
   previousCompile?.(shader);
   shader.fragmentShader = shader.fragmentShader.replace('diffuseColor*=sampledDiffuseColor;', 'diffuseColor*=texture2D(map,vMapUv);');
  };
  material.customProgramCacheKey = () => `${previousKey?.() || ''}|surface-lroc-colour-v1`;
 }
 applyMicroDetail(material);
 // The broad texture tiles retain their low request count.  Surveyed terrain
 // is a distinct, short-range layer and receives the fully configured base
 // material, so its imagery, eclipse lighting and colour calibration match
 // the underlying body exactly.
 view.surfaceDetail.tiles = createSurfaceTileStream(body, maxAnisotropy);
 if (view.surfaceDetail.tiles) view.mesh.add(view.surfaceDetail.tiles.group);
 view.surfaceDetail.topography = createSurfaceTopography(body, material);
 if (view.surfaceDetail.topography) view.mesh.add(view.surfaceDetail.topography.group);
 if (material.map) material.map.anisotropy = Math.max(material.map.anisotropy || 1, Math.min(16, maxAnisotropy));
 material.needsUpdate = true;
}

// The stream is intentionally updated from the observer's geographic point,
// not from camera position.  The latter moves a little with eye height and
// would make the visible tile window flicker at a boundary.
export function updateSurfaceDetailTiles(view, latitude, longitude) {
 view?.surfaceDetail?.tiles?.update(latitude, longitude);
 view?.surfaceDetail?.topography?.update(latitude, longitude);
}

export function leaveSurfaceDetail(view) {
 const state = view?.surfaceDetail;
 if (!state) return;
 const material = view.mesh.material;
 state.tiles?.group.parent?.remove(state.tiles.group);
 state.tiles?.dispose();
 state.topography?.group.parent?.remove(state.topography.group);
 state.topography?.dispose();
 if (state.ownedGeometry) view.mesh.geometry.dispose();
 view.mesh.geometry = state.geometry;
 material.displacementMap = state.material.displacementMap; material.displacementScale = state.material.displacementScale;
 material.normalMap = state.material.normalMap; if (state.material.normalScale) material.normalScale.copy(state.material.normalScale);
 material.map = state.material.baseMap;
 material.onBeforeCompile = state.material.onBeforeCompile; material.customProgramCacheKey = state.material.customProgramCacheKey;
 if (material.map && state.material.anisotropy != null) material.map.anisotropy = state.material.anisotropy;
 material.needsUpdate = true; view.surfaceDetail = null;
}

export const surfaceDetailProfile = profileFor;
