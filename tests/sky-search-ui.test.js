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
