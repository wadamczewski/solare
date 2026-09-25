import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {applyMoonAppearance,moonAppearance} from '../src/moon-appearance.js';

const compile=material=>{const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <map_fragment>'};material.onBeforeCompile(shader);return shader};
const count=(text,needle)=>text.split(needle).length-1;

test('a moon whose map loads later keeps a shader that still compiles',()=>{
 for(const name of ['Księżyc','Io','Europa','Tytan']){
  assert.ok(moonAppearance[name],name);
  const material=new THREE.MeshStandardMaterial(),body={key:'moon',name};
  applyMoonAppearance(material,body,{});
  const key=material.customProgramCacheKey();
  // requestMoonTexture applies the appearance again once the map arrives.
  applyMoonAppearance(material,body,{});applyMoonAppearance(material,body,{});
  const shader=compile(material);
  assert.equal(count(shader.fragmentShader,'uniform vec3 moonBase;'),1,`${name}: moonBase is declared once`);
  assert.ok(count(shader.fragmentShader,'uniform vec3 moonDark;')<=1,`${name}: moonDark is declared at most once`);
  assert.equal(material.customProgramCacheKey(),key,`${name}: the program key does not grow`);
 }
});
