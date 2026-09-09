import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('persistent sky search enables the matching visual layer and recentres every result type',()=>{
 const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(source,/setConstellationsVisible\(true\);focusSkyTarget\(item\.entry\.target\)/);
 assert.match(source,/setDeepSkyMarkersVisible\(true\);focusSkyTarget\(item\.entry\.target\)/);
 assert.match(source,/focusBody\(item\.body\.id,\{keepPanel:true\}\);showBody\(\)/);
 assert.match(source,/id="deep-sky-markers"/);
 assert.match(source,/document\.body\.append\(solarControl\);setupBodySearch\(\)/);
});
