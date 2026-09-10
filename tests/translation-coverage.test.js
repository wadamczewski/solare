import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translate} from '../src/i18n.js';
import {rows} from '../src/locales/messages.js';
import {catalog} from '../src/catalog.js';
import {centralStars} from '../src/central-stars.js';
import {planets, moons} from '../src/physics.js';
import {collisionScenarios} from '../src/collision-scenarios.js';
import {SOLAR_PHASES} from '../src/solar-evolution.js';
import {deepSkyKind} from '../src/sky.js';
import {STAR_SYSTEMS, systemBodies} from '../src/star-systems.js';

// Letters used by Polish and by none of the other three interface languages.
// 'ó' is deliberately absent: Spanish and Hungarian use it, and including it
// reported every correct Spanish translation as untranslated Polish.
const POLISH = /[ąćęłńśźżĄĆĘŁŃŚŹŻ]/;
const LANGUAGES = ['en', 'de', 'es'];
const root = new URL('../', import.meta.url).pathname;

// Any Polish text that reaches the interface must come back translated in all
// three other languages. The substituter matches whole known phrases, so a
// string it does not know passes through untouched and the viewer reads Polish
// under an English interface - which is exactly how the star notes shipped.
function untranslated(label, text) {
 if (typeof text !== 'string' || !POLISH.test(text)) return [];
 return LANGUAGES.filter(language => POLISH.test(translate(text, language)))
  .map(language => `${label} [${language}] ${text.slice(0, 70)}`);
}

test('every rendered string in the data modules is translated into all four languages', () => {
 const gaps = [];
 for (const item of catalog)
  for (const key of ['name', 'group', 'note', 'spectralType']) gaps.push(...untranslated(`catalog.${item.id}.${key}`, item[key]));
 for (const star of centralStars)
  for (const key of ['name', 'galaxy', 'note', 'spectralType']) gaps.push(...untranslated(`central-stars.${star.id}.${key}`, star[key]));
 for (const planet of planets) gaps.push(...untranslated('physics.planet', planet[0]));
 for (const moon of moons) gaps.push(...untranslated('physics.moon', moon[0]));
 for (const item of collisionScenarios) gaps.push(...untranslated(`scenario.${item.id}`, item.name));
 for (const item of SOLAR_PHASES) {
  gaps.push(...untranslated(`phase.${item.id}.name`, item.name));
  gaps.push(...untranslated(`phase.${item.id}.spectralType`, item.spectralType));
 }
 for (const type of ['s', 'sd', 'i', 'oc', 'gc', 'sfr', 'en', 'pn', 'pos', 'unknown'])
  gaps.push(...untranslated(`sky.deepSkyKind.${type}`, deepSkyKind({type})));
 for (const object of JSON.parse(readFileSync(`${root}public/sky/deepsky.json`, 'utf8')))
  gaps.push(...untranslated(`deepsky.${object.id}`, object.label));
 assert.deepEqual(gaps, [], `untranslated:\n${gaps.join('\n')}`);
});

// Three Polish literals in main.js never reach a viewer, and would otherwise
// have to be worked around with a weaker scan.
const NOT_INTERFACE_TEXT = [
 'Nie udało się wczytać mapy nieba:',              // console.warn, never rendered
 'Czas na ekranie nie jest proporcjonalny',        // the pl row of DEATH_CAVEAT, chosen by language
 '/g,'                                             // the ł→l rule inside the search normaliser
];

test('no Polish sentence is hardcoded into the interface without a translation', () => {
 const source = readFileSync(`${root}src/main.js`, 'utf8');
 const gaps = [];
 for (const match of source.matchAll(/(['"`])((?:(?!\1)[^\\]|\\.)*?)\1/g)) {
  const raw = match[2];
  if (!POLISH.test(raw) || raw.length < 12) continue;
  if (NOT_INTERFACE_TEXT.some(allowed => raw.includes(allowed))) continue;
  // Strip interpolations and markup: what is left is what a viewer reads.
  const text = raw.replace(/\$\{[^}]*\}/g, '').replace(/<[^>]*>/g, ' ').trim();
  const line = source.slice(0, match.index).split('\n').length;
  gaps.push(...untranslated(`main.js:${line}`, text));
 }
 assert.deepEqual(gaps, [], `untranslated:\n${gaps.join('\n')}`);
});

// Star-system labels cannot be audited by looking for Polish diacritics:
// 'Towarzysz neutronowy' has none and would slip straight past. Here the rule
// is inverted - every label must have a translation row unless it is one of
// the international designations listed below, or a spectral class, which read
// the same in all four languages.
const SPECTRAL = /^[A-Z][A-Za-z0-9.\- ]{0,7}$/;
const NEUTRAL = new Set(['Algol', 'Kepler-16', 'PSR J0337+1715', 'PSR B1913+16', 'PSR B1620−26',
 'Proxima Centauri', 'Sagittarius A*', 'S2', 'α Centauri A', 'α Centauri B',
 'Kepler-16 A', 'Kepler-16 B', 'Kepler-16 b', 'PSR B1620−26 b', 'Algol Aa1', 'Algol Aa2', 'Algol Ab']);
const needsRow = text => typeof text === 'string' && text.length > 0 && !NEUTRAL.has(text) && !SPECTRAL.test(text);

test('every name and label a star system puts on screen is translated', () => {
 const gaps = [];
 // A row is what is asked for, not a different-looking output: 'Alfa Centauri'
 // is spelled the same in Spanish, and a row that says so is a translation.
 const known = new Set(rows.map(row => row[0]));
 const check = (label, text) => {
  if (!needsRow(text)) return;
  if (!known.has(text)) { gaps.push(`${label} ${text}`); return; }
  const row = rows.find(item => item[0] === text);
  if (row.length !== 4 || row.some(cell => typeof cell !== 'string' || !cell)) gaps.push(`${label} incomplete row ${text}`);
 };
 for (const preset of STAR_SYSTEMS) {
  check(`system.${preset.id}.name`, preset.name);
  for (const item of systemBodies(preset)) {
   check(`system.${preset.id}.body`, item.name);
   check(`system.${preset.id}.spectralType`, item.spectralType);
  }
 }
 assert.deepEqual(gaps, [], `untranslated:\n${gaps.join('\n')}`);
});

test('the star-system audit demands a row for prose and excuses a designation', () => {
 // The guard has to be the other way round from the diacritic scan, so it is
 // worth proving it in both directions.
 assert.ok(needsRow('Towarzysz neutronowy'));
 assert.ok(needsRow('gwiazda neutronowa'));
 assert.ok(!needsRow('G2 V') && !needsRow('M5.5 Ve') && !needsRow('DA') && !needsRow('B0-2 V'));
 assert.ok(!needsRow('PSR B1913+16') && !needsRow('α Centauri A'));
 assert.notEqual(translate('Towarzysz neutronowy', 'en'), 'Towarzysz neutronowy');
 assert.notEqual(translate('Syriusz A', 'es'), 'Syriusz A');
 // A name spelled identically in another language still has to carry a row.
 assert.equal(translate('Alfa Centauri', 'es'), 'Alfa Centauri');
 assert.ok(rows.some(row => row[0] === 'Alfa Centauri'));
});

// The diacritic scan above misses Polish that happens to be spelled in plain
// ASCII: 'Kurs kolizyjny' sat untranslated in the dock for exactly that reason.
// This scan works the other way round. It pulls every string main.js actually
// puts in front of a viewer - element text, translatable attributes, panel
// titles, field labels - and demands that each one either carry a row of its
// own or come back visibly changed by the substituter. A string that comes
// back half-substituted ('Velocity zderzenia · km/s') is caught as well.
const token = text => String(text).toLowerCase().match(/[\p{L}]{3,}/gu) || [];
// Words that appear in a Polish source string and in none of its translations.
const vocabulary = new Set();
for (const row of rows) token(row[0]).forEach(word => vocabulary.add(word));
for (const row of rows) for (const cell of row.slice(1)) token(cell).forEach(word => vocabulary.delete(word));
const readsAsPolish = text => POLISH.test(text) || token(text).some(word => vocabulary.has(word));

const PROSE = /^[\p{L}\p{N}\s·×°☉…,.:;!?'’"„”+%/()‑\-–—↗]+$/u;
function interfaceStrings(source) {
 const found = new Map();
 const add = (text, where, requireSpace) => {
  const clean = String(text).replace(/<[^>]*>/g, ' ').replace(/\$\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g, '')
   .replace(/\s+/g, ' ').trim();
  if (clean.length < 3 || !/\p{L}{2}/u.test(clean)) return;
  // Markup text is extracted between angle brackets, which also catches stray
  // comparisons in the code; a single word from that channel is not prose.
  if (requireSpace && !clean.includes(' ')) return;
  if (!found.has(clean)) found.set(clean, where);
 };
 for (const match of source.matchAll(/>([^<>`$]*[\p{L}][^<>`]*)</gu)) {
  const text = match[1].trim();
  if (PROSE.test(text) && !/[={};]/.test(text)) add(text, 'markup', true);
 }
 for (const match of source.matchAll(/(?:aria-label|placeholder|title|alt)=(["'])([^"'`]+)\1/g)) add(match[2], 'attribute');
 for (const match of source.matchAll(/setAttribute\(\s*'(?:aria-label|placeholder|title|alt)'\s*,\s*'([^']+)'/g)) add(match[1], 'setAttribute');
 for (const match of source.matchAll(/\.textContent\s*=\s*'([^']+)'/g)) add(match[1], 'textContent');
 for (const match of source.matchAll(/shell\(\s*'([^']+)'/g)) add(match[1], 'panel title');
 for (const match of source.matchAll(/\brow\(\s*'([^']+)'/g)) add(match[1], 'field label');
 return found;
}

test('every string the interface puts on screen is covered by a translation row', () => {
 const known = new Set(rows.map(row => row[0]));
 const strings = interfaceStrings(readFileSync(`${root}src/main.js`, 'utf8'));
 // A scan that found nothing would pass silently and guard nothing.
 assert.ok(strings.size > 60, `only ${strings.size} interface strings found`);
 const gaps = [];
 for (const [text, where] of strings) {
  if (!known.has(text) && translate(text, 'en') === text) { gaps.push(`${where}: no row for ${JSON.stringify(text)}`); continue; }
  for (const language of LANGUAGES) {
   const output = translate(text, language);
   if (readsAsPolish(output)) { gaps.push(`${where} [${language}]: ${JSON.stringify(output)}`); break; }
  }
 }
 assert.deepEqual(gaps, [], `untranslated:\n${gaps.join('\n')}`);
});

test('the interface scan finds the strings it is supposed to and judges them correctly', () => {
 const strings = interfaceStrings(`
  button.textContent='Kurs kolizyjny';
  element.setAttribute('aria-label','Ustaw scenariusz zderzenia');
  shell('Symulacja układów',` + '`' + `<p>Dodatkowe opcje</p><input placeholder="Nazwa ciała">` + '`' + `);
  if(a>b&&c<d){}
 `);
 assert.deepEqual([...strings.keys()].sort(), ['Dodatkowe opcje', 'Kurs kolizyjny', 'Nazwa ciała',
  'Symulacja układów', 'Ustaw scenariusz zderzenia'].sort());
 // ASCII-only Polish is the case the diacritic scan cannot see.
 assert.ok(!POLISH.test('Kurs kolizyjny') && readsAsPolish('Kurs kolizyjny'));
 assert.ok(!readsAsPolish('Collision course') && !readsAsPolish('Impact speed · km/s'));
 // And a half-substituted result must read as Polish, because it is.
 assert.ok(readsAsPolish('Velocity zderzenia · km/s'));
});

test('the scan would catch a Polish string nobody translated', () => {
 // A guard that never matches guards nothing.
 assert.equal(untranslated('x', 'Zupełnie nowy opis, którego nikt nie przetłumaczył.').length, 3);
 assert.deepEqual(untranslated('x', 'Plain English text.'), []);
 // A correct Spanish translation carrying an accent is not a Polish leftover.
 assert.deepEqual(untranslated('x', 'Mgławica planetarna'), []);
});
