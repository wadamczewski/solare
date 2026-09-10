import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translate} from '../src/i18n.js';
import {catalog} from '../src/catalog.js';
import {centralStars} from '../src/central-stars.js';
import {planets, moons} from '../src/physics.js';
import {collisionScenarios} from '../src/collision-scenarios.js';
import {SOLAR_PHASES} from '../src/solar-evolution.js';
import {deepSkyKind} from '../src/sky.js';

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

test('the scan would catch a Polish string nobody translated', () => {
 // A guard that never matches guards nothing.
 assert.equal(untranslated('x', 'Zupełnie nowy opis, którego nikt nie przetłumaczył.').length, 3);
 assert.deepEqual(untranslated('x', 'Plain English text.'), []);
 // A correct Spanish translation carrying an accent is not a Polish leftover.
 assert.deepEqual(untranslated('x', 'Mgławica planetarna'), []);
});
