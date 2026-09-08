import test from 'node:test';
import assert from 'node:assert/strict';
import {MeshBasicMaterial,ShaderLib} from 'three';
import {applySolarSurface,setSunspotVisibility} from '../src/solar-surface.js';

test('solar surface uses mapped umbra and penumbra spots',()=>{
 const material=applySolarSurface(new MeshBasicMaterial({map:{}}));
 const shader={uniforms:{},fragmentShader:ShaderLib.basic.fragmentShader};material.onBeforeCompile(shader);
 assert.match(shader.fragmentShader,/solarSpot\(/);
 assert.match(shader.fragmentShader,/sunSpotVisibility/);
 assert.equal(material.customProgramCacheKey(),'solar-surface-spots-1');
});

test('spots become more legible as observer brightness is reduced',()=>{
 const material=applySolarSurface(new MeshBasicMaterial());
 const shader={uniforms:{},fragmentShader:ShaderLib.basic.fragmentShader};material.onBeforeCompile(shader);
 const bright=setSunspotVisibility(material,100),dim=setSunspotVisibility(material,5);
 assert.ok(dim>bright);assert.equal(shader.uniforms.sunSpotVisibility.value,dim);
});
