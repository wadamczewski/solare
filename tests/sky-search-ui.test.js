import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('persistent sky search enables the matching visual layer and recentres every result type',()=>{
 const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 // A search result now opens the same detail sheet a click on the sky opens;
 // those two functions are what recentre the view.
 assert.match(source,/setConstellationsVisible\(true\);showConstellation\(item\.entry\)/);
 assert.match(source,/setDeepSkyMarkersVisible\(true\);showDeepSky\(item\.entry\)/);
 assert.match(source,/function showConstellation\(entry\)\{[\s\S]{0,200}?focusSkyTarget\(entry\.target\)/);
 assert.match(source,/function showDeepSky\(object\)\{[\s\S]{0,200}?focusSkyTarget\(object\.target\)/);
 assert.match(source,/focusBody\(item\.body\.id,\{keepPanel:true\}\);showBody\(\)/);
 assert.match(source,/id="deep-sky-markers"/);
 assert.match(source,/document\.body\.append\(solarControl\);setupBodySearch\(\)/);
});

test('a listed collision scenario rewinds the system to its own epoch before launching',()=>{
 const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 // Repeatability rests on this: the whole system is rebuilt from the scenario's
 // date, so every planet the projectile could meet is back where it was.
 assert.match(source,/if\(scenario\?\.epoch\)resetSystem\(new Date\(scenario\.epoch\)\)/);
 assert.match(source,/function restart\(\)\{resetSystem\(new Date\(\)\);resetView\(\)\}/);
 // And a staged projectile is vetoed out of contact with every bystander.
 assert.match(source,/contactVeto:\(a,b\)=>!scenarioCollisionReady\(a,b,elapsed\)/);
});
