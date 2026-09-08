import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Color,MeshStandardMaterial,Texture,ShaderLib} from 'three';
import {initialSystem} from '../src/physics.js';
import {moonAppearance,moonMapPath,applyMoonAppearance} from '../src/moon-appearance.js';
test('every included moon has its own documented appearance; maps are valid local photographs',()=>{
 const moons=initialSystem().filter(b=>b.key==='moon');assert.equal(moons.length,23);
 for(const moon of moons){const profile=moonAppearance[moon.name];assert.ok(profile,moon.name);assert.ok(new Set(profile.sources).size>=2);for(const url of profile.sources)assert.equal(new URL(url).protocol,'https:');const path=moonMapPath(profile);if(path){const bytes=readFileSync(new URL('../public'+path,import.meta.url));assert.equal(bytes.readUInt16BE(0),0xffd8);assert.ok(bytes.length>10000);if(moon.name!=='Księżyc')assert.notEqual(path,'/textures/moon.jpg');}}
});
test('Titan and poorly mapped moons never inherit lunar craters or metallic material',()=>{
 for(const name of ['Tytan','Miranda','Ariel','Umbriel','Tytania','Oberon','Proteusz','Nereida']){const mat=new MeshStandardMaterial({map:new Texture(),metalness:1});applyMoonAppearance(mat,{key:'moon',name},{});assert.equal(mat.map,null);assert.equal(mat.metalness,0);assert.equal(mat.roughness,1);}
});
test('visible moon palettes preserve measured warm, icy and near-neutral families',()=>{
 assert.equal(moonAppearance['Księżyc'].base,'#756f65');
 assert.match(moonAppearance['Księżyc'].sources[0],/as08-analysis_photography_visual_obs/);
 assert.equal(moonAppearance['Fobos'].base,'#514942');
 assert.equal(moonAppearance['Deimos'].base,'#625247');
 assert.equal(moonAppearance['Enceladus'].base,'#e7edf1');
 for(const name of ['Miranda','Ariel','Umbriel','Tytania','Oberon']){
  const color=new Color(moonAppearance[name].base);const spread=Math.max(color.r,color.g,color.b)-Math.min(color.r,color.g,color.b);
  assert.ok(spread<0.08,`${name} should stay near-neutral when imagery only establishes slight colour variation`);
 }
});
test('mission-map corrections preserve subsequent vertex-colour impact scars',()=>{
 for(const [name,p] of Object.entries(moonAppearance)){if(!p.map)continue;const map=new Texture(),mat=new MeshStandardMaterial();applyMoonAppearance(mat,{key:'moon',name},{[p.id]:map});const shader={uniforms:{},fragmentShader:ShaderLib.standard.fragmentShader};mat.onBeforeCompile(shader);assert.equal(mat.map,map);assert.ok(shader.fragmentShader.indexOf('diffuseColor*=sampledDiffuseColor')<shader.fragmentShader.indexOf('#include <color_fragment>'));assert.ok(shader.uniforms.moonBase);assert.ok(!shader.fragmentShader.includes('undefined'));}
});
