const VERSION = 1;

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

export function decodeShareState(token) {
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
 url.hash = `solare=${encodeShareState(state)}`;
 return url.toString();
}

export function shareTokenFromLocation(location) {
 const match = String(location.hash || '').match(/^#solare=(.+)$/);
 return match ? decodeShareState(match[1]) : null;
}

