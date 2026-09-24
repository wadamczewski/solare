import * as THREE from 'three';

// Surface tiles are deliberately a separate layer over the global body map.
// The system map keeps its inexpensive global texture; entering a surface view
// fetches only the nine tiles around the observer, then replaces that window
// when the observer crosses a tile boundary.
export const SURFACE_TILESETS = Object.freeze({
 earth: Object.freeze({columns:8, rows:4, path:'/textures/surface/tiles/earth'}),
 moon: Object.freeze({columns:4, rows:2, path:'/textures/surface/tiles/moon'}),
 mars: Object.freeze({columns:4, rows:2, path:'/textures/surface/tiles/mars'})
});
// A few metres are sufficient for depth ordering over the base globe. A
// kilometre-scale shell makes its edge visible at the horizon.
export const SURFACE_TILE_SHELL_SCALE = 1.000003;

const wrap = (value, length) => ((value % length) + length) % length;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// `key: moon` is a renderer category shared by every satellite.  It is not a
// surface-data identity: only Earth's Moon has the local LROC/LOLA tile set.
// A moon may opt into a future dedicated tile source with `surface`.
export function surfaceAssetKey(body) {
 const requested = body?.surface;
 // A persisted state may contain a `surface` override.  Do not let one of
 // the three shared mission collections become an alias for a different
 // world: a Moon tile set on Nereid is much worse than falling back to its
 // own global/procedural appearance.  Unknown names remain valid future
 // dedicated sources (for example `deimos-hires`).
 if (requested === 'earth' && body?.key !== 'earth') return null;
 if (requested === 'mars' && body?.key !== 'mars') return null;
 if (requested === 'moon' && !['Księżyc','Moon'].includes(body?.name)) return null;
 if (requested) return requested;
 if (body?.key === 'moon') return ['Księżyc','Moon'].includes(body.name) ? 'moon' : null;
 return body?.key || null;
}

export function surfaceTileset(key) {
 return SURFACE_TILESETS[key] || null;
}

export function surfaceTileAddress(key, latitude, longitude) {
 const tileset = surfaceTileset(key);
 if (!tileset) return null;
 const u = wrap((Number(longitude) + 180) / 360, 1);
 const v = clamp((90 - Number(latitude)) / 180, 0, 1 - Number.EPSILON);
 return {
  key,
  column: Math.floor(u * tileset.columns),
  row: Math.floor(v * tileset.rows),
  id: `${key}/${Math.floor(u * tileset.columns)}-${Math.floor(v * tileset.rows)}`
 };
}

export function surfaceTileWindow(key, latitude, longitude, radius = 1) {
 const centre = surfaceTileAddress(key, latitude, longitude), tileset = surfaceTileset(key);
 if (!centre || !tileset) return [];
 const result = new Map();
 for (let row = Math.max(0, centre.row - radius); row <= Math.min(tileset.rows - 1, centre.row + radius); row++) {
  for (let offset = -radius; offset <= radius; offset++) {
   const column = wrap(centre.column + offset, tileset.columns);
   const id = `${key}/${column}-${row}`;
   result.set(id, {key, column, row, id});
  }
 }
 return [...result.values()];
}

function patchGeometry(tileset, column, row, segments = 20) {
 const vertices = [], uvs = [], indices = [];
 const u0 = column / tileset.columns, u1 = (column + 1) / tileset.columns;
 const v0 = row / tileset.rows, v1 = (row + 1) / tileset.rows;
 for (let y = 0; y <= segments; y++) {
  const v = v0 + (v1 - v0) * y / segments;
  const polar = v * Math.PI, sinPolar = Math.sin(polar), cosPolar = Math.cos(polar);
  for (let x = 0; x <= segments; x++) {
   const u = u0 + (u1 - u0) * x / segments, longitude = u * Math.PI * 2;
   // Three.js sphere maps place the equirectangular seam on -X.
   vertices.push(-Math.cos(longitude) * sinPolar, cosPolar, Math.sin(longitude) * sinPolar);
   uvs.push(x / segments, 1 - y / segments);
  }
 }
 const stride = segments + 1;
 for (let y = 0; y < segments; y++) for (let x = 0; x < segments; x++) {
  const a = y * stride + x, b = a + stride, c = b + 1, d = a + 1;
  indices.push(a, b, d, b, c, d);
 }
 const geometry = new THREE.BufferGeometry();
 geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
 geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
 geometry.setIndex(indices);
 geometry.computeVertexNormals();
 return geometry;
}

const textureCache = new Map();
function loadTile(path, anisotropy) {
 if (textureCache.has(path)) return textureCache.get(path);
 const promise = new Promise((resolve, reject) => {
  new THREE.TextureLoader().load(path, texture => {
   texture.colorSpace = THREE.SRGBColorSpace;
   texture.wrapS = THREE.ClampToEdgeWrapping;
   texture.wrapT = THREE.ClampToEdgeWrapping;
   texture.minFilter = THREE.LinearMipmapLinearFilter;
   texture.magFilter = THREE.LinearFilter;
   texture.anisotropy = Math.max(1, Math.min(16, anisotropy || 1));
   resolve(texture);
  }, undefined, reject);
 });
 textureCache.set(path, promise);
 return promise;
}

function materialFor(texture) {
 return new THREE.MeshStandardMaterial({
  map:texture, roughness:.86, metalness:0,
  polygonOffset:true, polygonOffsetFactor:-1, polygonOffsetUnits:-1
 });
}

export function createSurfaceTileStream(body, anisotropy = 1) {
 const key=surfaceAssetKey(body),tileset = surfaceTileset(key);
 // The initial Earth tile pyramid was a coarse preview set, not a seamless
 // photometric mosaic. At ground level its raised shell exposed tile borders
 // and changed with the depth buffer as the observer moved. Keep the stable
 // Blue Marble base map until the planned real Earth tile source replaces it;
 // the measured Everest DEM remains available independently.
 if (key === 'earth') return null;
 if (!tileset) return null;
 const group = new THREE.Group();
 group.name = 'surface-detail-tiles';
 group.scale.setScalar(SURFACE_TILE_SHELL_SCALE);
 const meshes = new Map(), wanted = new Set();
 let disposed = false;

 const add = address => {
  const path = `${tileset.path}/${address.column}-${address.row}.jpg`;
  loadTile(path, anisotropy).then(texture => {
   if (disposed || !wanted.has(address.id) || meshes.has(address.id)) return;
   const mesh = new THREE.Mesh(patchGeometry(tileset, address.column, address.row), materialFor(texture));
   mesh.name = `surface-tile:${address.id}`;
   mesh.frustumCulled = true;
   meshes.set(address.id, mesh);
   group.add(mesh);
  }).catch(() => {
   // A global texture remains underneath, so an unavailable tile must never
   // interrupt a surface view or leave a checkerboard placeholder.
  });
 };

 return {
  group,
  update(latitude, longitude) {
   const addresses = surfaceTileWindow(key, latitude, longitude);
   wanted.clear(); addresses.forEach(address => wanted.add(address.id));
   for (const [id, mesh] of meshes) if (!wanted.has(id)) {
    group.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); meshes.delete(id);
   }
   addresses.forEach(address => { if (!meshes.has(address.id)) add(address); });
  },
  get loaded() { return meshes.size; },
  get targetCount() { return wanted.size; },
  dispose() {
   disposed = true; wanted.clear();
   for (const mesh of meshes.values()) { group.remove(mesh); mesh.geometry.dispose(); mesh.material.dispose(); }
   meshes.clear();
  }
 };
}
