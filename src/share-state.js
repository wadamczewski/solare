import {deflateSync,inflateSync} from 'three/addons/libs/fflate.module.js';

// Version 1 links carried the bodies and a handful of settings; they still
// open. Version 2 carries the whole view - see createViewShare below.
const VERSION = 1;
export const SHARE_VERSION = 2;

const BODY_FIELDS = [
 'name','key','mass','radius','spin','tilt','color','a','e','irregular','gas',
 'textureKey','stellar','starPresetId','colorTemperature','luminosity',
 'temperature','magneticField','surface','kind','poleAzimuth'
];

const base64Encode = text => {
 const bytes = new TextEncoder().encode(text);
 let binary = '';
 for (const byte of bytes) binary += String.fromCharCode(byte);
 return btoa(binary).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
};
const base64Decode = token => {
 const padded = token.replaceAll('-','+').replaceAll('_','/') + '='.repeat((4 - token.length % 4) % 4);
 const binary = atob(padded);
 return new TextDecoder().decode(Uint8Array.from(binary, char => char.charCodeAt(0)));
};

export function snapshotBody(body, parentName = null) {
 const values = BODY_FIELDS.map(field => body[field] ?? null);
 return [...values, [...body.p], [...body.v], parentName];
}

export function restoreBody(snapshot) {
 if (!Array.isArray(snapshot) || snapshot.length !== BODY_FIELDS.length + 3) return null;
 const values = Object.fromEntries(BODY_FIELDS.map((field, index) => [field, snapshot[index]]));
 const [p, v, parentName] = snapshot.slice(-3);
 if (!Array.isArray(p) || p.length !== 3 || !Array.isArray(v) || v.length !== 3) return null;
 if (!values.name || !values.key || ![...p, ...v, values.mass, values.radius].every(Number.isFinite)) return null;
 return {...values, p:[...p], v:[...v], parentName:parentName || null};
}

export function createShareState({bodies, epoch, elapsed, speed, compressed, brightness, centralStar, showOrbits}) {
 const byId = new Map(bodies.map(body => [body.id, body.name]));
 return {
  v:VERSION,
  e:new Date(epoch).toISOString(),
  t:Number(elapsed) || 0,
  s:Number(speed) || 0,
  c:compressed ? 1 : 0,
  b:Number(brightness) || 100,
  z:centralStar || 'sun',
  o:showOrbits ? 1 : 0,
  x:bodies.map(body => snapshotBody(body, byId.get(body.parent) || null))
 };
}

export function encodeShareState(state) {
 return base64Encode(JSON.stringify(state));
}

function decodeLegacyShareState(token) {
 try {
  const state = JSON.parse(base64Decode(token));
  if (state?.v !== VERSION || !Array.isArray(state.x) || !Number.isFinite(state.t) || !Number.isFinite(state.s)) return null;
  const bodies = state.x.map(restoreBody);
  if (bodies.some(body => !body)) return null;
  return {...state, x:bodies};
 } catch {
  return null;
 }
}

export function shareUrl(location, state) {
 const url = new URL(location.href);
 url.hash = `solare=${state?.v === SHARE_VERSION ? encodeViewShare(state) : encodeShareState(state)}`;
 return url.toString();
}

export function shareTokenFromLocation(location) {
 const match = String(location.hash || '').match(/^#solare=(.+)$/);
 return match ? decodeShareState(match[1]) : null;
}


// ---- Version 2: the whole view -------------------------------------------
//
// A shared link has to put the receiver in front of exactly what the sender
// saw: the same instant, every body in the same state, the same camera and
// the same mode. Only per-viewer preferences stay the receiver's own - the
// interface language and which side panels are folded.
//
// Bodies are stored as differences from the default system rebuilt for the
// shared epoch (initialSystem is deterministic), so the untouched catalogue
// fields of the 47 default bodies cost nothing and every changed field -
// positions and velocities, always - travels at full double precision. The
// JSON is deflated (fflate, shipped with three.js) and base64url-encoded,
// prefixed with "2." so version 1 tokens are still recognised.

const MAX_BODIES = 4000;
// Fields holding another body's id. Ids are session counters, so they are
// carried as the sender's ids and remapped to the receiver's new ones.
const ID_FIELDS = ['parent', 'lastGraze'];

const isPlainObject = value => value !== null && typeof value === 'object' && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);

// A JSON-safe deep copy: numbers, strings, booleans, null, arrays and plain
// objects. Functions, class instances (THREE objects, DOM nodes) and
// non-finite numbers are left out - no body field depends on them.
export function plainValue(value) {
 if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
 if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
 if (Array.isArray(value)) return value.map(item => {const plain = plainValue(item); return plain === undefined ? null : plain;});
 if (isPlainObject(value)) {
  const result = {};
  for (const [key, item] of Object.entries(value)) {const plain = plainValue(item); if (plain !== undefined) result[key] = plain;}
  return result;
 }
 return undefined;
}

function plainBody(body) {
 const result = plainValue(body) || {};
 delete result.id;
 return result;
}
function splitReferences(fields) {
 const refs = {};
 for (const field of ID_FIELDS) {if (fields[field] != null) refs[field] = fields[field]; delete fields[field];}
 if (Array.isArray(fields.fragmentOf)) refs.fragmentOf = fields.fragmentOf;
 delete fields.fragmentOf;
 return refs;
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const signature = body => `${body.key}:${body.name}`;

export function snapshotBodies(bodies, reference = []) {
 const index = new Map();
 reference.forEach((body, position) => {if (!index.has(signature(body))) index.set(signature(body), position);});
 const used = new Set();
 return bodies.map(body => {
  const own = plainBody(body), refs = splitReferences(own), entry = {i: body.id};
  if (Object.keys(refs).length) entry.r = refs;
  const position = index.get(signature(body));
  if (position == null || used.has(position)) return {...entry, f: own};
  used.add(position);
  const base = plainBody(reference[position]);splitReferences(base);
  const diff = {};
  for (const [key, value] of Object.entries(own)) if (!same(value, base[key])) diff[key] = value;
  const removed = Object.keys(base).filter(key => !(key in own));
  return {...entry, m: position, d: diff, ...(removed.length ? {u: removed} : {})};
 });
}

const validVector = value => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
const validBody = fields => fields && typeof fields.name === 'string' && typeof fields.key === 'string' &&
 validVector(fields.p) && validVector(fields.v) && Number.isFinite(fields.mass) && Number.isFinite(fields.radius);

// Rebuilds plain body fields (without ids) from a snapshot. Each result keeps
// the sender's id and references so restoreReferences can remap them.
export function expandBodies(saved, reference = []) {
 if (!Array.isArray(saved) || saved.length > MAX_BODIES) return null;
 const result = [];
 for (const entry of saved) {
  if (!entry || !(Number.isFinite(entry.i) || typeof entry.i === 'string')) return null;
  let fields;
  if (entry.f) fields = plainValue(entry.f);
  else {
   const base = reference[entry.m];if (!base) return null;
   fields = plainBody(base);splitReferences(fields);
   for (const key of entry.u || []) delete fields[key];
   Object.assign(fields, plainValue(entry.d || {}));
  }
  if (!validBody(fields)) return null;
  result.push({senderId: entry.i, fields, refs: isPlainObject(entry.r) ? entry.r : {}});
 }
 return result;
}

// Points id fields at the receiver's ids. A reference to a body that no longer
// exists (the parents of a fragment, say) is dropped rather than left pointing
// at an unrelated body that happens to reuse the number.
export function restoreReferences(target, refs, ids) {
 for (const field of ID_FIELDS) {
  if (refs[field] == null) delete target[field];
  else if (ids.has(refs[field])) target[field] = ids.get(refs[field]);
  else delete target[field];
 }
 if (Array.isArray(refs.fragmentOf)) target.fragmentOf = refs.fragmentOf.map(id => ids.get(id) ?? null);
 if (isPlainObject(target.collisionScenario) && target.collisionScenario.targetId != null)
  target.collisionScenario.targetId = ids.get(target.collisionScenario.targetId) ?? null;
 return target;
}

export const viewport = ({camera, target, fov}) => ({p: [...camera], t: [...target], f: fov});
export const validViewport = value => !!value && validVector(value.p) && validVector(value.t) && Number.isFinite(value.f) && value.f > 0 && value.f < 180;

export function createViewShare({epoch, elapsed, speed, paused, compressed, brightness, infall = 0, layers = {}, camera, follow = null, selected = null, educationSubject = null, panel = null, modes = {}, bodies = null, reference = []}) {
 return plainValue({
  v: SHARE_VERSION,
  e: new Date(epoch).toISOString(),
  t: Number(elapsed) || 0,
  s: Number(speed) || 0,
  p: paused ? 1 : 0,
  c: compressed ? 1 : 0,
  b: Number(brightness) || 100,
  n: Number(infall) || 0,
  l: {o: layers.orbits ? 1 : 0, c: layers.constellations ? 1 : 0, d: layers.deepSky ? 1 : 0, k: layers.landmarks ? 1 : 0, x: layers.education ? 1 : 0},
  cam: camera,
  fo: follow, se: selected, es: educationSubject,
  pn: panel,
  m: modes,
  x: bodies ? snapshotBodies(bodies, reference) : null
 });
}

const base64UrlBytes = bytes => {
 let binary = '';
 for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
 return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
};
const bytesFromBase64Url = token => {
 const padded = token.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - token.length % 4) % 4);
 return Uint8Array.from(atob(padded), char => char.charCodeAt(0));
};

export function encodeViewShare(state) {
 return `${SHARE_VERSION}.${base64UrlBytes(deflateSync(new TextEncoder().encode(JSON.stringify(state)), {level: 9}))}`;
}

function decodeViewShare(token) {
 try {
  const state = JSON.parse(new TextDecoder().decode(inflateSync(bytesFromBase64Url(token))));
  if (state?.v !== SHARE_VERSION || !Number.isFinite(state.t) || !Number.isFinite(state.s) || Number.isNaN(Date.parse(state.e))) return null;
  if (state.cam != null && !validViewport(state.cam)) return null;
  if (state.x != null && !Array.isArray(state.x)) return null;
  return state;
 } catch {
  return null;
 }
}

export function decodeShareState(token) {
 const text = String(token || '');
 return text.startsWith(`${SHARE_VERSION}.`) ? decodeViewShare(text.slice(2)) : decodeLegacyShareState(text);
}
