import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('body details show total velocity in kilometres per second',()=>{
 const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8');
 assert.match(source,/speedMagnitude=Math\.hypot\(\.\.\.velocity\)/);
 assert.match(source,/row\('Prędkość · km\/s',`<output class="value-readout">\$\{formatNumber\(speedMagnitude,3\)\}<\/output>`\)/);
});
