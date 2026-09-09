import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {brightestFigureStar, createStarIndex, formatAngularSize, formatDeclination, formatRightAscension} from '../src/sky-detail.js';
import {constellationNote, constellationNotes, deepSkyNote, deepSkyNotes} from '../src/sky-descriptions.js';
import {constellationFigures, decodeLines, decodeStars, equatorialFromDirection, skyDirection, splitConstellationFigures, unpackDec, unpackRA} from '../src/sky.js';

const root = new URL('../', import.meta.url).pathname;

test('coordinates are quoted the way a catalogue quotes them', () => {
 // Betelgeuse, 05h 55m +07° 24'.
 assert.equal(formatRightAscension(88.793), '5h 55m');
 assert.equal(formatDeclination(7.407), '+7° 24′');
 assert.equal(formatDeclination(-26.432), '−26° 26′');
 // Rounding must carry rather than print sixty minutes.
 assert.equal(formatRightAscension(14.9999), '1h 00m');
 assert.equal(formatDeclination(-9.99999), '−10° 00′');
 // Wrapping keeps right ascension inside the day.
 assert.equal(formatRightAscension(-1), formatRightAscension(359));
});

test('apparent size switches to degrees once an object is larger than the Moon', () => {
 assert.equal(formatAngularSize(45), '45′');
 assert.equal(formatAngularSize(330), '5.5°');
});

test('the direction transform round-trips back to catalogue coordinates', () => {
 for (const [ra, dec] of [[0, 0], [88.793, 7.407], [266.404, -28.936], [10, -75], [350, 62]]) {
  const [backRa, backDec] = equatorialFromDirection(skyDirection(ra, dec));
  assert.ok(Math.abs(backDec - dec) < 1e-9, `dec ${dec} -> ${backDec}`);
  assert.ok(Math.abs(((backRa - ra + 540) % 360) - 180) < 1e-9, `ra ${ra} -> ${backRa}`);
 }
});

test('the brightest star of a figure is looked up in the catalogue, not asserted', () => {
 const stars = {count: 3,
  ra: Uint16Array.from([101.287, 88.793, 279.234].map(ra => Math.round(ra * 65536 / 360))),
  dec: Int16Array.from([-16.716, 7.407, 38.784].map(dec => Math.round(dec * 180))),
  mag: Int16Array.from([-144, 42, 3])};
 const index = createStarIndex(stars);
 const names = [{name: 'Sirius', ra: 101.287, dec: -16.716, mag: -1.44}, {name: 'Vega', ra: 279.234, dec: 38.784, mag: .03}];
 // A figure drawn through Betelgeuse and Vega must resolve to Vega, the brighter.
 const found = brightestFigureStar([[88.793, 7.407], [279.234, 38.784]], index, names);
 assert.equal(found.name, 'Vega');
 assert.ok(Math.abs(found.magnitude - .03) < .011);
 // Empty sky yields nothing rather than a wrong nearest star.
 assert.equal(brightestFigureStar([[45, 45]], index, names), null);
});

test('every constellation and catalogued object has a note in all four languages', () => {
 const objects = JSON.parse(fs.readFileSync(root + 'public/sky/deepsky.json', 'utf8'));
 for (const [, latin] of constellationFigures) assert.ok(constellationNotes[latin], `missing note for ${latin}`);
 for (const object of objects) assert.ok(deepSkyNotes[object.id], `missing note for ${object.id}`);
 assert.equal(Object.keys(constellationNotes).length, new Set(constellationFigures.map(figure => figure[1])).size);
 for (const [key, row] of [...Object.entries(constellationNotes), ...Object.entries(deepSkyNotes)]) {
  assert.equal(row.length, 4, key);
  for (const text of row) assert.ok(typeof text === 'string' && text.trim().length > 20, `${key}: ${text}`);
 }
});

test('notes answer in the requested language and fall back to English, never to the source', () => {
 assert.notEqual(constellationNote('Orion', 'pl'), constellationNote('Orion', 'en'));
 assert.equal(constellationNote('Orion', 'xx'), constellationNote('Orion', 'en'));
 assert.ok(deepSkyNote('M 42', 'de').length > 20);
 assert.equal(constellationNote('Not a constellation', 'pl'), null);
});

test('figure lookups resolve to the real brightest star of each constellation', () => {
 // Run against the shipped catalogues, not a fixture: this is the check that the
 // panel quotes the sky it actually draws.
 const read = name => {
  const file = fs.readFileSync(`${root}public/sky/${name}`);
  return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
 };
 const stars = decodeStars(read('stars.bin')), lines = decodeLines(read('constellations.bin'));
 const names = JSON.parse(fs.readFileSync(root + 'public/sky/starnames.json', 'utf8'));
 const index = createStarIndex(stars);
 const found = new Map();
 for (const figure of splitConstellationFigures(lines)) {
  const vertices = [];
  for (let i = figure.start * 2; i < (figure.start + figure.count) * 2; i++) vertices.push([unpackRA(lines.ra[i]), unpackDec(lines.dec[i])]);
  found.set(figure.name, brightestFigureStar(vertices, index, names));
 }
 for (const [constellation, star, magnitude] of [
  ['Canis Major', 'Sirius', -1.44], ['Boötes', 'Arcturus', -.05], ['Lyra', 'Vega', .03],
  ['Orion', 'Rigel', .18], ['Crux', 'Acrux', .77], ['Scorpius', 'Antares', 1.06], ['Ursa Minor', 'Polaris', 1.97]
 ]) {
  assert.equal(found.get(constellation)?.name, star, constellation);
  assert.ok(Math.abs(found.get(constellation).magnitude - magnitude) < .02, constellation);
 }
 // Every figure resolves to something, and the faintest of them is still a
 // naked-eye star, which is what a figure is drawn from.
 for (const [constellation, star] of found) {
  assert.ok(star, `${constellation} resolved to no star`);
  assert.ok(star.magnitude < 6, `${constellation}: ${star.magnitude}`);
 }
});
