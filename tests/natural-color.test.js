import test from 'node:test';import assert from 'node:assert/strict';
import {MeshStandardMaterial,ShaderLib} from 'three';
import {naturalColorMaterial,appearanceProfiles} from '../src/natural-color.js';
test('visible-light corrections are placed before damage vertex colours',()=>{
 for(const key of Object.keys(appearanceProfiles)){
  const m=new MeshStandardMaterial();naturalColorMaterial(m,key);const shader={uniforms:{},fragmentShader:ShaderLib.standard.fragmentShader};m.onBeforeCompile(shader);
  assert.ok(shader.fragmentShader.includes('sampledDiffuseColor'));assert.ok(!shader.fragmentShader.includes('#include <map_fragment>'));assert.ok(shader.fragmentShader.indexOf('diffuseColor*=sampledDiffuseColor')<shader.fragmentShader.indexOf('#include <color_fragment>'));
  if(appearanceProfiles[key].base)assert.ok(shader.uniforms.naturalBase.value.isColor);
 }
});
test('Earth Mercury Jupiter and Saturn maps are not artistically tinted',()=>{
 for(const key of ['earth','mercury','jupiter','saturn']){const m=new MeshStandardMaterial(),original=m.onBeforeCompile;naturalColorMaterial(m,key);assert.equal(m.onBeforeCompile,original)}
});
