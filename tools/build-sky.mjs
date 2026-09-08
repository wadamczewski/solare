// Offline data preparation for the celestial sphere. Not part of `npm run build`.
//
// Reads the d3-celestial catalogues (BSD-3-Clause, Olaf Frohn; derived from
// Hipparcos/Tycho and Mellinger's all-sky survey) and writes the compact binary
// assets the renderer streams at runtime.
//
//   node tools/build-sky.mjs <source-data-dir>
//
// Source files expected in <source-data-dir>:
//   stars.8.json, starnames.json, mw.json, dsos.bright.json, constellations.lines.json
//
// Outputs into public/sky/: stars.bin, milkyway.bin, deepsky.json, constellations.bin
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {deflateSync} from 'node:zlib';

// Minimal 8-bit greyscale PNG writer: the Milky Way ships as a luminance map and
// pulling in an image library for one file would not earn its place.
function greyscalePNG(width, height, pixels) {
 const raw = Buffer.alloc((width + 1) * height);
 for (let y = 0; y < height; y++) {
  raw[y * (width + 1)] = 0; // filter: none
  pixels.copy ? pixels.copy(raw, y * (width + 1) + 1, y * width, (y + 1) * width)
              : Buffer.from(pixels.subarray(y * width, (y + 1) * width)).copy(raw, y * (width + 1) + 1);
 }
 const chunk = (type, body) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(body.length);
  const payload = Buffer.concat([Buffer.from(type, 'ascii'), body]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(payload) >>> 0);
  return Buffer.concat([length, payload, crc]);
 };
 const header = Buffer.alloc(13);
 header.writeUInt32BE(width, 0);
 header.writeUInt32BE(height, 4);
 header[8] = 8; header[9] = 0; header[10] = 0; header[11] = 0; header[12] = 0;
 return Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', header),
  chunk('IDAT', deflateSync(raw, {level: 9})),
  chunk('IEND', Buffer.alloc(0))
 ]);
}

const CRC_TABLE = (() => {
 const table = new Int32Array(256);
 for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  table[n] = c;
 }
 return table;
})();
function crc32(buffer) {
 let c = -1;
 for (let i = 0; i < buffer.length; i++) c = CRC_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8);
 return c ^ -1;
}

const source = process.argv[2];
if (!source) {
  console.error('usage: node tools/build-sky.mjs <source-data-dir>');
  process.exit(1);
}
const out = 'public/sky';
mkdirSync(out, {recursive: true});
const read = name => JSON.parse(readFileSync(join(source, name), 'utf8'));

// Deterministic RNG so regenerating the assets reproduces byte-identical output.
let seed = 20260908;
const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

// ---------------------------------------------------------------- stars
// Quantisation: RA to 360/65536 deg (~20"), Dec to 1/180 deg (~20"), both far
// below one screen pixel at any zoom the app allows.
function buildStars() {
  const stars = read('stars.8.json').features;
  const names = read('starnames.json');
  const rows = [];
  for (const f of stars) {
    const [ra, dec] = f.geometry.coordinates;
    const mag = Number(f.properties.mag);
    const bv = Number(f.properties.bv);
    if (!Number.isFinite(ra) || !Number.isFinite(dec) || !Number.isFinite(mag)) continue;
    rows.push({ra: ((ra % 360) + 360) % 360, dec, mag, bv: Number.isFinite(bv) ? bv : 0.65, id: f.id});
  }
  rows.sort((a, b) => a.mag - b.mag);

  const n = rows.length;
  const buffer = new ArrayBuffer(4 + n * 7);
  new DataView(buffer).setUint32(0, n, true);
  const ra = new Uint16Array(buffer, 4, n);
  const dec = new Int16Array(buffer, 4 + n * 2, n);
  const mag = new Int16Array(buffer, 4 + n * 4, n);
  const bv = new Int8Array(buffer, 4 + n * 6, n);
  rows.forEach((s, i) => {
    ra[i] = Math.round(s.ra * 65536 / 360) & 0xffff;
    dec[i] = Math.round(s.dec * 180);
    mag[i] = Math.round(Math.max(-2, Math.min(20, s.mag)) * 100);
    bv[i] = Math.round(Math.max(-2.5, Math.min(2.5, s.bv)) * 50);
  });
  writeFileSync(join(out, 'stars.bin'), Buffer.from(buffer));

  // Proper names for the brightest stars, used as orientation landmarks.
  const named = [];
  for (const s of rows) {
    if (s.mag > 2.1) break;
    const entry = names[String(s.id)];
    const label = entry && (entry.name || entry.desig);
    if (label) named.push({name: label, ra: Number(s.ra.toFixed(3)), dec: Number(s.dec.toFixed(3)), mag: s.mag});
  }
  return {count: n, named, brightest: rows[0]};
}

// ------------------------------------------------------------ milky way
// The five nested isophotes are rasterised with an even-odd scanline fill (so
// interior rings punch out the dark rifts), then rejection-sampled into a point
// cloud. Physically this is what the band is: unresolved stars, not a surface.
const GRID_W = 2880, GRID_H = 1440; // 0.125 deg per cell

function splitAtSeam(ring) {
  // The band wraps the sky, so some rings are clipped at the antimeridian and
  // jump between +180 and -180 partway through. Cutting naively leaves a piece
  // whose first and last points sit far apart, and closing that piece draws a
  // spurious wedge right across the map. Rotating the ring to start immediately
  // after a crossing puts both ends of every piece on the seam, so each closes
  // along the 180 deg meridian, which is where the real boundary runs.
  const closed = ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1];
  const loop = closed ? ring.slice(0, -1) : ring.slice();
  if (loop.length < 3) return [];

  const jumps = [];
  for (let i = 0; i < loop.length; i++) {
    const previous = loop[(i - 1 + loop.length) % loop.length];
    if (Math.abs(loop[i][0] - previous[0]) > 180) jumps.push(i);
  }
  if (!jumps.length) return [loop];
  if (!closed) {
    // An open ring cannot be rotated; fall back to plain cuts.
    const parts = [];
    let current = [loop[0]];
    for (let i = 1; i < loop.length; i++) {
      if (Math.abs(loop[i][0] - loop[i - 1][0]) > 180) { parts.push(current); current = []; }
      current.push(loop[i]);
    }
    parts.push(current);
    return parts.filter(part => part.length > 2);
  }

  const rotated = loop.slice(jumps[0]).concat(loop.slice(0, jumps[0]));
  const parts = [];
  let current = [rotated[0]];
  for (let i = 1; i < rotated.length; i++) {
    if (Math.abs(rotated[i][0] - rotated[i - 1][0]) > 180) { parts.push(current); current = []; }
    current.push(rotated[i]);
  }
  parts.push(current);

  // An odd number of seam crossings means the ring encircles the sky - which the
  // band's northern and southern edges both do. Such a curve has no 2-D interior
  // on its own; closing it down to the south pole makes it bound "everything
  // south of here", and the even-odd fill of the two edges is then exactly the
  // band between them. Both edges must use the same pole for that to hold.
  const encircles = jumps.length % 2 === 1;
  return parts.filter(part => part.length > 2).map(part => encircles
    ? part.concat([[part[part.length - 1][0], -90], [part[0][0], -90]])
    : part);
}

function rasterise(features) {
  const levels = new Uint8Array(GRID_W * GRID_H);
  features.forEach((feature, index) => {
    const edges = [];
    // Closing an encircling ring at the pole is a rasterisation device, not data.
    // Track where the survey's own vertices actually reach so the fill can be
    // clipped back to that range and the closure cannot leak a spurious ring
    // around the pole.
    let minDec = 90, maxDec = -90;
    for (const polygon of feature.geometry.coordinates)
      for (const ring of polygon)
        for (const point of ring) { minDec = Math.min(minDec, point[1]); maxDec = Math.max(maxDec, point[1]); }
    for (const polygon of feature.geometry.coordinates)
      for (const ring of polygon)
        for (const part of splitAtSeam(ring)) {
          for (let i = 0; i < part.length; i++) {
            const a = part[i], b = part[(i + 1) % part.length];
            if (a[1] !== b[1]) edges.push([a[0], a[1], b[0], b[1]]);
          }
        }
    const mask = new Uint8Array(GRID_W * GRID_H);
    for (let row = 0; row < GRID_H; row++) {
      const y = 90 - (row + 0.5) * 180 / GRID_H;
      if (y < minDec || y > maxDec) continue;
      const crossings = [];
      for (const [x1, y1, x2, y2] of edges) {
        if ((y1 <= y) === (y2 <= y)) continue;
        crossings.push(x1 + (y - y1) / (y2 - y1) * (x2 - x1));
      }
      if (!crossings.length) continue;
      crossings.sort((a, b) => a - b);
      for (let k = 0; k + 1 < crossings.length; k += 2) {
        const from = Math.max(0, Math.round((crossings[k] + 180) * GRID_W / 360));
        const to = Math.min(GRID_W - 1, Math.round((crossings[k + 1] + 180) * GRID_W / 360));
        for (let col = from; col <= to; col++) mask[row * GRID_W + col] = 1;
      }
    }
    for (let i = 0; i < mask.length; i++) if (mask[i]) levels[i] = index + 1;
  });
  return levels;
}

function blur(levels, radius = 7) {
  // A separable box pass softens the isophote steps into a gradient.
  const source = Float32Array.from(levels);
  const wide = new Float32Array(source.length), result = new Float32Array(source.length);
  for (let row = 0; row < GRID_H; row++)
    for (let col = 0; col < GRID_W; col++) {
      let sum = 0;
      for (let d = -radius; d <= radius; d++) sum += source[row * GRID_W + ((col + d + GRID_W) % GRID_W)];
      wide[row * GRID_W + col] = sum / (radius * 2 + 1);
    }
  for (let col = 0; col < GRID_W; col++)
    for (let row = 0; row < GRID_H; row++) {
      let sum = 0, count = 0;
      for (let d = -radius; d <= radius; d++) {
        const r = row + d;
        if (r < 0 || r >= GRID_H) continue;
        sum += wide[r * GRID_W + col];
        count++;
      }
      result[row * GRID_W + col] = sum / count;
    }
  return result;
}

// Downsample the working grid into the shipped luminance map.
function writeTexture(field, peak, width, height) {
  const pixels = new Uint8Array(width * height);
  const sx = GRID_W / width, sy = GRID_H / height;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      let sum = 0, n = 0;
      for (let j = Math.floor(y * sy); j < Math.floor((y + 1) * sy); j++)
        for (let i = Math.floor(x * sx); i < Math.floor((x + 1) * sx); i++) { sum += field[j * GRID_W + i]; n++; }
      // A slight gamma lift keeps the faint outer band from quantising away.
      pixels[y * width + x] = Math.round(255 * Math.pow(Math.min(1, sum / Math.max(1, n) / peak), 0.85));
    }
  writeFileSync(join(out, 'milkyway.png'), greyscalePNG(width, height, pixels));
  return {width, height};
}

function buildMilkyWay(target) {
  const field = blur(rasterise(read('mw.json').features), 5);
  let peak = 0;
  for (const v of field) if (v > peak) peak = v;
  // The shipped map is blurred harder: real diffuse starlight has no contour steps.
  const texture = writeTexture(blur(field, 17), peak, 2048, 1024);
  console.log(`milkyway.png       ${texture.width}x${texture.height} luminance map`);

  const ra = [], dec = [], brightness = [];
  let guard = 0;
  while (ra.length < target && guard < target * 400) {
    guard++;
    const longitude = random() * 360 - 180;
    const latitude = Math.asin(random() * 2 - 1) * 180 / Math.PI; // uniform on the sphere
    const col = Math.min(GRID_W - 1, Math.floor((longitude + 180) * GRID_W / 360));
    const row = Math.min(GRID_H - 1, Math.floor((90 - latitude) * GRID_H / 180));
    const value = field[row * GRID_W + col];
    if (value <= 0.02) continue;
    // The texture already carries the brightness gradient, so sampling stays
    // near-uniform here; these points only add the grain of resolving stars.
    if (random() > Math.pow(value / peak, 0.55)) continue;
    ra.push(((longitude % 360) + 360) % 360);
    dec.push(latitude);
    brightness.push(Math.min(1, Math.pow(value / peak, 1.5) * (0.5 + random() * 0.9)));
  }

  const n = ra.length;
  const buffer = new ArrayBuffer(4 + n * 5);
  new DataView(buffer).setUint32(0, n, true);
  const raOut = new Uint16Array(buffer, 4, n);
  const decOut = new Int16Array(buffer, 4 + n * 2, n);
  const brightOut = new Uint8Array(buffer, 4 + n * 4, n);
  for (let i = 0; i < n; i++) {
    raOut[i] = Math.round(ra[i] * 65536 / 360) & 0xffff;
    decOut[i] = Math.round(dec[i] * 180);
    brightOut[i] = Math.round(brightness[i] * 255);
  }
  writeFileSync(join(out, 'milkyway.bin'), Buffer.from(buffer));
  return {count: n, peak};
}

// ------------------------------------------------------------- deep sky
const DSO_LABELS = {
  'M 31': 'Galaktyka Andromedy', 'M 33': 'Galaktyka Trójkąta', 'M 42': 'Wielka Mgławica Oriona',
  'M 45': 'Plejady', 'LMC': 'Wielki Obłok Magellana', 'SMC': 'Mały Obłok Magellana',
  'M 44': 'Żłóbek', 'ω Cen': 'Omega Centauri', '47 Tuc': '47 Tucanae', 'η Car': 'Mgławica Kila',
  'M 8': 'Mgławica Laguna', 'M 16': 'Mgławica Orzeł', 'M 7': 'Gromada Ptolemeusza',
  'Mel 111': 'Warkocz Bereniki', 'Mel 25': 'Hiady', 'GalCtr': 'Centrum Galaktyki',
  'h Per': 'Podwójna gromada h Per', 'χ Per': 'Podwójna gromada χ Per'
};

function buildDeepSky() {
  const items = read('dsos.bright.json').features.map(f => {
    const p = f.properties;
    const [ra, dec] = f.geometry.coordinates;
    const size = String(p.dim || '0').split('x').map(Number);
    return {
      id: p.desig,
      label: DSO_LABELS[p.desig] || p.desig,
      type: p.type,
      mag: Number(p.mag),
      arcmin: Math.max(...size.filter(Number.isFinite), 1),
      ra: Number((((ra % 360) + 360) % 360).toFixed(3)),
      dec: Number(dec.toFixed(3))
    };
  }).sort((a, b) => a.mag - b.mag);
  writeFileSync(join(out, 'deepsky.json'), JSON.stringify(items));
  return {count: items.length};
}

// -------------------------------------------------------- constellations
function buildConstellations() {
  const features = read('constellations.lines.json').features;
  const points = [];
  for (const f of features)
    for (const line of f.geometry.coordinates) {
      for (let i = 0; i + 1 < line.length; i++) {
        points.push(line[i], line[i + 1]); // explicit segment pairs, no strip state
      }
    }
  const n = points.length;
  const buffer = new ArrayBuffer(4 + n * 4);
  new DataView(buffer).setUint32(0, n, true);
  const ra = new Uint16Array(buffer, 4, n);
  const dec = new Int16Array(buffer, 4 + n * 2, n);
  points.forEach((p, i) => {
    ra[i] = Math.round(((((p[0] % 360) + 360) % 360)) * 65536 / 360) & 0xffff;
    dec[i] = Math.round(p[1] * 180);
  });
  writeFileSync(join(out, 'constellations.bin'), Buffer.from(buffer));
  return {segments: n / 2, figures: features.length};
}

const stars = buildStars();
console.log(`stars.bin          ${stars.count} stars (to mag 8), ${stars.named.length} named landmarks`);
const mw = buildMilkyWay(110000);
console.log(`milkyway.bin       ${mw.count} glow points`);
const dso = buildDeepSky();
console.log(`deepsky.json       ${dso.count} bright objects`);
const con = buildConstellations();
console.log(`constellations.bin ${con.segments} segments across ${con.figures} figures`);
writeFileSync(join(out, 'starnames.json'), JSON.stringify(stars.named));
console.log(`starnames.json     ${stars.named.length} stars brighter than mag 2.1`);
