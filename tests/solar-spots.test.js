import test from 'node:test';
import assert from 'node:assert/strict';
import {createSolarSpots,setSolarSpotBrightness} from '../src/solar-spots.js';

test('solar spots are separate irregular umbra and penumbra decals, not a Sun material shader',()=>{
 const spots=createSolarSpots();assert.ok(spots.children.length>=5);
 const meshes=[];spots.traverse(node=>{if(node.isMesh)meshes.push(node)});
 assert.ok(meshes.length>10);assert.ok(meshes.every(mesh=>mesh.position.z>=0));
 assert.ok(meshes.some(mesh=>mesh.material.color.getHexString()==='1e1008'));
});

test('spot contrast becomes stronger when the observer lowers solar brightness',()=>{
 const spots=createSolarSpots();setSolarSpotBrightness(spots,100);const bright=spots.userData.spotMaterials.map(({material})=>material.opacity);
 setSolarSpotBrightness(spots,5);const dim=spots.userData.spotMaterials.map(({material})=>material.opacity);
 assert.ok(dim.every((opacity,index)=>opacity>bright[index]));
});
