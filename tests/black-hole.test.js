import test from 'node:test';
import assert from 'node:assert/strict';
import {accretionStateFor,createBlackHoleVisual} from '../src/black-hole.js';
import {blackHoleScreenRadius} from '../src/black-hole-lensing.js';
import {tidalRadiusAU,tidalStretch} from '../src/tidal-disruption.js';

test('accreting supermassive black holes only form jets with gaseous fuel',()=>{
 const hole={mass:1e6,spin:24},sun={mass:1,key:'sun',gas:true},rock={mass:1e-6,key:'earth'};
 assert.equal(accretionStateFor(hole,sun).jets,true);assert.equal(accretionStateFor(hole,rock).jets,false);
});
test('tidal stretch grows toward the disruption radius',()=>{
 const target={key:'earth',mass:3e-6,radius:6371},hole={mass:1e6};const r=tidalRadiusAU(target,hole);
 assert.ok(r>0);assert.ok(tidalStretch(target,hole,r)>tidalStretch(target,hole,r*2));
});
test('black-hole visual has a lensed disk, shadow and photon rings',()=>{
 const visual=createBlackHoleVisual();
 assert.ok(visual.group.children.length>=6);assert.equal(visual.shadow.name,'black-hole-shadow');
 assert.equal(visual.photonRings.children.length,3);assert.equal(visual.lensedArcs.children.length,0);
 assert.ok(blackHoleScreenRadius(1,10,43)>0);assert.ok(blackHoleScreenRadius(1,100,43)<blackHoleScreenRadius(1,10,43));
});
