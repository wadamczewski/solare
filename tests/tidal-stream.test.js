import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {tidalSpiralPoint} from '../src/tidal-stream.js';
import {tidalRadiusAU,tidalStreamStrength,tidalStretch} from '../src/tidal-disruption.js';

test('tidal stream coils away from the direct target-to-hole line',()=>{
 const start=new THREE.Vector3(5,0,0),end=new THREE.Vector3(),point=tidalSpiralPoint(start,end,.8,1,0,.5);
 assert.ok(Math.abs(point.y)>1e-4||Math.abs(point.z)>1e-4);
});
test('tidal stream appears before the stronger surface stretch',()=>{
 const target={key:'sun',mass:1,radius:695700},hole={mass:1e6},radius=tidalRadiusAU(target,hole);
 assert.ok(tidalStreamStrength(target,hole,radius*9)>0);assert.equal(tidalStretch(target,hole,radius*9),0);
});
