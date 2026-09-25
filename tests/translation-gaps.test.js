import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {translate} from '../src/i18n.js';
import {moons,planets} from '../src/physics.js';
import {wikipediaSubjectForBody} from '../src/wikipedia-reference.js';

const root=new URL('../',import.meta.url).pathname;

// translation-coverage.test.js finds untranslated Polish by its diacritics;
// names and labels without one (Fizyka, Kalipso, Zdarzenia…) slipped through.
// Every simulated body's English name must match the English Wikipedia
// article it links to, which catches exactly that kind of gap.
test('every planet and moon shows its English name in English',()=>{
 for(const [name,key] of [...planets,...moons.map(([name])=>[name,'moon'])]){
  const article=wikipediaSubjectForBody({name,key}).titles.en.replace(/_\(.*\)$/,'').replaceAll('_',' ');
  assert.equal(translate(name,'en'),article,`${name}`);
 }
});

test('interface labels without Polish diacritics are translated too',()=>{
 for(const text of ['Fizyka','Granica Hilla','Kamera','Obiekt','Zdarzenia','Udostępnij','Noc','Zmierzch','Dzień','Bliski przelot','Pulsar Kraba','Kopiuj','Link do symulacji'])
  for(const language of ['en','es'])assert.notEqual(translate(text,language),text,`${text} (${language})`);
});

test('sharing reads the page address, not main.js\'s own location() raycast helper',()=>{
 // main.js declares `function location(e)`, which shadows window.location in
 // that module: passing the bare name made Share throw and shared links load
 // nothing. Both calls must name window.location explicitly.
 const source=readFileSync(root+'src/main.js','utf8');
 assert.match(source,/function location\(e\)/,'if the helper is renamed, this guard can go');
 assert.doesNotMatch(source,/shareUrl\(location\b/);assert.doesNotMatch(source,/shareTokenFromLocation\(location\b/);
 assert.match(source,/shareUrl\(window\.location/);assert.match(source,/shareTokenFromLocation\(window\.location/);
 assert.doesNotMatch(source,/\bprompt\(['"`]/,'prompt() is refused in embedded viewers; the link is shown in the page instead');
});
