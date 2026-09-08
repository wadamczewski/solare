import test from 'node:test';
import assert from 'node:assert/strict';
import {MeshBasicMaterial,ShaderLib} from 'three';
import {applySolarSurface,setSunspotVisibility} from '../src/solar-surface.js';

test('solar surface uses procedural umbra and penumbra spots over its emissive photosphere',()=>{
 const material=applySolarSurface(new MeshBasicMaterial());
 const shader={uniforms:{},vertexShader:ShaderLib.basic.vertexShader,fragmentShader:ShaderLib.basic.fragmentShader};material.onBeforeCompile(shader);
 assert.match(shader.fragmentShader,/solarSpot\(/);
 assert.match(shader.fragmentShader,/sunSpotVisibility/);
 assert.match(shader.vertexShader,/sunUv=uv/);
 assert.equal(material.customProgramCacheKey(),'solar-surface-spots-2');
});

test('spots become more legible as observer brightness is reduced',()=>{
 const material=applySolarSurface(new MeshBasicMaterial());
 const shader={uniforms:{},vertexShader:ShaderLib.basic.vertexShader,fragmentShader:ShaderLib.basic.fragmentShader};material.onBeforeCompile(shader);
 const bright=setSunspotVisibility(material,100),dim=setSunspotVisibility(material,5);
 assert.ok(dim>bright);assert.equal(shader.uniforms.sunSpotVisibility.value,dim);
});
