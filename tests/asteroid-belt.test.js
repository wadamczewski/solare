import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createAsteroidBelt} from '../src/asteroid-belt.js';

test('asteroid belt uses many small instanced rocky bodies that receive shadows',()=>{
 let randomSeed=0;const random=()=>((randomSeed=(randomSeed*1664525+1013904223)>>>0)/4294967296);
 const belt=createAsteroidBelt({count:12,random});
 assert.equal(belt.mesh.isInstancedMesh,true);
 assert.equal(belt.mesh.receiveShadow,true);
 assert.equal(belt.mesh.castShadow,false);
 assert.equal(belt.data.length,12);
 assert.ok(belt.data.every(asteroid=>asteroid.scale<.03&&asteroid.r>2&&asteroid.r<3.3));
 const version=belt.mesh.instanceMatrix.version;
 belt.update(1,raw=>new THREE.Vector3(...raw),true);
 assert.ok(belt.mesh.instanceMatrix.version>version);
 belt.update(1,raw=>new THREE.Vector3(...raw),true,.25);
 assert.equal(belt.mesh.count,3,'far-map LOD reduces updates without rebuilding the belt');
});
