import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {constellationLabel, decodeLines, constellationFigures, splitConstellationFigures} from '../src/sky.js';

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
 assert.match(source,/LineSegments2/);
 assert.match(source,/\[\[30,\.055\],\[15,\.17\],\[6,\.72\]\]/);
 assert.match(source,/activeConstellation\.glows\.forEach\(glow=>glow\.visible=true\)/);
 assert.match(source,/pickDeepSkyMarker\(event,camera,element\)/);
 assert.match(source,/layers\.deepSkyHighlight\.visible=true/);
});

test('constellation labels follow the selected language and retain IAU Latin names',()=>{
 assert.equal(constellationLabel({name:'Orion'},'pl'),'Orion (Orion)');
 assert.equal(constellationLabel({name:'Boötes'},'de'),'Bärenhüter (Boötes)');
 assert.equal(constellationLabel({name:'Ursa Major'},'es'),'Osa Mayor (Ursa Major)');
 assert.equal(constellationLabel({name:'Canes Venatici'},'en'),'Hunting Dogs (Canes Venatici)');
});
