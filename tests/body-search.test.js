import test from 'node:test';
import assert from 'node:assert/strict';
import {searchBodies,bodyKind} from '../src/body-search.js';
import {initialSystem} from '../src/physics.js';
test('search matches by case- and diacritic-insensitive substring',()=>{
 const bs=initialSystem();
 assert.ok(searchBodies(bs,'ziemia').some(b=>b.name==='Ziemia'));
 assert.ok(searchBodies(bs,'ZIEMIA').some(b=>b.name==='Ziemia'));
 assert.ok(searchBodies(bs,'ksiezyc').some(b=>b.name==='Księżyc'));
 assert.equal(searchBodies(bs,'nieistniejace cialo').length,0);
});
test('empty or blank query returns the full unfiltered list',()=>{
 const bs=initialSystem();
 assert.equal(searchBodies(bs,'').length,bs.length);
 assert.equal(searchBodies(bs,'   ').length,bs.length);
 assert.equal(searchBodies(bs,undefined).length,bs.length);
});
test('body kind labels distinguish stars, planets, moons with host, comets, black holes, fragments and exoplanets',()=>{
 const bs=initialSystem();
 const sun=bs.find(b=>b.key==='sun'),earth=bs.find(b=>b.key==='earth'),moon=bs.find(b=>b.name==='Księżyc');
 assert.equal(bodyKind(sun,bs),'Gwiazda');
 assert.equal(bodyKind(earth,bs),'Planeta');
 assert.equal(bodyKind(moon,bs),'Księżyc · Ziemia');
 assert.equal(bodyKind({key:'comet',name:'Kometa'},bs),'Kometa');
 assert.equal(bodyKind({key:'blackhole',name:'Czarna dziura'},bs),'Czarna dziura');
 assert.equal(bodyKind({key:'neutron-star',name:'Pulsar Kraba'},bs),'Gwiazda neutronowa');
 assert.equal(bodyKind({key:'fragment',name:'Odłamek · Ziemia'},bs),'Odłamek');
 assert.equal(bodyKind({key:'proxima-centauri-b',name:'Proxima Centauri b'},bs),'Egzoplaneta');
});
test('a moon whose host was removed from the array falls back to a plain label',()=>{
 const orphanMoon={key:'moon',parent:9999,name:'Sierota'};
 assert.equal(bodyKind(orphanMoon,[]),'Księżyc');
});
