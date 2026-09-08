import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {decodeLines, constellationFigures, splitConstellationFigures} from '../src/sky.js';

test('constellation line data splits into the named 89 source figures',()=>{
 const source=readFileSync(new URL('../public/sky/constellations.bin',import.meta.url));
 const lines=decodeLines(source.buffer.slice(source.byteOffset,source.byteOffset+source.byteLength));
 const figures=splitConstellationFigures(lines);
 assert.equal(constellationFigures.length,89);
 assert.equal(figures.length,89);
 assert.deepEqual(figures.find(figure=>figure.id==='Ori'),{start:463,count:24,id:'Ori',name:'Orion'});
});

test('sky hover exposes a constellation picker and highlighted line state',()=>{
 const source=readFileSync(new URL('../src/sky.js',import.meta.url),'utf8');
 assert.match(source,/pickConstellation\(event, camera, element\)/);
 assert.match(source,/line\.material\.color\.set\('#d8edff'\)/);
});
